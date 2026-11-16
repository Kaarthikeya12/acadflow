import 'server-only';
import { hash, verify, type Options } from '@node-rs/argon2';
import { AppError } from '@/lib/db/errors';

/** D19: minimum password length 12. */
export const MIN_PASSWORD_LENGTH = 12;

// @node-rs/argon2 declares Algorithm as an ambient const enum, which cannot be
// referenced under isolatedModules. Argon2id is member value 2.
const ARGON2ID = 2 as NonNullable<Options['algorithm']>;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError('VALIDATION_ERROR', 'Password is too short.', {
      fieldErrors: {
        password: [`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`],
      },
    });
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2_OPTIONS);
  } catch {
    // A malformed stored hash must read as "invalid credentials", never as a crash.
    return false;
  }
}
