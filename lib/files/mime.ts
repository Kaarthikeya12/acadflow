import 'server-only';
import { AppError } from '@/lib/db/errors';

export type UploadPolicy = {
  maxBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  retentionDays: number | null;
};

export type DetectedType = { mimeType: string; extension: string };

/** Reject dangerous types regardless of configuration (§10.4). */
const ALWAYS_REJECTED = new Set([
  'application/x-executable',
  'application/x-msdownload',
  'application/x-dosexec',
  'application/x-sharedlib',
  'application/x-sh',
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'application/javascript',
  'text/javascript',
]);

const ZIP_BASED: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
};

const TEXT_BASED: Record<string, string> = {
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
};

function startsWithBytes(buffer: Buffer, signature: readonly number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

export function sanitizeOriginalFilename(raw: string): string {
  const withoutPaths = raw.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = withoutPaths
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^\.+/, '')
    .trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new AppError('VALIDATION_ERROR', 'The file name is not valid.', {
      fieldErrors: { file: ['The file name is not valid.'] },
    });
  }
  return cleaned.slice(0, 255);
}

export function extensionOf(filename: string): string {
  const index = filename.lastIndexOf('.');
  if (index < 0 || index === filename.length - 1) return '';
  return filename.slice(index + 1).toLowerCase();
}

/**
 * Identifies the file from its bytes, not from the browser-supplied Content-Type.
 * Returns null for unrecognised content so the caller fails closed.
 */
export function detectFileType(buffer: Buffer, filename: string): DetectedType | null {
  const extension = extensionOf(filename);

  if (startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (startsWithBytes(buffer, [0x4d, 0x5a])) {
    return { mimeType: 'application/x-msdownload', extension };
  }
  if (startsWithBytes(buffer, [0x7f, 0x45, 0x4c, 0x46])) {
    return { mimeType: 'application/x-executable', extension };
  }
  if (startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    const zipMime = ZIP_BASED[extension];
    return zipMime ? { mimeType: zipMime, extension } : { mimeType: 'application/zip', extension: 'zip' };
  }

  // Text formats: valid UTF-8 without NUL bytes and with a known extension.
  const textMime = TEXT_BASED[extension];
  if (textMime && !buffer.includes(0)) {
    const decoded = buffer.toString('utf8');
    if (!decoded.includes('\uFFFD')) {
      const lowered = decoded.slice(0, 400).toLowerCase();
      if (lowered.includes('<html') || lowered.includes('<!doctype html')) {
        return { mimeType: 'text/html', extension };
      }
      if (lowered.includes('<svg')) {
        return { mimeType: 'image/svg+xml', extension };
      }
      return { mimeType: textMime, extension };
    }
  }

  return null;
}

export function enforceUploadPolicy(
  policy: UploadPolicy,
  detected: DetectedType | null,
  byteSize: number,
): DetectedType {
  if (byteSize === 0) {
    throw new AppError('VALIDATION_ERROR', 'The file is empty.', {
      fieldErrors: { file: ['Choose a non-empty file.'] },
    });
  }
  if (byteSize > policy.maxBytes) {
    throw new AppError(
      'PAYLOAD_TOO_LARGE',
      `The file exceeds the ${Math.floor(policy.maxBytes / 1024)} KB limit.`,
    );
  }
  if (!detected) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'The file type could not be verified.');
  }
  if (ALWAYS_REJECTED.has(detected.mimeType)) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'This file type is not allowed.');
  }

  const normalizedExtensions = new Set(
    policy.allowedExtensions.map((value) =>
      value.startsWith('.') ? value.slice(1).toLowerCase() : value.toLowerCase(),
    ),
  );
  const normalizedMimes = new Set(policy.allowedMimeTypes.map((value) => value.toLowerCase()));

  if (!normalizedExtensions.has(detected.extension)) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'This file extension is not allowed.');
  }
  if (!normalizedMimes.has(detected.mimeType)) {
    throw new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      'This file type is not allowed by the upload policy.',
    );
  }
  return detected;
}
