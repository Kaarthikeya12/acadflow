import 'server-only';
import type {
  AdminDashboardDTO,
  CourseDTO,
  DepartmentDTO,
  EnrollmentDTO,
  GradeChangeDTO,
  GradePolicyDTO,
  OfferingDTO,
  PageQuery,
  Paginated,
  Role,
  SessionUser,
  TermDTO,
  UserDTO,
} from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import {
  getCourseById as getCourseByIdRepo,
  getCurrentTerm as getCurrentTermRepo,
  getDepartmentById as getDepartmentByIdRepo,
  getUserById as getUserByIdRepo,
  listActiveDepartments,
  listCourseOptions,
  listCourses as listCoursesRepo,
  listDepartments as listDepartmentsRepo,
  listTerms,
  listUsers as listUsersRepo,
} from '@/lib/db/queries/admin';
import {
  getOfferingById as getOfferingByIdRepo,
  getOfferingRoster,
  listEnrollments as listEnrollmentsRepo,
  listOfferings as listOfferingsRepo,
} from '@/lib/db/queries/offerings';
import { getAdminDashboardData } from '@/lib/db/queries/reports';
import {
  getAttendanceDeficitReport,
  getEnrollmentReport,
  getSubmissionStatusReport,
} from '@/lib/db/queries/reports';
import { getActiveGradePolicy, listFinalGradesForOffering } from '@/lib/db/queries/policy';
import { listGradeChanges } from '@/lib/db/queries/assessment';

function assertAdmin(viewer: SessionUser): void {
  if (viewer.role !== 'admin') throw new AppError('FORBIDDEN');
}

export async function getAdminDashboard(viewer: SessionUser): Promise<AdminDashboardDTO> {
  assertAdmin(viewer);
  return getAdminDashboardData();
}

export async function listDepartments(
  viewer: SessionUser,
  query: PageQuery = {},
): Promise<Paginated<DepartmentDTO>> {
  assertAdmin(viewer);
  return listDepartmentsRepo(query);
}

export async function getDepartment(
  viewer: SessionUser,
  id: string,
): Promise<DepartmentDTO | null> {
  assertAdmin(viewer);
  return getDepartmentByIdRepo(id);
}

export async function listCourses(
  viewer: SessionUser,
  query: PageQuery & { departmentId?: string; isActive?: boolean } = {},
): Promise<Paginated<CourseDTO>> {
  assertAdmin(viewer);
  return listCoursesRepo(query);
}

export async function getCourse(
  viewer: SessionUser,
  id: string,
): Promise<{ course: CourseDTO; offerings: OfferingDTO[] } | null> {
  assertAdmin(viewer);
  const course = await getCourseByIdRepo(id);
  if (!course) return null;
  const offerings = await listOfferingsRepo({ courseId: id, pageSize: 100 });
  return { course, offerings: offerings.items };
}

export async function listUsers(
  viewer: SessionUser,
  query: PageQuery & { role?: Role; departmentId?: string; isActive?: boolean } = {},
): Promise<Paginated<UserDTO>> {
  assertAdmin(viewer);
  return listUsersRepo(query);
}

export async function getUser(viewer: SessionUser, id: string): Promise<UserDTO | null> {
  assertAdmin(viewer);
  return getUserByIdRepo(id);
}

export async function listAdminTerms(viewer: SessionUser): Promise<TermDTO[]> {
  assertAdmin(viewer);
  return listTerms();
}

export async function getAdminCurrentTerm(viewer: SessionUser): Promise<TermDTO | null> {
  assertAdmin(viewer);
  return getCurrentTermRepo();
}

export async function listAdminOfferings(
  viewer: SessionUser,
  query: PageQuery & {
    courseId?: string;
    termId?: string;
    facultyUserId?: string;
    status?: OfferingDTO['status'];
    departmentId?: string;
  } = {},
): Promise<Paginated<OfferingDTO>> {
  assertAdmin(viewer);
  return listOfferingsRepo(query);
}

