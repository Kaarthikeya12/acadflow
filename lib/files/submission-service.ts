import 'server-only';
import { createHash } from 'node:crypto';
import type { SessionUser } from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import { can } from '@/lib/authz/matrix';
import { requireAssignmentAccess } from '@/lib/authz/guards';
import { getAssignmentAccessContext } from '@/lib/db/queries/authz';
import {
  getUploadContextForUpdate,
  insertStoredFile,
  upsertSubmissionWithFile,
} from '@/lib/db/queries/files';
import { withTransaction } from '@/lib/db/transaction';
import { detectFileType, enforceUploadPolicy, sanitizeOriginalFilename } from './mime';
import { buildStorageKey, deleteStoredFile, writeStoredFile } from './storage';
import { loadUploadPolicy } from './upload-policy';

export type ReceivedUpload = {
  submissionId: string;
  submittedAt: string;
  isLate: boolean;
  fileId: string;
};

/**
 * Validates and stores a student submission.
 * File write and database write cannot be one atomic transaction, so the
 * compensation is explicit: if the transaction fails, the stored file is removed.
 */
export async function receiveSubmissionUpload(input: {
  viewer: SessionUser;
  assignmentId: string;
  originalFilename: string;
  bytes: Buffer;
  requestId: string;
}): Promise<ReceivedUpload> {
  if (!can(input.viewer.role, 'submit:assignment')) {
    throw new AppError('FORBIDDEN');
  }

  await requireAssignmentAccess(input.assignmentId, input.viewer, 'submit');

  const policy = await loadUploadPolicy();
  if (input.bytes.length > policy.maxBytes) {
    throw new AppError(
      'PAYLOAD_TOO_LARGE',
      `The file exceeds the ${Math.floor(policy.maxBytes / 1024)} KB limit.`,
    );
  }

  const originalFilename = sanitizeOriginalFilename(input.originalFilename);
  const detected = detectFileType(input.bytes, originalFilename);
  const enforced = enforceUploadPolicy(policy, detected, input.bytes.length);
  const sha256 = createHash('sha256').update(input.bytes).digest('hex');

  const assignment = await getAssignmentAccessContext(input.assignmentId);
  if (!assignment) throw new AppError('NOT_FOUND');

  const storageKey = buildStorageKey({
    offeringId: assignment.offeringId,
    assignmentId: input.assignmentId,
    extension: enforced.extension,
  });

  await writeStoredFile(storageKey, input.bytes);

  try {
    return await withTransaction(
      { actorUserId: input.viewer.id, requestId: input.requestId },
      async (client) => {
        const context = await getUploadContextForUpdate(client, {
          assignmentId: input.assignmentId,
          studentUserId: input.viewer.id,
        });

        const fileId = await insertStoredFile(client, {
          storageKey,
          originalFilename,
          mimeType: enforced.mimeType,
          byteSize: input.bytes.length,
          sha256,
          uploadedBy: input.viewer.id,
        });

        const submission = await upsertSubmissionWithFile(client, {
          assignmentId: context.assignmentId,
          enrollmentId: context.enrollmentId,
          offeringId: context.offeringId,
          fileId,
          existingSubmissionId: context.existingSubmissionId,
        });

        return {
          submissionId: submission.submissionId,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
          fileId: submission.fileId,
        };
      },
    );
  } catch (error) {
    await deleteStoredFile(storageKey);
    throw error;
  }
}
