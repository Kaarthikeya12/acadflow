import 'server-only';
import type { QueryResultRow } from 'pg';
import type {
  AdminDashboardDTO,
  AttendanceSummaryDTO,
  EnrollmentReportRow,
  FacultyDashboardDTO,
  PageQuery,
  Paginated,
  SessionDTO,
  StudentScheduleItemDTO,
  SubmissionStatusReportRow,
} from '@/types/contracts';
import { query } from '@/lib/db/pool';
import { getCurrentTerm } from './admin';
import { listFacultyOfferings, listOfferings } from './offerings';
import { getAttendancePolicyConfig } from './policy';
import { likePattern, pageWindow, totalPages } from './pagination';

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/* ================================ dashboard ============================== */

export async function getAdminDashboardData(): Promise<AdminDashboardDTO> {
  const countsRows = await query<{
    students: string;
    faculty: string;
    departments: string;
    courses: string;
    active_offerings: string;
    active_enrollments: string;
    upcoming_sessions: string;
    pending_evaluations: string;
  }>(
    `SELECT
       (SELECT count(*) FROM app_user WHERE role = 'student' AND is_active)        AS students,
       (SELECT count(*) FROM app_user WHERE role = 'faculty' AND is_active)        AS faculty,
       (SELECT count(*) FROM department WHERE is_active)                           AS departments,
       (SELECT count(*) FROM course WHERE is_active)                               AS courses,
       (SELECT count(*) FROM course_offering WHERE status = 'active')              AS active_offerings,
       (SELECT count(*) FROM enrollment WHERE status = 'active')                   AS active_enrollments,
       (SELECT count(*) FROM class_session WHERE status = 'scheduled' AND starts_at >= now())
                                                                                   AS upcoming_sessions,
       (SELECT count(*) FROM submission WHERE grade_status = 'pending')            AS pending_evaluations`,
  );
  const row = countsRows[0];
  const recent = await listOfferings({ pageSize: 5, sort: 'createdAt', order: 'desc' });
  return {
    counts: {
      students: Number(row?.students ?? 0),
      faculty: Number(row?.faculty ?? 0),
      departments: Number(row?.departments ?? 0),
      courses: Number(row?.courses ?? 0),
      activeOfferings: Number(row?.active_offerings ?? 0),
      activeEnrollments: Number(row?.active_enrollments ?? 0),
    },
    currentTerm: await getCurrentTerm(),
    recentOfferings: recent.items,
    upcomingSessions: Number(row?.upcoming_sessions ?? 0),
    pendingEvaluations: Number(row?.pending_evaluations ?? 0),
  };
}

type FacultySessionRow = QueryResultRow & {
  id: string;
  offering_id: string;
  starts_at: Date | string;
  ends_at: Date | string | null;
  topic: string;
  status: SessionDTO['status'];
  attendance_marked_count: string;
  roster_count: string;
};

export async function getFacultyDashboardData(
  facultyUserId: string,
): Promise<FacultyDashboardDTO> {
  const offeringPage = await listFacultyOfferings(facultyUserId, { pageSize: 100 });
  const sessionRows = await query<FacultySessionRow>(
    `SELECT cs.id, cs.offering_id, cs.starts_at, cs.ends_at, cs.topic, cs.status,
            (SELECT count(*) FROM attendance a WHERE a.session_id = cs.id) AS attendance_marked_count,
            (SELECT count(*) FROM enrollment e
              WHERE e.offering_id = cs.offering_id AND e.status = 'active') AS roster_count
       FROM class_session cs
       JOIN course_offering o ON o.id = cs.offering_id
      WHERE o.faculty_user_id = $1
        AND cs.status = 'scheduled'
        AND cs.starts_at >= now()
      ORDER BY cs.starts_at ASC
      LIMIT 5`,
    [facultyUserId],
  );

  const counts = await query<{ pending: string; recent_graded: string }>(
    `SELECT
       count(*) FILTER (WHERE s.grade_status = 'pending') AS pending,
       count(*) FILTER (WHERE s.grade_status <> 'pending' AND s.graded_at > now() - interval '7 days')
                                                          AS recent_graded
       FROM submission s
       JOIN course_offering o ON o.id = s.offering_id
      WHERE o.faculty_user_id = $1`,
    [facultyUserId],
  );

  return {
    offerings: offeringPage.items,
    upcomingSessions: sessionRows.map((row) => ({
      id: row.id,
      offeringId: row.offering_id,
      startsAt: iso(row.starts_at),
      endsAt: row.ends_at ? iso(row.ends_at) : null,
      topic: row.topic,
      status: row.status,
      attendanceMarkedCount: Number(row.attendance_marked_count),
      rosterCount: Number(row.roster_count),
    })),
    pendingSubmissions: Number(counts[0]?.pending ?? 0),
    recentGraded: Number(counts[0]?.recent_graded ?? 0),
  };
}

