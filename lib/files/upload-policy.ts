import 'server-only';
import { AppError } from '@/lib/db/errors';
import { getAppSetting } from '@/lib/db/queries/policy';
import type { UploadPolicy } from './mime';

type RawPolicy = {
  maxBytes: unknown;
  allowedMimeTypes: unknown;
  allowedExtensions: unknown;
  retentionDays: unknown;
};

async function readPolicyValue(key: string): Promise<unknown> {
  const value = await getAppSetting(key);
  // app_setting stores JSON null for "not decided" (D9).
  return value === null || value === undefined ? null : value;
}

export async function loadUploadPolicy(): Promise<UploadPolicy> {
  const [maxBytes, allowedMimeTypes, allowedExtensions, retentionDays] = await Promise.all([
    readPolicyValue('upload.max_bytes'),
    readPolicyValue('upload.allowed_mime_types'),
    readPolicyValue('upload.allowed_extensions'),
    readPolicyValue('upload.retention_days'),
  ]);

  const raw: RawPolicy = { maxBytes, allowedMimeTypes, allowedExtensions, retentionDays };

  const parsedMaxBytes =
    typeof raw.maxBytes === 'number'
      ? raw.maxBytes
      : typeof raw.maxBytes === 'string'
        ? Number.parseInt(raw.maxBytes, 10)
        : Number.NaN;

  const mimes = Array.isArray(raw.allowedMimeTypes)
    ? raw.allowedMimeTypes.filter((value): value is string => typeof value === 'string')
    : [];
  const extensions = Array.isArray(raw.allowedExtensions)
    ? raw.allowedExtensions.filter((value): value is string => typeof value === 'string')
    : [];

  if (
    !Number.isInteger(parsedMaxBytes) ||
    parsedMaxBytes <= 0 ||
    mimes.length === 0 ||
    extensions.length === 0
  ) {
    throw new AppError(
      'POLICY_NOT_CONFIGURED',
      'Submission uploads are unavailable until the upload policy is configured.',
    );
  }

  return {
    maxBytes: parsedMaxBytes,
    allowedMimeTypes: mimes,
    allowedExtensions: extensions,
    retentionDays: typeof raw.retentionDays === 'number' ? raw.retentionDays : null,
  };
}
