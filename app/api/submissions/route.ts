import { NextResponse } from 'next/server';
import { AppError } from '@/lib/db/errors';
import { jsonData, jsonError } from '@/lib/http';
import { newRequestId } from '@/lib/log';
import { assertSameOrigin, contentLengthOf } from '@/lib/http-request';
import { requireUser } from '@/lib/authz/guards';
import { loadUploadPolicy } from '@/lib/files/upload-policy';
import { receiveSubmissionUpload } from '@/lib/files/submission-service';
import { uuidSchema } from '@/lib/validation/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = newRequestId();

  try {
    assertSameOrigin(request);
    const viewer = await requireUser();

    // Fails closed (POLICY_NOT_CONFIGURED) until D9 is configured.
    const policy = await loadUploadPolicy();

    const declaredLength = contentLengthOf(request);
    if (declaredLength !== null && declaredLength > policy.maxBytes + 64 * 1024) {
      throw new AppError(
        'PAYLOAD_TOO_LARGE',
        `The file exceeds the ${Math.floor(policy.maxBytes / 1024)} KB limit.`,
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError('BAD_REQUEST', 'The upload could not be read.');
    }

    const assignmentRaw = form.get('assignmentId');
    const file = form.get('file');
    const extraFiles = form.getAll('file').length;
    if (typeof assignmentRaw !== 'string' || !(file instanceof File) || extraFiles !== 1) {
      throw new AppError('VALIDATION_ERROR', 'Provide one assignmentId and exactly one file.', {
        fieldErrors: { file: ['Attach exactly one file.'] },
      });
    }

    const assignmentId = uuidSchema.parse(assignmentRaw);
    const bytes = Buffer.from(await file.arrayBuffer());

    const result = await receiveSubmissionUpload({
      viewer,
      assignmentId,
      originalFilename: file.name,
      bytes,
      requestId,
    });

    return jsonData(result, 201);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return jsonError(
        new AppError('VALIDATION_ERROR', 'Check the submitted identifiers.'),
        requestId,
      );
    }
    return jsonError(error, requestId);
  }
}
