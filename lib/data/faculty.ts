import 'server-only';
import type {
  AssignmentDTO,
  AttendanceRowDTO,
  EnrollmentDTO,
  FacultyDashboardDTO,
  GradeChangeDTO,
  GradePolicyDTO,
  OfferingDTO,
  PageQuery,
  Paginated,
  SessionDTO,
  SessionUser,
  SubmissionDTO,
} from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import { query } from '@/lib/db/pool';
import {
  requireAssignmentFaculty,
  requireOfferingFaculty,
  requireSessionFaculty,
  requireSubmissionAccess,
} from '@/lib/authz/guards';
import {
  getOfferingById,
  getOfferingRoster,
  listFacultyOfferings,
} from '@/lib/db/queries/offerings';
import {
  getAttendancePercentages,
  getAttendanceRoster,
  getSessionById,
  listSessions,
  listUpcomingSessionsForOffering,
  type AttendancePercentageRow,
} from '@/lib/db/queries/teaching';
import {
  getAssignmentById,
  getSubmissionDetail,
  listAssignments,
  listGradeChanges,
  listSubmissions,
} from '@/lib/db/queries/assessment';
import { getFacultyDashboardData } from '@/lib/db/queries/reports';
import { getActiveGradePolicy, listFinalGradesForOffering } from '@/lib/db/queries/policy';

function assertFaculty(viewer: SessionUser): void {
  if (viewer.role !== 'faculty') throw new AppError('FORBIDDEN');
}

export async function getFacultyDashboard(viewer: SessionUser): Promise<FacultyDashboardDTO> {
  assertFaculty(viewer);
  return getFacultyDashboardData(viewer.id);
}

export type FacultyProfileView = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  employeeNo: string;
  designation: string | null;
  departmentCode: string;
  departmentName: string;
  activeOfferings: number;
  lastLoginAt: string | null;
};

/** Read-only profile of the signed-in faculty member; edits remain institution-managed. */
export async function getFacultyProfile(viewer: SessionUser): Promise<FacultyProfileView> {
  assertFaculty(viewer);
  const rows = await query<{
    id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    employee_no: string;
    designation: string | null;
    department_code: string;
    department_name: string;
    active_offerings: string;
    last_login_at: Date | string | null;
  }>(
    `SELECT u.id, u.full_name, u.email, u.is_active,
            fp.employee_no, fp.designation,
            d.code AS department_code, d.name AS department_name,
            (SELECT count(*) FROM course_offering o
              WHERE o.faculty_user_id = u.id AND o.status = 'active') AS active_offerings,
            u.last_login_at
       FROM app_user u
       JOIN faculty_profile fp ON fp.user_id = u.id
       JOIN department d      ON d.id = fp.department_id
      WHERE u.id = $1 AND u.role = 'faculty'`,
    [viewer.id],
  );
  const row = rows[0];
  if (!row) throw new AppError('NOT_FOUND');
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    isActive: row.is_active,
    employeeNo: row.employee_no,
    designation: row.designation,
    departmentCode: row.department_code,
    departmentName: row.department_name,
    activeOfferings: Number(row.active_offerings),
    lastLoginAt: row.last_login_at
      ? row.last_login_at instanceof Date
        ? row.last_login_at.toISOString()
        : new Date(row.last_login_at).toISOString()
      : null,
  };
}

export async function listMyOfferings(
  viewer: SessionUser,
  query: PageQuery & { status?: OfferingDTO['status'] } = {},
): Promise<Paginated<OfferingDTO>> {
  assertFaculty(viewer);
  return listFacultyOfferings(viewer.id, query);
}

export type FacultyOfferingWorkspace = {
  offering: OfferingDTO;
  nextSessions: SessionDTO[];
  assignments: AssignmentDTO[];
  pendingSubmissions: number;
  rosterCount: number;
};

