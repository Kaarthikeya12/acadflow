import 'server-only';
import type { PoolClient, QueryResultRow } from 'pg';
import { query } from '@/lib/db/pool';
import { AppError } from '@/lib/db/errors';

export type StoredFileMetadata = {
  fileId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
};

/** Server-only: storageKey must never reach a DTO or a client response. */
export async function getStoredFileForDownload(fileId: string): Promise<StoredFileMetadata | null> {
  const rows = await query<QueryResultRow & {
    id: string;
    storage_key: string;
    original_filename: string;
    mime_type: string;
    byte_size: string;
  }>(
    `SELECT id, storage_key, original_filename, mime_type, byte_size
       FROM stored_file WHERE id = $1`,
    [fileId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    fileId: row.id,
    storageKey: row.storage_key,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
  };
}

export async function insertStoredFile(
  client: PoolClient,
  input: {
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    byteSize: number;
    sha256: string;
    uploadedBy: string;
  },
): Promise<string> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO stored_file
       (storage_key, original_filename, mime_type, byte_size, sha256, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.storageKey,
      input.originalFilename,
      input.mimeType,
      input.byteSize,
      input.sha256,
      input.uploadedBy,
    ],
  );
  const id = rows.rows[0]?.id;
  if (!id) throw new Error('stored_file insert returned no id');
  return id;
}

export type UploadContext = {
  assignmentId: string;
  offeringId: string;
  enrollmentId: string;
  assignmentStatus: 'draft' | 'published' | 'closed';
  allowResubmission: boolean;
  existingSubmissionId: string | null;
};

/** Locks the submission row so two uploads cannot both create a submission. */
export async function getUploadContextForUpdate(
  client: PoolClient,
  input: { assignmentId: string; studentUserId: string },
): Promise<UploadContext> {
  const rows = await client.query<{
    assignment_id: string;
    offering_id: string;
    enrollment_id: string;
    status: 'draft' | 'published' | 'closed';
    allow_resubmission: boolean;
  }>(
    `SELECT a.id AS assignment_id, a.offering_id, e.id AS enrollment_id,
            a.status, a.allow_resubmission
       FROM assignment a
       JOIN enrollment e
         ON e.offering_id = a.offering_id
        AND e.student_user_id = $2
        AND e.status = 'active'
      WHERE a.id = $1
      FOR UPDATE OF a, e`,
    [input.assignmentId, input.studentUserId],
  );
  const row = rows.rows[0];
  if (!row) {
    throw new AppError('NOT_FOUND', 'No active enrollment matches this assignment.');
  }
  if (row.status === 'draft') {
    throw new AppError('NOT_FOUND', 'The assignment is not available.');
  }
  if (row.status === 'closed') {
    throw new AppError('CONFLICT', 'This assignment is closed and no longer accepts submissions.');
  }

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM submission
      WHERE assignment_id = $1 AND enrollment_id = $2
      FOR UPDATE`,
    [input.assignmentId, row.enrollment_id],
  );
  const existingSubmissionId = existing.rows[0]?.id ?? null;

  if (existingSubmissionId && !row.allow_resubmission) {
    throw new AppError(
      'CONFLICT',
      'A submission already exists and resubmission is not enabled for this assignment.',
    );
  }

  return {
    assignmentId: row.assignment_id,
    offeringId: row.offering_id,
    enrollmentId: row.enrollment_id,
    assignmentStatus: row.status,
    allowResubmission: row.allow_resubmission,
    existingSubmissionId,
  };
}

export type UploadSubmissionResult = {
  submissionId: string;
  submittedAt: string;
  isLate: boolean;
  fileId: string;
};

export async function upsertSubmissionWithFile(
  client: PoolClient,
  input: {
    assignmentId: string;
    enrollmentId: string;
    offeringId: string;
    fileId: string;
    existingSubmissionId: string | null;
  },
): Promise<UploadSubmissionResult> {
  if (input.existingSubmissionId) {
    const rows = await client.query<{
      id: string;
      submitted_at: Date;
      is_late: boolean;
    }>(
      `UPDATE submission
          SET file_id = $2,
              submitted_at = now(),
              attempt_no = attempt_no + 1,
              marks_awarded = NULL,
              grade_status = 'pending',
              feedback = NULL,
              graded_by = NULL,
              graded_at = NULL,
              released_at = NULL
        WHERE id = $1
        RETURNING id, submitted_at, is_late`,
      [input.existingSubmissionId, input.fileId],
    );
    const row = rows.rows[0];
    if (!row) throw new AppError('INTERNAL');
    return {
      submissionId: row.id,
      submittedAt: row.submitted_at.toISOString(),
      isLate: row.is_late,
      fileId: input.fileId,
    };
  }

  const rows = await client.query<{ id: string; submitted_at: Date; is_late: boolean }>(
    `INSERT INTO submission (assignment_id, enrollment_id, offering_id, file_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, submitted_at, is_late`,
    [input.assignmentId, input.enrollmentId, input.offeringId, input.fileId],
  );
  const row = rows.rows[0];
  if (!row) throw new AppError('INTERNAL');
  return {
    submissionId: row.id,
    submittedAt: row.submitted_at.toISOString(),
    isLate: row.is_late,
    fileId: input.fileId,
  };
}