export async function getAdminOffering(
  viewer: SessionUser,
  id: string,
): Promise<OfferingDTO | null> {
  assertAdmin(viewer);
  return getOfferingByIdRepo(id);
}

export async function listAdminEnrollments(
  viewer: SessionUser,
  query: PageQuery & {
    offeringId?: string;
    studentUserId?: string;
    status?: EnrollmentDTO['status'];
  } = {},
): Promise<Paginated<EnrollmentDTO>> {
  assertAdmin(viewer);
  return listEnrollmentsRepo(query);
}

export async function getAdminOfferingRoster(
  viewer: SessionUser,
  offeringId: string,
): Promise<EnrollmentDTO[]> {
  assertAdmin(viewer);
  return getOfferingRoster(offeringId, { includeInactive: true });
}

export async function listDepartmentOptions(
  viewer: SessionUser,
): Promise<{ id: string; code: string; name: string }[]> {
  assertAdmin(viewer);
  return listActiveDepartments();
}

export async function listCourseOptionsForAdmin(
  viewer: SessionUser,
): Promise<{ id: string; code: string; title: string; departmentId: string }[]> {
  assertAdmin(viewer);
  return listCourseOptions();
}

export async function listFacultyOptions(
  viewer: SessionUser,
): Promise<{ id: string; fullName: string; email: string }[]> {
  assertAdmin(viewer);
  const users = await listUsersRepo({ role: 'faculty', isActive: true, pageSize: 100 });
  return users.items.map((user) => ({ id: user.id, fullName: user.fullName, email: user.email }));
}

export async function listStudentOptions(
  viewer: SessionUser,
): Promise<{ id: string; fullName: string; email: string; rollNo: string | null }[]> {
  assertAdmin(viewer);
  const users = await listUsersRepo({ role: 'student', isActive: true, pageSize: 100 });
  return users.items.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    rollNo: user.rollNo,
  }));
}

export async function getAdminGradeChanges(
  viewer: SessionUser,
  query: PageQuery & { offeringId?: string; studentUserId?: string; courseCode?: string } = {},
): Promise<Paginated<GradeChangeDTO>> {
  assertAdmin(viewer);
  return listGradeChanges(query);
}

export async function getAdminAttendanceDeficitReport(
  viewer: SessionUser,
  query: { offeringId?: string; thresholdPercent?: string | null; q?: string },
) {
  assertAdmin(viewer);
  return getAttendanceDeficitReport(query);
}

export async function getAdminEnrollmentReport(
  viewer: SessionUser,
  query: PageQuery & { termId?: string; courseId?: string; departmentId?: string } = {},
) {
  assertAdmin(viewer);
  return getEnrollmentReport(query);
}

export async function getAdminSubmissionStatusReport(
  viewer: SessionUser,
  query: PageQuery & { offeringId?: string } = {},
) {
  assertAdmin(viewer);
  return getSubmissionStatusReport(query);
}

export type FinalGradeReport = {
  policy: GradePolicyDTO | null;
  policyConfigured: boolean;
  rows: Array<{
    enrollmentId: string;
    studentUserId: string;
    studentName: string;
    courseCode: string;
    attendancePercent: string | null;
    courseworkPercent: string | null;
    finalPercent: string | null;
    letterGrade: string | null;
    status: 'draft' | 'published';
    publishedAt: string | null;
    policyConfigured: boolean;
  }>;
};

export async function getAdminFinalGradeReport(
  viewer: SessionUser,
  offeringId: string,
): Promise<FinalGradeReport> {
  assertAdmin(viewer);
  const offering = await getOfferingByIdRepo(offeringId);
  if (!offering) throw new AppError('NOT_FOUND');
  const policy = await getActiveGradePolicy(offering.termId);
  const rows = await listFinalGradesForOffering(offeringId);
  return {
    policy,
    policyConfigured: policy?.isComplete ?? false,
    rows,
  };
}
