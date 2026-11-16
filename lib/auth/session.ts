import 'server-only';
import { cache } from 'react';
import type { SessionUser } from '@/types/contracts';
import { findSessionUserById } from '@/lib/db/queries/auth';
import { auth } from './config';

/**
 * Loads the signed-in user from the database on every request (§2.2).
 * The JWT is never trusted for role, active state, or department: it only names
 * the user and the session version the cookie was issued with.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const tokenUser = session?.user;
  if (!tokenUser?.id) return null;

  const stored = await findSessionUserById(tokenUser.id);
  if (!stored || !stored.isActive) return null;
  if (tokenUser.sessionVersion !== stored.sessionVersion) return null;

  return {
    id: stored.id,
    email: stored.email,
    fullName: stored.fullName,
    role: stored.role,
    departmentId: stored.departmentId,
  };
});
