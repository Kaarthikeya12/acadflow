import 'server-only';
import type {
  AttendanceSummaryDTO,
  FinalGradeDTO,
  SessionUser,
  StudentAssignmentDTO,
  StudentCourseDTO,
  StudentDashboardDTO,
  StudentScheduleItemDTO,
} from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import { query } from '@/lib/db/pool';
import { listStudentOfferings } from '@/lib/db/queries/offerings';
import { listStudentAssignments, listStudentSubmissions } from '@/lib/db/queries/assessment';
import {
  getStudentAttendance as getStudentAttendanceRepo,
  getStudentAttendanceHistory as getStudentAttendanceHistoryRepo,
} from '@/lib/db/queries/teaching';
import { getStudentSchedule } from '@/lib/db/queries/reports';
import { listPublishedFinalGradesForStudent } from '@/lib/db/queries/policy';

function assertStudent(viewer: SessionUser): void {
  if (viewer.role !== 'student') throw new AppError('FORBIDDEN');
}

export type StudentAssignmentView = StudentAssignmentDTO & {
  instructions: string;
  courseTitle: string;
};

export async function getStudentDashboard(viewer: SessionUser): Promise<StudentDashboardDTO> {
  assertStudent(viewer);
  const [courses, schedule, assignments, attendance, grades] = await Promise.all([
    listStudentOfferings(viewer.id),
    getStudentSchedule(viewer.id, 5),
    listStudentAssignments(viewer.id, { includeClosed: false }),
    getStudentAttendanceRepo(viewer.id),
    listPublishedFinalGradesForStudent(viewer.id),
  ]);

  return {
    courses: courses.filter((course) => course.status === 'active'),
    upcomingSessions: schedule,
    upcomingAssignments: (assignments as StudentAssignmentView[])
      .filter((assignment) => assignment.submissionId === null || assignment.marksAwarded === null)
      .slice(0, 5),
    attendance,
    publishedGrades: grades.map(mapFinalGrade),
  };
}

export async function listStudentCourses(viewer: SessionUser): Promise<StudentCourseDTO[]> {
  assertStudent(viewer);
  return listStudentOfferings(viewer.id);
}

export async function listStudentSchedule(
  viewer: SessionUser,
): Promise<StudentScheduleItemDTO[]> {
  assertStudent(viewer);
  return getStudentSchedule(viewer.id, 50);
}

export async function listAssignmentsForStudent(
  viewer: SessionUser,
): Promise<StudentAssignmentView[]> {
  assertStudent(viewer);
  return listStudentAssignments(viewer.id, { includeClosed: true });
}

export async function getStudentAssignment(
  viewer: SessionUser,
  assignmentId: string,
): Promise<StudentAssignmentView> {
  assertStudent(viewer);
  const rows = await listStudentAssignments(viewer.id, {
    assignmentId,
    includeClosed: true,
  });
  const assignment = rows[0];
  if (!assignment) throw new AppError('NOT_FOUND');
  return assignment;
}

export async function getStudentSubmissionForAssignment(
  viewer: SessionUser,
  assignmentId: string,
): Promise<Awaited<ReturnType<typeof listStudentSubmissions>>[number] | null> {
  assertStudent(viewer);
  const rows = await listStudentSubmissions(viewer.id, { assignmentId });
  return rows[0] ?? null;
}

export async function getStudentAttendance(
  viewer: SessionUser,
): Promise<{
  summaries: AttendanceSummaryDTO[];
  history: Awaited<ReturnType<typeof getStudentAttendanceHistoryRepo>>;
}> {
  assertStudent(viewer);
  return {
    summaries: await getStudentAttendanceRepo(viewer.id),
    history: await getStudentAttendanceHistoryRepo(viewer.id),
  };
}

export async function getStudentGrades(viewer: SessionUser): Promise<FinalGradeDTO[]> {
  assertStudent(viewer);
  const rows = await listPublishedFinalGradesForStudent(viewer.id);
  return rows.map(mapFinalGrade);
}

export type StudentProfileView = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  rollNo: string;
  program: string;
  batch: string | null;
  admissionYear: number;
  departmentCode: string;
  departmentName: string;
  lastLoginAt: string | null;
};

/** Read-only profile of the signed-in student; edits remain institution-managed. */
export async function getStudentProfile(viewer: SessionUser): Promise<StudentProfileView> {
  assertStudent(viewer);
  const rows = await query<{
    id: string;
    full_name: string;
    email: string;
    is_active: boolean;
    roll_no: string;
    program: string;
    batch: string | null;
    admission_year: number;
    department_code: string;
    department_name: string;
    last_login_at: Date | string | null;
  }>(
    `SELECT u.id, u.full_name, u.email, u.is_active,
            sp.roll_no, sp.program, sp.batch, sp.admission_year,
            d.code AS department_code, d.name AS department_name,
            u.last_login_at
       FROM app_user u
       JOIN student_profile sp ON sp.user_id = u.id
       JOIN department d       ON d.id = sp.department_id
      WHERE u.id = $1 AND u.role = 'student'`,
    [viewer.id],
  );
  const row = rows[0];
  if (!row) throw new AppError('NOT_FOUND');
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    isActive: row.is_active,
    rollNo: row.roll_no,
    program: row.program,
    batch: row.batch,
    admissionYear: row.admission_year,
    departmentCode: row.department_code,
    departmentName: row.department_name,
    lastLoginAt: row.last_login_at
      ? row.last_login_at instanceof Date
        ? row.last_login_at.toISOString()
        : new Date(row.last_login_at).toISOString()
      : null,
  };
}

function mapFinalGrade(row: {
  enrollmentId: string;
  courseCode: string;
  studentName: string;
  attendancePercent: string | null;
  courseworkPercent: string | null;
  finalPercent: string | null;
  letterGrade: string | null;
  status: 'draft' | 'published';
  publishedAt: string | null;
}): FinalGradeDTO {
  return {
    enrollmentId: row.enrollmentId,
    courseCode: row.courseCode,
    studentName: row.studentName,
    attendancePercent: row.attendancePercent,
    courseworkPercent: row.courseworkPercent,
    finalPercent: row.finalPercent,
    letterGrade: row.letterGrade,
    status: row.status,
    publishedAt: row.publishedAt,
    policyConfigured: true,
  };
}
