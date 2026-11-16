/**
 * Shared client/server contract types (docs/IMPLEMENTATION_CONTRACT.md §7).
 * No secrets, hashes, or storage keys ever appear in these DTOs.
 */

export type Uuid = string;
export type DecimalString = string;
export type IsoTimestamp = string;
export type LocalDateTimeString = string;

export type Role = 'admin' | 'faculty' | 'student';

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ActionErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
        requestId: string;
      };
    };

export type ActionErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'POLICY_NOT_CONFIGURED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export type SessionUser = {
  id: Uuid;
  email: string;
  fullName: string;
  role: Role;
  departmentId: Uuid | null;
};

export type PageQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DepartmentDTO = {
  id: Uuid;
  code: string;
  name: string;
  isActive: boolean;
  courseCount: number;
  facultyCount: number;
  studentCount: number;
};

export type CourseDTO = {
  id: Uuid;
  code: string;
  title: string;
  credits: DecimalString;
  departmentId: Uuid;
  departmentName: string;
  description: string | null;
  isActive: boolean;
  offeringCount: number;
};

export type UserDTO = {
  id: Uuid;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  departmentId: Uuid | null;
  departmentName: string | null;
  employeeNo: string | null;
  designation: string | null;
  rollNo: string | null;
  program: string | null;
  batch: string | null;
  admissionYear: number | null;
};

export type TermDTO = {
  id: Uuid;
  academicYear: string;
  termNo: number;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
};

export type OfferingDTO = {
  id: Uuid;
  courseId: Uuid;
  courseCode: string;
  courseTitle: string;
  termId: Uuid;
  academicYear: string;
  termNo: number;
  termLabel: string;
  sectionCode: string;
  facultyUserId: Uuid;
  facultyName: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  enrolledCount: number;
  capacity: number | null;
};

export type EnrollmentDTO = {
  id: Uuid;
  offeringId: Uuid;
  studentUserId: Uuid;
  studentName: string;
  rollNo: string;
  status: 'active' | 'dropped' | 'completed';
  enrolledAt: IsoTimestamp;
};

export type SessionDTO = {
  id: Uuid;
  offeringId: Uuid;
  startsAt: IsoTimestamp;
  endsAt: IsoTimestamp | null;
  topic: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  attendanceMarkedCount: number;
  rosterCount: number;
};

export type AttendanceRowDTO = {
  enrollmentId: Uuid;
  studentUserId: Uuid;
  studentName: string;
  rollNo: string;
  status: 'present' | 'absent' | 'excused' | null;
  note: string | null;
  markedAt: IsoTimestamp | null;
};

export type AssignmentDTO = {
  id: Uuid;
  offeringId: Uuid;
  courseCode: string;
  title: string;
  instructions: string;
  dueAt: IsoTimestamp;
  maxMarks: DecimalString;
  latePenaltyPercent: DecimalString;
  allowResubmission: boolean;
  status: 'draft' | 'published' | 'closed';
  submissionCount: number;
  gradedCount: number;
};

export type SubmissionDTO = {
  id: Uuid;
  assignmentId: Uuid;
  studentUserId: Uuid;
  studentName: string;
  rollNo: string;
  submittedAt: IsoTimestamp;
  isLate: boolean;
  marksAwarded: DecimalString | null;
  gradeStatus: 'pending' | 'graded' | 'released';
  fileId: Uuid | null;
  originalFilename: string | null;
  feedback: string | null;
};

export type GradeChangeDTO = {
  id: string;
  submissionId: Uuid;
  studentName: string;
  courseCode: string;
  assignmentTitle: string;
  oldMarks: DecimalString | null;
  newMarks: DecimalString;
  changeType: 'initial' | 'update';
  changedByName: string;
  changedAt: IsoTimestamp;
  reason: string | null;
};

export type AttendanceSummaryDTO = {
  offeringId: Uuid;
  courseCode: string;
  sessionsCounted: number;
  present: number;
  absent: number;
  excused: number;
  unmarked: number;
  attendancePercent: DecimalString | null;
  deficit: boolean | null;
  policyConfigured: boolean;
};

export type FinalGradeDTO = {
  enrollmentId: Uuid;
  courseCode: string;
  studentName: string;
  attendancePercent: DecimalString | null;
  courseworkPercent: DecimalString | null;
  finalPercent: DecimalString | null;
  letterGrade: string | null;
  status: 'draft' | 'published';
  publishedAt: IsoTimestamp | null;
  policyConfigured: boolean;
};

/* ---------- read-model types used by dashboards and workspaces ---------- */

export type AdminDashboardDTO = {
  counts: {
    students: number;
    faculty: number;
    departments: number;
    courses: number;
    activeOfferings: number;
    activeEnrollments: number;
  };
  currentTerm: TermDTO | null;
  recentOfferings: OfferingDTO[];
  upcomingSessions: number;
  pendingEvaluations: number;
};

export type FacultyDashboardDTO = {
  offerings: OfferingDTO[];
  upcomingSessions: SessionDTO[];
  pendingSubmissions: number;
  recentGraded: number;
};

export type StudentCourseDTO = {
  offeringId: Uuid;
  enrollmentId: Uuid;
  courseCode: string;
  courseTitle: string;
  termLabel: string;
  academicYear: string;
  facultyName: string;
  status: 'active' | 'dropped' | 'completed';
  enrolledAt: IsoTimestamp;
};

export type StudentDashboardDTO = {
  courses: StudentCourseDTO[];
  upcomingSessions: StudentScheduleItemDTO[];
  upcomingAssignments: StudentAssignmentDTO[];
  attendance: AttendanceSummaryDTO[];
  publishedGrades: FinalGradeDTO[];
};

export type StudentScheduleItemDTO = {
  sessionId: Uuid;
  offeringId: Uuid;
  courseCode: string;
  courseTitle: string;
  startsAt: IsoTimestamp;
  endsAt: IsoTimestamp | null;
  topic: string;
  facultyName: string;
};

export type StudentAssignmentDTO = {
  id: Uuid;
  offeringId: Uuid;
  courseCode: string;
  courseTitle: string;
  title: string;
  dueAt: IsoTimestamp;
  maxMarks: DecimalString;
  allowResubmission: boolean;
  status: 'draft' | 'published' | 'closed';
  submissionId: Uuid | null;
  submittedAt: IsoTimestamp | null;
  isLate: boolean | null;
  marksAwarded: DecimalString | null;
  gradeStatus: 'pending' | 'graded' | 'released' | null;
  feedback: string | null;
};

export type SubmissionStatusReportRow = {
  offeringId: Uuid;
  courseCode: string;
  assignmentId: Uuid;
  assignmentTitle: string;
  submitted: number;
  late: number;
  graded: number;
  missing: number;
};

export type EnrollmentReportRow = {
  offeringId: Uuid;
  courseCode: string;
  courseTitle: string;
  termLabel: string;
  academicYear: string;
  active: number;
  dropped: number;
  completed: number;
  total: number;
};

export type GradePolicyDTO = {
  id: Uuid;
  name: string;
  version: number;
  termId: Uuid | null;
  attendanceWeight: DecimalString | null;
  courseworkWeight: DecimalString | null;
  latePenaltyMode: 'none' | 'flat_percent' | 'per_day_percent' | 'per_hour_percent' | null;
  latePenaltyValue: DecimalString | null;
  latePenaltyCapPercent: DecimalString | null;
  missingWorkPolicy: string | null;
  dropLowestCount: number | null;
  roundingDecimals: number | null;
  passPercent: DecimalString | null;
  letterBoundaries: unknown;
  isActive: boolean;
  isComplete: boolean;
};
