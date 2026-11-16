import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '@/lib/db/errors';

function storageRoot(): string {
  const configured = process.env.FILE_STORAGE_PATH?.trim();
  if (!configured) {
    throw new AppError(
      'POLICY_NOT_CONFIGURED',
      'FILE_STORAGE_PATH is not configured. File operations are unavailable.',
    );
  }
  const root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
  const publicRoot = path.resolve(process.cwd(), 'public');
  if (root === publicRoot || root.startsWith(`${publicRoot}${path.sep}`)) {
    throw new AppError('INTERNAL', 'FILE_STORAGE_PATH must be outside public/.');
  }
  return root;
}

/** Resolves a server-generated key and refuses anything that escapes the root. */
export function resolveStoragePath(storageKey: string): string {
  if (storageKey.includes('..') || storageKey.startsWith('/')) {
    throw new AppError('INTERNAL', 'Invalid storage key.');
  }
  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new AppError('INTERNAL', 'Invalid storage key.');
  }
  return resolved;
}

export function buildStorageKey(input: {
  offeringId: string;
  assignmentId: string;
  extension: string;
}): string {
  const safeExtension = input.extension.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `submissions/${input.offeringId}/${input.assignmentId}/${randomUUID()}${
    safeExtension ? `.${safeExtension}` : ''
  }`;
}

/** Writes to a temporary name, then renames so a partial file is never visible. */
export async function writeStoredFile(storageKey: string, bytes: Buffer): Promise<string> {
  const destination = resolveStoragePath(storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.upload-${randomUUID()}`;
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
  return destination;
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  try {
    return await readFile(resolveStoragePath(storageKey));
  } catch {
    throw new AppError('NOT_FOUND', 'The file is no longer available.');
  }
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  try {
    await rm(resolveStoragePath(storageKey), { force: true });
  } catch {
    // Compensation must never mask the original failure.
  }
}
