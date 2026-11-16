import 'server-only';
import type { PoolClient, QueryResultRow } from 'pg';
import type { GradePolicyDTO, TermDTO } from '@/types/contracts';
import { query } from '@/lib/db/pool';

/**
 * Policy configuration reads. Values are `jsonb null` until the corresponding
 * decision (D1–D16) is signed off. Nothing here supplies a default.
 */

export type AttendancePolicyConfig = {
  excused: string | null;
  unmarked: string | null;
  denominator: string | null;
  roundingDecimals: number | null;
  configured: boolean;
};

export async function getAttendancePolicyConfig(): Promise<AttendancePolicyConfig> {
  const rows = await query<{
    excused: string | null;
    unmarked: string | null;
    denominator: string | null;
    rounding: string | null;
  }>(
    `SELECT
       max(CASE WHEN key = 'attendance.excused_policy' THEN value #>> '{}' END)     AS excused,
       max(CASE WHEN key = 'attendance.unmarked_policy' THEN value #>> '{}' END)    AS unmarked,
       max(CASE WHEN key = 'attendance.denominator_policy' THEN value #>> '{}' END) AS denominator,
       max(CASE WHEN key = 'grading.rounding_decimals' THEN value #>> '{}' END)     AS rounding
     FROM app_setting
     WHERE key IN ('attendance.excused_policy', 'attendance.unmarked_policy',
                   'attendance.denominator_policy', 'grading.rounding_decimals')`,
  );
  const row = rows[0];
  const excused = row?.excused ?? null;
  const unmarked = row?.unmarked ?? null;
  const denominator = row?.denominator ?? null;
  const roundingDecimals =
    row?.rounding !== null && row?.rounding !== undefined ? Number(row.rounding) : null;
  return {
    excused,
    unmarked,
    denominator,
    roundingDecimals,
    configured:
      excused !== null &&
      unmarked !== null &&
      denominator !== null &&
      roundingDecimals !== null &&
      Number.isInteger(roundingDecimals),
  };
}

export async function getAppSetting(key: string): Promise<unknown | null> {
  const rows = await query<{ value: unknown }>(
    `SELECT value FROM app_setting WHERE key = $1`,
    [key],
  );
  return rows[0]?.value ?? null;
}

/* ============================== grade policies ============================ */

type GradePolicyRow = QueryResultRow & {
  id: string;
  name: string;
  version: number;
  term_id: string | null;
  attendance_weight: string | null;
  coursework_weight: string | null;
  late_penalty_mode: GradePolicyDTO['latePenaltyMode'];
  late_penalty_value: string | null;
  late_penalty_cap_percent: string | null;
  missing_work_policy: string | null;
  drop_lowest_count: number | null;
  rounding_decimals: number | null;
  pass_percent: string | null;
  letter_boundaries: unknown;
  is_active: boolean;
};

function mapPolicy(row: GradePolicyRow): GradePolicyDTO {
  const isComplete =
    row.attendance_weight !== null &&
    row.coursework_weight !== null &&
    row.late_penalty_mode !== null &&
    row.missing_work_policy !== null &&
    row.rounding_decimals !== null &&
    row.pass_percent !== null &&
    row.letter_boundaries !== null &&
    (row.late_penalty_mode === 'none' ||
      (row.late_penalty_value !== null && row.late_penalty_cap_percent !== null));

  return {
    id: row.id,
    name: row.name,
    version: row.version,
    termId: row.term_id,
    attendanceWeight: row.attendance_weight,
    courseworkWeight: row.coursework_weight,
    latePenaltyMode: row.late_penalty_mode,
    latePenaltyValue: row.late_penalty_value,
    latePenaltyCapPercent: row.late_penalty_cap_percent,
    missingWorkPolicy: row.missing_work_policy,
    dropLowestCount: row.drop_lowest_count,
    roundingDecimals: row.rounding_decimals,
    passPercent: row.pass_percent,
    letterBoundaries: row.letter_boundaries,
    isActive: row.is_active,
    isComplete,
  };
}

