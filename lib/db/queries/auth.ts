import 'server-only';
import type { QueryResultRow } from 'pg';
import type { Role } from '@/types/contracts';
import { query } from '@/lib/db/pool';

export type CredentialUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  passwordHash: string;
  isActive: boolean;
  sessionVersion: number;
};

export type SessionUserRow = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  sessionVersion: number;
  departmentId: string | null;
};

type CredentialRow = QueryResultRow & {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  password_hash: string;
  is_active: boolean;
  session_version: number;
};

export async function findCredentialUserByEmail(email: string): Promise<CredentialUser | null> {
  const rows = await query<CredentialRow>(
    `SELECT u.id, u.email, u.full_name, u.role, u.password_hash,
            u.is_active, u.session_version
       FROM app_user u
      WHERE u.email = lower(btrim($1))`,
    [email],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    sessionVersion: row.session_version,
  };
}

type SessionRow = QueryResultRow & {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  session_version: number;
  department_id: string | null;
};

export async function findSessionUserById(userId: string): Promise<SessionUserRow | null> {
  const rows = await query<SessionRow>(
    `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.session_version,
            coalesce(fp.department_id, sp.department_id) AS department_id
       FROM app_user u
       LEFT JOIN faculty_profile fp ON fp.user_id = u.id
       LEFT JOIN student_profile sp ON sp.user_id = u.id
      WHERE u.id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    sessionVersion: row.session_version,
    departmentId: row.department_id,
  };
}

export async function touchLastLogin(userId: string): Promise<void> {
  await query('UPDATE app_user SET last_login_at = now() WHERE id = $1', [userId]);
}
