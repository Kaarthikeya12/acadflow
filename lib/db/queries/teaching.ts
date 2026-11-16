import 'server-only';
import type { PoolClient, QueryResultRow } from 'pg';
import type {
  AttendanceRowDTO,
  AttendanceSummaryDTO,
  SessionDTO,
} from '@/types/contracts';
import { query } from '@/lib/db/pool';
import { AppError } from '@/lib/db/errors';
import { getAttendancePolicyConfig } from './policy';

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/* ================================ sessions =============================== */

type SessionRow = QueryResultRow & {
  id: string;
  offering_id: string;
  starts_at: Date | string;
  ends_at: Date | string | null;
  topic: string;
  status: SessionDTO['status'];
  attendance_marked_count: string;
  roster_count: string;
};

function mapSession(row: SessionRow): SessionDTO {
  return {
    id: row.id,
    offeringId: row.offering_id,
    startsAt: iso(row.starts_at),
    endsAt: row.ends_at ? iso(row.ends_at) : null,
    topic: row.topic,
    status: row.status,
    attendanceMarkedCount: Number(row.attendance_marked_count),
    rosterCount: Number(row.roster_count),
  };
}

const SESSION_SELECT = `
  SELECT cs.id, cs.offering_id, cs.starts_at, cs.ends_at, cs.topic, cs.status,
         (SELECT count(*) FROM attendance a WHERE a.session_id = cs.id) AS attendance_marked_count,
         (SELECT count(*) FROM enrollment e
           WHERE e.offering_id = cs.offering_id AND e.status = 'active') AS roster_count
    FROM class_session cs
`;

export async function listSessions(offeringId: string): Promise<SessionDTO[]> {
  const rows = await query<SessionRow>(
    `${SESSION_SELECT} WHERE cs.offering_id = $1 ORDER BY cs.starts_at DESC`,
    [offeringId],
  );
  return rows.map(mapSession);
}

export async function listUpcomingSessionsForOffering(
  offeringId: string,
): Promise<SessionDTO[]> {
  const rows = await query<SessionRow>(
    `${SESSION_SELECT}
      WHERE cs.offering_id = $1 AND cs.status = 'scheduled' AND cs.starts_at >= now()
      ORDER BY cs.starts_at ASC`,
    [offeringId],
  );
  return rows.map(mapSession);
}

export async function getSessionById(sessionId: string): Promise<SessionDTO | null> {
  const rows = await query<SessionRow>(`${SESSION_SELECT} WHERE cs.id = $1`, [sessionId]);
  return rows[0] ? mapSession(rows[0]) : null;
}