const POLICY_SELECT = `
  SELECT id, name, version, term_id, attendance_weight, coursework_weight,
         late_penalty_mode, late_penalty_value, late_penalty_cap_percent,
         missing_work_policy, drop_lowest_count, rounding_decimals,
         pass_percent, letter_boundaries, is_active
    FROM grade_policy
`;

export async function listGradePolicies(): Promise<GradePolicyDTO[]> {
  const rows = await query<GradePolicyRow>(
    `${POLICY_SELECT} ORDER BY name, version DESC`,
  );
  return rows.map(mapPolicy);
}

export async function getActiveGradePolicy(termId: string): Promise<GradePolicyDTO | null> {
  const rows = await query<GradePolicyRow>(
    `${POLICY_SELECT}
      WHERE is_active AND (term_id = $1 OR term_id IS NULL)
      ORDER BY (term_id IS NOT NULL) DESC, version DESC
      LIMIT 1`,
    [termId],
  );
  return rows[0] ? mapPolicy(rows[0]) : null;
}

/* =============================== final grades ============================ */

export async function computeFinalGradesTx(
  client: PoolClient,
  offeringId: string,
): Promise<number> {
  const rows = await client.query<{ computed: number }>(
    `SELECT fn_compute_final_grades_for_offering($1) AS computed`,
    [offeringId],
  );
  return Number(rows.rows[0]?.computed ?? 0);
}

export async function publishFinalGradesTx(
  client: PoolClient,
  offeringId: string,
  actorUserId: string,
): Promise<number> {
  const rows = await client.query<{ published: number }>(
    `SELECT fn_publish_final_grades($1, $2) AS published`,
    [offeringId, actorUserId],
  );
  return Number(rows.rows[0]?.published ?? 0);
}

export type FinalGradeRow = {
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
};

export async function listFinalGradesForOffering(
  offeringId: string,
): Promise<FinalGradeRow[]> {
  return query<FinalGradeRow>(
    `SELECT e.id            AS "enrollmentId",
            e.student_user_id AS "studentUserId",
            u.full_name     AS "studentName",
            c.code          AS "courseCode",
            fg.attendance_percent AS "attendancePercent",
            fg.coursework_percent AS "courseworkPercent",
            fg.final_percent    AS "finalPercent",
            fg.letter_grade     AS "letterGrade",
            coalesce(fg.status, 'draft') AS status,
            fg.published_at::text AS "publishedAt",
            (fg.id IS NOT NULL) AS "policyConfigured"
       FROM enrollment e
       JOIN student_profile sp ON sp.user_id = e.student_user_id
       JOIN app_user u         ON u.id = e.student_user_id
       JOIN course_offering o  ON o.id = e.offering_id
       JOIN course c           ON c.id = o.course_id
       LEFT JOIN final_grade fg ON fg.enrollment_id = e.id
      WHERE e.offering_id = $1 AND e.status IN ('active', 'completed')
      ORDER BY u.full_name`,
    [offeringId],
  );
}

export async function listPublishedFinalGradesForStudent(
  studentUserId: string,
): Promise<FinalGradeRow[]> {
  return query<FinalGradeRow>(
    `SELECT e.id AS "enrollmentId", e.student_user_id AS "studentUserId",
            u.full_name AS "studentName", c.code AS "courseCode",
            fg.attendance_percent AS "attendancePercent",
            fg.coursework_percent AS "courseworkPercent",
            fg.final_percent AS "finalPercent",
            fg.letter_grade AS "letterGrade",
            fg.status, fg.published_at::text AS "publishedAt",
            true AS "policyConfigured"
       FROM final_grade fg
       JOIN enrollment e      ON e.id = fg.enrollment_id
       JOIN course_offering o ON o.id = e.offering_id
       JOIN course c          ON c.id = o.course_id
       JOIN student_profile sp ON sp.user_id = e.student_user_id
       JOIN app_user u        ON u.id = e.student_user_id
      WHERE e.student_user_id = $1 AND fg.status = 'published'
      ORDER BY c.code`,
    [studentUserId],
  );
}

/** Active term for a course offering, used for policy lookup messages. */
export type OfferingTerm = { offeredTerm: TermDTO | null };