/* ================================= reports ============================== */

type EnrollmentReportDbRow = QueryResultRow & {
  offering_id: string;
  course_code: string;
  course_title: string;
  term_label: string;
  academic_year: string;
  active_count: string;
  dropped_count: string;
  completed_count: string;
  total_count: string;
};

export async function getEnrollmentReport(
  input: PageQuery & { termId?: string; courseId?: string; departmentId?: string },
): Promise<Paginated<EnrollmentReportRow>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const pattern = likePattern(input.q);
  const filterParams = [
    pattern,
    input.termId ?? null,
    input.courseId ?? null,
    input.departmentId ?? null,
  ];
  const where = `
    WHERE ($1::text IS NULL OR c.code ILIKE $1 OR c.title ILIKE $1)
      AND ($2::uuid IS NULL OR o.term_id = $2)
      AND ($3::uuid IS NULL OR o.course_id = $3)
      AND ($4::uuid IS NULL OR c.department_id = $4)
  `;
  const rows = await query<EnrollmentReportDbRow>(
    `SELECT o.id AS offering_id, c.code AS course_code, c.title AS course_title,
            t.label AS term_label, t.academic_year,
            count(e.id) FILTER (WHERE e.status = 'active')    AS active_count,
            count(e.id) FILTER (WHERE e.status = 'dropped')   AS dropped_count,
            count(e.id) FILTER (WHERE e.status = 'completed') AS completed_count,
            count(e.id)                                        AS total_count
       FROM course_offering o
       JOIN course c        ON c.id = o.course_id
       JOIN academic_term t ON t.id = o.term_id
       LEFT JOIN enrollment e ON e.offering_id = o.id
     ${where}
     GROUP BY o.id, c.code, c.title, t.label, t.academic_year, t.starts_on
     ORDER BY t.starts_on DESC, c.code
     LIMIT $5 OFFSET $6`,
    [...filterParams, limit, offset],
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total
       FROM course_offering o
       JOIN course c ON c.id = o.course_id
     ${where}`,
    filterParams,
  );
  const total = Number(countRows[0]?.total ?? 0);
  return {
    items: rows.map((row) => ({
      offeringId: row.offering_id,
      courseCode: row.course_code,
      courseTitle: row.course_title,
      termLabel: row.term_label,
      academicYear: row.academic_year,
      active: Number(row.active_count),
      dropped: Number(row.dropped_count),
      completed: Number(row.completed_count),
      total: Number(row.total_count),
    })),
    page,
    pageSize,
    total,
    totalPages: totalPages(total, pageSize),
  };
}

type SubmissionReportDbRow = QueryResultRow & {
  offering_id: string;
  course_code: string;
  assignment_id: string;
  assignment_title: string;
  submitted: string;
  late: string;
  graded: string;
  missing: string;
};

export async function getSubmissionStatusReport(
  input: PageQuery & { offeringId?: string; facultyUserId?: string },
): Promise<Paginated<SubmissionStatusReportRow>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const filterParams = [input.offeringId ?? null, input.facultyUserId ?? null];
  const where = `
    WHERE ($1::uuid IS NULL OR a.offering_id = $1)
      AND ($2::uuid IS NULL OR o.faculty_user_id = $2)
  `;
  const rows = await query<SubmissionReportDbRow>(
    `SELECT a.offering_id, c.code AS course_code, a.id AS assignment_id,
            a.title AS assignment_title,
            count(s.id) AS submitted,
            count(s.id) FILTER (WHERE s.is_late) AS late,
            count(s.id) FILTER (WHERE s.grade_status <> 'pending') AS graded,
            greatest(
              (SELECT count(*) FROM enrollment e
                WHERE e.offering_id = a.offering_id AND e.status = 'active')
              - count(s.id), 0) AS missing
       FROM assignment a
       JOIN course_offering o ON o.id = a.offering_id
       JOIN course c          ON c.id = o.course_id
       LEFT JOIN submission s ON s.assignment_id = a.id
     ${where}
     GROUP BY a.id, a.offering_id, c.code, a.title, a.due_at
     ORDER BY a.due_at DESC
     LIMIT $3 OFFSET $4`,
    [...filterParams, limit, offset],
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total
       FROM assignment a
       JOIN course_offering o ON o.id = a.offering_id
     ${where}`,
    filterParams,
  );
  const total = Number(countRows[0]?.total ?? 0);
  return {
    items: rows.map((row) => ({
      offeringId: row.offering_id,
      courseCode: row.course_code,
      assignmentId: row.assignment_id,
      assignmentTitle: row.assignment_title,
      submitted: Number(row.submitted),
      late: Number(row.late),
      graded: Number(row.graded),
      missing: Number(row.missing),
    })),
    page,
    pageSize,
    total,
    totalPages: totalPages(total, pageSize),
  };
}