export async function getOfferingWorkspace(
  viewer: SessionUser,
  offeringId: string,
): Promise<FacultyOfferingWorkspace> {
  assertFaculty(viewer);
  await requireOfferingFaculty(offeringId, viewer);
  const offering = await getOfferingById(offeringId);
  if (!offering) throw new AppError('NOT_FOUND');

  const [nextSessions, assignments, roster] = await Promise.all([
    listUpcomingSessionsForOffering(offeringId),
    listAssignments(offeringId),
    getOfferingRoster(offeringId),
  ]);

  const pendingSubmissions = assignments.reduce(
    (total, assignment) => total + (assignment.submissionCount - assignment.gradedCount),
    0,
  );

  return {
    offering,
    nextSessions: nextSessions.slice(0, 5),
    assignments,
    pendingSubmissions,
    rosterCount: roster.length,
  };
}

export async function listOfferingSessions(
  viewer: SessionUser,
  offeringId: string,
): Promise<SessionDTO[]> {
  assertFaculty(viewer);
  await requireOfferingFaculty(offeringId, viewer);
  return listSessions(offeringId);
}

export async function getSessionForFaculty(
  viewer: SessionUser,
  sessionId: string,
): Promise<{ session: SessionDTO; roster: AttendanceRowDTO[] }> {
  assertFaculty(viewer);
  await requireSessionFaculty(sessionId, viewer);
  const session = await getSessionById(sessionId);
  if (!session) throw new AppError('NOT_FOUND');
  const roster = await getAttendanceRoster(sessionId);
  return { session, roster };
}

export async function getOfferingRosterForFaculty(
  viewer: SessionUser,
  offeringId: string,
): Promise<EnrollmentDTO[]> {
  assertFaculty(viewer);
  await requireOfferingFaculty(offeringId, viewer);
  return getOfferingRoster(offeringId);
}

/** Raw counts plus a percentage only when the attendance policy is configured. */
export async function getOfferingAttendance(
  viewer: SessionUser,
  offeringId: string,
): Promise<AttendancePercentageRow[]> {
  assertFaculty(viewer);
  await requireOfferingFaculty(offeringId, viewer);
  return getAttendancePercentages(offeringId);
}

export async function listOfferingAssignments(
  viewer: SessionUser,
  offeringId: string,
): Promise<AssignmentDTO[]> {
  assertFaculty(viewer);
  await requireOfferingFaculty(offeringId, viewer);
  return listAssignments(offeringId);
}

export async function getAssignmentForFaculty(
  viewer: SessionUser,
  assignmentId: string,
): Promise<AssignmentDTO> {
  assertFaculty(viewer);
  await requireAssignmentFaculty(assignmentId, viewer);
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) throw new AppError('NOT_FOUND');
  return assignment;
}

export async function getAssignmentSubmissions(
  viewer: SessionUser,
  assignmentId: string,
  options: { q?: string; gradeStatus?: SubmissionDTO['gradeStatus'] } = {},
): Promise<SubmissionDTO[]> {
  assertFaculty(viewer);
  await requireAssignmentFaculty(assignmentId, viewer);
  return listSubmissions(assignmentId, options);
}

export async function getSubmissionForFaculty(
  viewer: SessionUser,
  submissionId: string,
) {
  assertFaculty(viewer);
  await requireSubmissionAccess(submissionId, viewer, 'read');
  const detail = await getSubmissionDetail(submissionId);
  if (!detail) throw new AppError('NOT_FOUND');
  return detail;
}

export async function getFacultyGradeChanges(
  viewer: SessionUser,
  query: PageQuery & { offeringId?: string; studentUserId?: string; courseCode?: string } = {},
): Promise<Paginated<GradeChangeDTO>> {
  assertFaculty(viewer);
  return listGradeChanges({ ...query, facultyUserId: viewer.id });
}

export type OfferingFinalGrades = {
  policy: GradePolicyDTO | null;
  policyConfigured: boolean;
  rows: Awaited<ReturnType<typeof listFinalGradesForOffering>>;
};

export async function getOfferingFinalGrades(
  viewer: SessionUser,
  offeringId: string,
): Promise<OfferingFinalGrades> {
  assertFaculty(viewer);
  await requireOfferingFaculty(offeringId, viewer);
  const offering = await getOfferingById(offeringId);
  if (!offering) throw new AppError('NOT_FOUND');
  const policy = await getActiveGradePolicy(offering.termId);
  const rows = await listFinalGradesForOffering(offeringId);
  return { policy, policyConfigured: policy?.isComplete ?? false, rows };
}
