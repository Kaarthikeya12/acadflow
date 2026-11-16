import 'server-only';
import { redirect } from 'next/navigation';
import type { Role, SessionUser } from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import { query } from '@/lib/db/pool';
import { getSessionUser } from '@/lib/auth/session';
import {
  getAssignmentAccessContext,
  getFileAccessContext,
  getOfferingAccessContext,
  getSessionAccessContext,
  getSubmissionAccessContext,
  studentHasEnrollment,
  studentMayAccessAssignment,
} from '@/lib/db/queries/authz';
import { can, type Capability } from './matrix';

/* ------------------------------ session guards ----------------------------- */

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError('UNAUTHENTICATED');
  return user;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) throw new AppError('FORBIDDEN');
  return user;
}

export async function requireAnyRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AppError('FORBIDDEN');
  return user;
}

/** Capability check (matrix §8.4) on top of a signed-in session. */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) throw new AppError('FORBIDDEN');
  return user;
}

/**
 * Page-side variants: redirect instead of throwing so a server component renders
 * `/login` or `/unauthorized` rather than an error boundary.
 */
export async function requirePageRole(role: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== role) redirect('/unauthorized');
  return user;
}

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/* --------------------------- ownership guards ----------------------------- */

export async function requireOfferingFaculty(
  offeringId: string,
  user: SessionUser,
): Promise<void> {
  if (user.role !== 'faculty') throw new AppError('FORBIDDEN');
  const offering = await getOfferingAccessContext(offeringId);
  // Unknown and out-of-scope are both NOT_FOUND to avoid ID enumeration.
  if (!offering || offering.facultyUserId !== user.id) {
    throw new AppError('NOT_FOUND');
  }
}

export async function requireOfferingRead(
  offeringId: string,
  user: SessionUser,
): Promise<void> {
  const offering = await getOfferingAccessContext(offeringId);
  if (!offering) throw new AppError('NOT_FOUND');

  if (user.role === 'admin') return;
  if (user.role === 'faculty') {
    if (offering.facultyUserId !== user.id) throw new AppError('NOT_FOUND');
    return;
  }
  if (!(await studentHasEnrollment(offeringId, user.id, { activeOnly: false }))) {
    throw new AppError('NOT_FOUND');
  }
}

export async function requireStudentEnrollment(
  enrollmentId: string,
  user: SessionUser,
): Promise<void> {
  if (user.role !== 'student') throw new AppError('FORBIDDEN');
  const rows = await query<{ id: string }>(
    'SELECT 1 AS id FROM enrollment WHERE id = $1 AND student_user_id = $2',
    [enrollmentId, user.id],
  );
  if (rows.length === 0) throw new AppError('NOT_FOUND');
}

export async function requireAssignmentAccess(
  assignmentId: string,
  user: SessionUser,
  mode: 'read' | 'submit',
): Promise<void> {
  const assignment = await getAssignmentAccessContext(assignmentId);
  if (!assignment) throw new AppError('NOT_FOUND');

  if (mode === 'submit') {
    if (user.role !== 'student') throw new AppError('FORBIDDEN');
    if (!(await studentMayAccessAssignment(assignmentId, user.id))) {
      // Not enrolled, not active, or assignment not published.
      throw new AppError('NOT_FOUND');
    }
    return;
  }

  if (user.role === 'admin') return;
  if (user.role === 'faculty') {
    if (assignment.facultyUserId !== user.id) throw new AppError('NOT_FOUND');
    return;
  }
  if (!(await studentMayAccessAssignment(assignmentId, user.id))) {
    throw new AppError('NOT_FOUND');
  }
}

export async function requireSubmissionAccess(
  submissionId: string,
  user: SessionUser,
  mode: 'read' | 'grade',
): Promise<void> {
  const submission = await getSubmissionAccessContext(submissionId);
  if (!submission) throw new AppError('NOT_FOUND');

  if (mode === 'grade') {
    if (user.role !== 'faculty') throw new AppError('FORBIDDEN');
    if (submission.facultyUserId !== user.id) throw new AppError('NOT_FOUND');
    return;
  }

  if (user.role === 'admin') return;
  if (user.role === 'faculty') {
    if (submission.facultyUserId !== user.id) throw new AppError('NOT_FOUND');
    return;
  }
  if (submission.studentUserId !== user.id) throw new AppError('NOT_FOUND');
}

export async function requireFileAccess(fileId: string, user: SessionUser): Promise<void> {
  const file = await getFileAccessContext(fileId);
  if (!file) throw new AppError('NOT_FOUND');

  if (user.role === 'admin') return;
  if (user.role === 'faculty') {
    if (file.facultyUserId !== user.id) throw new AppError('NOT_FOUND');
    return;
  }
  if (file.studentUserId !== user.id) throw new AppError('NOT_FOUND');
}

export async function requireAssignmentFaculty(
  assignmentId: string,
  user: SessionUser,
): Promise<string> {
  const assignment = await getAssignmentAccessContext(assignmentId);
  if (!assignment) throw new AppError('NOT_FOUND');
  if (user.role !== 'faculty' || assignment.facultyUserId !== user.id) {
    throw new AppError('NOT_FOUND');
  }
  return assignment.offeringId;
}

export async function requireSessionFaculty(
  sessionId: string,
  user: SessionUser,
): Promise<string> {
  const session = await getSessionAccessContext(sessionId);
  if (!session) throw new AppError('NOT_FOUND');
  if (user.role !== 'faculty' || session.facultyUserId !== user.id) {
    throw new AppError('NOT_FOUND');
  }
  return session.offeringId;
}