export async function insertSession(
  client: PoolClient,
  input: {
    offeringId: string;
    startsAt: Date;
    endsAt: Date | null;
    topic: string;
    createdBy: string;
  },
): Promise<string> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO class_session (offering_id, starts_at, ends_at, topic, created_by)
     VALUES ($1, $2, $3, btrim($4), $5)
     RETURNING id`,
    [input.offeringId, input.startsAt, input.endsAt, input.topic, input.createdBy],
  );
  const id = rows.rows[0]?.id;
  if (!id) throw new Error('Session insert returned no id');
  return id;
}

export async function updateSession(
  client: PoolClient,
  input: { sessionId: string; startsAt: Date; endsAt: Date | null; topic: string },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE class_session
        SET starts_at = $2, ends_at = $3, topic = btrim($4)
      WHERE id = $1`,
    [input.sessionId, input.startsAt, input.endsAt, input.topic],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function cancelSession(
  client: PoolClient,
  sessionId: string,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE class_session SET status = 'cancelled' WHERE id = $1`,
    [sessionId],
  );
  return (result.rowCount ?? 0) > 0;
}

/* =============================== attendance ============================== */

type RosterRow = QueryResultRow & {
  enrollment_id: string;
  student_user_id: string;
  student_name: string;
  roll_no: string;
  status: AttendanceRowDTO['status'];
  note: string | null;
  marked_at: Date | string | null;
};

export async function getAttendanceRoster(sessionId: string): Promise<AttendanceRowDTO[]> {
  const rows = await query<RosterRow>(
    `SELECT e.id AS enrollment_id, e.student_user_id,
            u.full_name AS student_name, sp.roll_no,
            a.status, a.note,
            a.marked_at
       FROM class_session cs
       JOIN enrollment e       ON e.offering_id = cs.offering_id AND e.status = 'active'
       JOIN student_profile sp ON sp.user_id = e.student_user_id
       JOIN app_user u         ON u.id = e.student_user_id
       LEFT JOIN attendance a  ON a.session_id = cs.id AND a.enrollment_id = e.id
      WHERE cs.id = $1
      ORDER BY u.full_name`,
    [sessionId],
  );
  return rows.map((row) => ({
    enrollmentId: row.enrollment_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    rollNo: row.roll_no,
    status: row.status,
    note: row.note,
    markedAt: row.marked_at ? iso(row.marked_at) : null,
  }));
}

export async function saveAttendanceTx(
  client: PoolClient,
  input: {
    sessionId: string;
    offeringId: string;
    markedBy: string;
    entries: Array<{ enrollmentId: string; status: AttendanceRowDTO['status']; note?: string | null }>;
  },
): Promise<number> {
  // One round trip verifies every enrollment belongs to the session's offering.
  const enrollmentIds = input.entries.map((entry) => entry.enrollmentId);
  const validRows = await client.query<{ id: string }>(
    `SELECT e.id
       FROM enrollment e
      WHERE e.offering_id = $1
        AND e.status = 'active'
        AND e.id = ANY($2::uuid[])`,
    [input.offeringId, enrollmentIds],
  );
  if (validRows.rows.length !== new Set(enrollmentIds).size) {
    throw new AppError(
      'VALIDATION_ERROR',
      'One or more students are not actively enrolled in this offering.',
      { fieldErrors: { entries: ['Enrollment does not belong to this offering.'] } },
    );
  }

  let saved = 0;
  for (const entry of input.entries) {
    await client.query(
      `INSERT INTO attendance
         (session_id, enrollment_id, offering_id, status, note, marked_by, marked_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (session_id, enrollment_id) DO UPDATE
         SET status = EXCLUDED.status,
             note = EXCLUDED.note,
             marked_by = EXCLUDED.marked_by,
             marked_at = now()`,
      [
        input.sessionId,
        entry.enrollmentId,
        input.offeringId,
        entry.status,
        entry.note ?? null,
        input.markedBy,
      ],
    );
    saved += 1;
  }
  return saved;
}

type CountRow = QueryResultRow & {
  offering_id: string;
  course_code: string;
  enrollment_id: string;
  student_user_id: string;
  student_name: string;
  roll_no: string;
  sessions_total_non_cancelled: string;
  sessions_with_attendance: string;
  present_count: string;
  absent_count: string;
  excused_count: string;
  unmarked_count: string;
  attendance_percent: string | null;
  policy_configured: boolean;
};

const COUNTS_SELECT = `
  SELECT vc.offering_id, c.code AS course_code, vc.enrollment_id,
         vc.student_user_id, u.full_name AS student_name, sp.roll_no,
         vc.sessions_total_non_cancelled,
         vc.sessions_with_attendance,
         vc.present_count, vc.absent_count, vc.excused_count, vc.unmarked_count,
         p.attendance_percent, p.policy_configured
    FROM v_attendance_counts vc
    JOIN enrollment e       ON e.id = vc.enrollment_id
    JOIN course_offering o  ON o.id = vc.offering_id
    JOIN course c           ON c.id = o.course_id
    JOIN student_profile sp ON sp.user_id = vc.student_user_id
    JOIN app_user u         ON u.id = vc.student_user_id
    CROSS JOIN LATERAL fn_attendance_percent(
      vc.enrollment_id, $2, $3, $4, $5
    ) p
`;

export type RawAttendanceCounts = {
  offeringId: string;
  courseCode: string;
  enrollmentId: string;
  studentUserId: string;
  studentName: string;
  rollNo: string;
  sessionsTotal: number;
  sessionsWithAttendance: number;
  present: number;
  absent: number;
  excused: number;
  unmarked: number;
};

function mapCounts(row: CountRow): RawAttendanceCounts {
  return {
    offeringId: row.offering_id,
    courseCode: row.course_code,
    enrollmentId: row.enrollment_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    rollNo: row.roll_no,
    sessionsTotal: Number(row.sessions_total_non_cancelled),
    sessionsWithAttendance: Number(row.sessions_with_attendance),
    present: Number(row.present_count),
    absent: Number(row.absent_count),
    excused: Number(row.excused_count),
    unmarked: Number(row.unmarked_count),
  };
}

export async function getAttendanceCounts(
  offeringId: string,
): Promise<RawAttendanceCounts[]> {
  const policy = await getAttendancePolicyConfig();
  const rows = await query<CountRow>(
    `${COUNTS_SELECT}
      WHERE vc.offering_id = $1
      ORDER BY u.full_name`,
    [
      offeringId,
      policy.excused,
      policy.unmarked,
      policy.denominator,
      policy.roundingDecimals,
    ],
  );
  return rows.map(mapCounts);
}

export type AttendancePercentageRow = RawAttendanceCounts & {
  attendancePercent: string | null;
  policyConfigured: boolean;
};

export async function getAttendancePercentages(
  offeringId: string,
): Promise<AttendancePercentageRow[]> {
  const policy = await getAttendancePolicyConfig();
  const rows = await query<CountRow>(
    `${COUNTS_SELECT}
      WHERE vc.offering_id = $1
      ORDER BY u.full_name`,
    [
      offeringId,
      policy.excused,
      policy.unmarked,
      policy.denominator,
      policy.roundingDecimals,
    ],
  );
  return rows.map((row) => ({
    ...mapCounts(row),
    attendancePercent: row.attendance_percent,
    policyConfigured: row.policy_configured,
  }));
}

export async function getStudentAttendance(
  studentUserId: string,
  options: { offeringId?: string } = {},
): Promise<AttendanceSummaryDTO[]> {
  const policy = await getAttendancePolicyConfig();
  const rows = await query<CountRow>(
    `${COUNTS_SELECT}
      WHERE vc.student_user_id = $1
        AND ($6::uuid IS NULL OR vc.offering_id = $6)
      ORDER BY c.code`,
    [
      studentUserId,
      policy.excused,
      policy.unmarked,
      policy.denominator,
      policy.roundingDecimals,
      options.offeringId ?? null,
    ],
  );

  return rows.map((row) => {
    const counts = mapCounts(row);
    return {
      offeringId: counts.offeringId,
      courseCode: counts.courseCode,
      sessionsCounted: counts.sessionsTotal,
      present: counts.present,
      absent: counts.absent,
      excused: counts.excused,
      unmarked: counts.unmarked,
      attendancePercent: row.attendance_percent,
      deficit: null, // D13 threshold is an explicit report input; never assumed.
      policyConfigured: row.policy_configured,
    };
  });
}

/** Session-wise attendance history for one student (own records only). */
export async function getStudentAttendanceHistory(
  studentUserId: string,
  options: { offeringId?: string } = {},
): Promise<
  Array<{
    sessionId: string;
    offeringId: string;
    courseCode: string;
    topic: string;
    startsAt: string;
    status: AttendanceRowDTO['status'];
  }>
> {
  return query(
    `SELECT cs.id AS "sessionId", cs.offering_id AS "offeringId",
            c.code AS "courseCode", cs.topic,
            cs.starts_at::text AS "startsAt", a.status
       FROM attendance a
       JOIN class_session cs ON cs.id = a.session_id
       JOIN enrollment e     ON e.id = a.enrollment_id
       JOIN course_offering o ON o.id = cs.offering_id
       JOIN course c         ON c.id = o.course_id
      WHERE e.student_user_id = $1
        AND ($2::uuid IS NULL OR cs.offering_id = $2)
      ORDER BY cs.starts_at DESC`,
    [studentUserId, options.offeringId ?? null],
  );
}