type DeficitRow = QueryResultRow & {
  offering_id: string;
  course_code: string;
  enrollment_id: string;
  student_user_id: string;
  student_name: string;
  roll_no: string;
  sessions_total: string;
  present_count: string;
  absent_count: string;
  excused_count: string;
  unmarked_count: string;
  attendance_percent: string | null;
  policy_configured: boolean;
  deficit: boolean | null;
};

export type AttendanceDeficitReportRow = AttendanceSummaryDTO & {
  enrollmentId: string;
  studentUserId: string;
  studentName: string;
  rollNo: string;
};

/**
 * Attendance-deficit report. The threshold is an explicit input (D13); when it
 * is absent or the attendance policy is unconfigured, `deficit` is null and
 * `attendancePercent` is null. No default threshold exists.
 */
export async function getAttendanceDeficitReport(
  input: { offeringId?: string; thresholdPercent?: string | null; q?: string },
): Promise<AttendanceDeficitReportRow[]> {
  const policy = await getAttendancePolicyConfig();
  const rows = await query<DeficitRow>(
    `SELECT vc.offering_id, c.code AS course_code, vc.enrollment_id,
            vc.student_user_id, u.full_name AS student_name, sp.roll_no,
            vc.sessions_total_non_cancelled AS sessions_total,
            vc.present_count, vc.absent_count, vc.excused_count, vc.unmarked_count,
            p.attendance_percent, p.policy_configured,
            CASE WHEN p.attendance_percent IS NOT NULL AND $7::numeric IS NOT NULL
                 THEN (p.attendance_percent < $7::numeric)
                 ELSE NULL END AS deficit
       FROM v_attendance_counts vc
       JOIN enrollment e       ON e.id = vc.enrollment_id AND e.status = 'active'
       JOIN course_offering o  ON o.id = vc.offering_id
       JOIN course c           ON c.id = o.course_id
       JOIN student_profile sp ON sp.user_id = vc.student_user_id
       JOIN app_user u         ON u.id = vc.student_user_id
       CROSS JOIN LATERAL fn_attendance_percent(
         vc.enrollment_id, $2, $3, $4, $5
       ) p
      WHERE ($1::uuid IS NULL OR vc.offering_id = $1)
        AND ($6::text IS NULL OR u.full_name ILIKE $6 OR sp.roll_no ILIKE $6)
      ORDER BY c.code, u.full_name`,
    [
      input.offeringId ?? null,
      policy.excused,
      policy.unmarked,
      policy.denominator,
      policy.roundingDecimals,
      likePattern(input.q),
      input.thresholdPercent ?? null,
    ],
  );

  return rows.map((row) => ({
    offeringId: row.offering_id,
    courseCode: row.course_code,
    enrollmentId: row.enrollment_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    rollNo: row.roll_no,
    sessionsCounted: Number(row.sessions_total),
    present: Number(row.present_count),
    absent: Number(row.absent_count),
    excused: Number(row.excused_count),
    unmarked: Number(row.unmarked_count),
    attendancePercent: row.attendance_percent,
    deficit: row.deficit,
    policyConfigured: row.policy_configured,
  }));
}

/* ============================ student schedule =========================== */

export async function getStudentSchedule(
  studentUserId: string,
  limit = 20,
): Promise<StudentScheduleItemDTO[]> {
  const rows = await query<{
    sessionId: string;
    offeringId: string;
    courseCode: string;
    courseTitle: string;
    startsAt: Date | string;
    endsAt: Date | string | null;
    topic: string;
    facultyName: string;
  }>(
    `SELECT session_id       AS "sessionId",
            offering_id      AS "offeringId",
            course_code      AS "courseCode",
            course_title     AS "courseTitle",
            starts_at        AS "startsAt",
            ends_at          AS "endsAt",
            topic,
            faculty_name     AS "facultyName"
       FROM v_student_schedule
      WHERE student_user_id = $1
      ORDER BY starts_at
      LIMIT $2`,
    [studentUserId, limit],
  );
  return rows.map((row) => ({
    sessionId: row.sessionId,
    offeringId: row.offeringId,
    courseCode: row.courseCode,
    courseTitle: row.courseTitle,
    startsAt: iso(row.startsAt),
    endsAt: row.endsAt ? iso(row.endsAt) : null,
    topic: row.topic,
    facultyName: row.facultyName,
  }));
}
