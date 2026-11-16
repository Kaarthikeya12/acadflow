-- Read-only reporting views and policy-gated calculation functions.
-- Views use security_invoker so the caller's privileges apply; they contain no
-- authorization logic. Percentage/final-grade functions take policy values from
-- app_setting / grade_policy and fail closed (POLICY_NOT_CONFIGURED) when unset.

-- ---------------------------------------------------------------------------
-- v_offering_roster
-- ---------------------------------------------------------------------------
CREATE VIEW v_offering_roster WITH (security_invoker = true) AS
SELECT
  o.id            AS offering_id,
  e.id            AS enrollment_id,
  e.student_user_id,
  u.full_name     AS student_name,
  sp.roll_no,
  e.status        AS enrollment_status,
  e.enrolled_at,
  e.dropped_at
FROM course_offering o
JOIN enrollment e      ON e.offering_id = o.id
JOIN student_profile sp ON sp.user_id = e.student_user_id
JOIN app_user u         ON u.id = e.student_user_id;

-- ---------------------------------------------------------------------------
-- v_submission_detail: stored late snapshot plus a live comparison.
-- ---------------------------------------------------------------------------
CREATE VIEW v_submission_detail WITH (security_invoker = true) AS
SELECT
  s.id                AS submission_id,
  s.assignment_id,
  a.offering_id,
  a.title             AS assignment_title,
  c.code              AS course_code,
  c.title             AS course_title,
  s.enrollment_id,
  e.student_user_id,
  u.full_name         AS student_name,
  sp.roll_no,
  s.submitted_at,
  a.due_at,
  s.is_late,
  (s.submitted_at > a.due_at) AS is_late_live,
  s.marks_awarded,
  a.max_marks,
  s.grade_status,
  s.attempt_no,
  s.file_id,
  s.feedback,
  s.graded_at,
  s.released_at
FROM submission s
JOIN assignment a       ON a.id = s.assignment_id
JOIN course_offering o  ON o.id = a.offering_id
JOIN course c           ON c.id = o.course_id
JOIN enrollment e       ON e.id = s.enrollment_id
JOIN student_profile sp ON sp.user_id = e.student_user_id
JOIN app_user u         ON u.id = e.student_user_id;

-- ---------------------------------------------------------------------------
-- v_attendance_counts: raw counts per enrollment. No denominator selection and
-- no percentage; those are policy decisions (D3/D4/D14).
-- ---------------------------------------------------------------------------
CREATE VIEW v_attendance_counts WITH (security_invoker = true) AS
SELECT
  e.offering_id,
  e.id            AS enrollment_id,
  e.student_user_id,
  count(cs.id) FILTER (WHERE cs.status <> 'cancelled')                        AS sessions_total_non_cancelled,
  count(cs.id) FILTER (WHERE cs.status = 'completed')                         AS sessions_completed,
  count(at.id) FILTER (WHERE cs.status <> 'cancelled')                        AS sessions_with_attendance,
  count(at.id) FILTER (WHERE cs.status <> 'cancelled' AND at.status = 'present') AS present_count,
  count(at.id) FILTER (WHERE cs.status <> 'cancelled' AND at.status = 'absent')  AS absent_count,
  count(at.id) FILTER (WHERE cs.status <> 'cancelled' AND at.status = 'excused') AS excused_count,
  count(cs.id) FILTER (WHERE cs.status <> 'cancelled' AND at.id IS NULL)      AS unmarked_count
FROM enrollment e
LEFT JOIN class_session cs ON cs.offering_id = e.offering_id
LEFT JOIN attendance at    ON at.session_id = cs.id AND at.enrollment_id = e.id
GROUP BY e.offering_id, e.id, e.student_user_id;

-- ---------------------------------------------------------------------------
-- v_grade_change_audit: audit rows joined to stable IDs' current names.
-- ---------------------------------------------------------------------------
CREATE VIEW v_grade_change_audit WITH (security_invoker = true) AS
SELECT
  g.id                AS audit_id,
  g.submission_id,
  g.old_marks,
  g.new_marks,
  g.old_grade_status,
  g.new_grade_status,
  g.change_type,
  g.changed_by,
  actor.full_name     AS changed_by_name,
  g.changed_at,
  g.reason,
  g.request_id,
  s.assignment_id,
  a.title             AS assignment_title,
  a.offering_id,
  c.code              AS course_code,
  c.title             AS course_title,
  e.student_user_id,
  student.full_name   AS student_name,
  sp.roll_no
FROM grade_change_log g
JOIN submission s       ON s.id = g.submission_id
JOIN assignment a       ON a.id = s.assignment_id
JOIN course_offering o  ON o.id = a.offering_id
JOIN course c           ON c.id = o.course_id
JOIN enrollment e       ON e.id = s.enrollment_id
JOIN student_profile sp ON sp.user_id = e.student_user_id
JOIN app_user student   ON student.id = e.student_user_id
JOIN app_user actor     ON actor.id = g.changed_by;

-- ---------------------------------------------------------------------------
-- v_coursework_raw: marks and maxima, no penalty or aggregation.
-- ---------------------------------------------------------------------------
CREATE VIEW v_coursework_raw WITH (security_invoker = true) AS
SELECT
  e.offering_id,
  e.id            AS enrollment_id,
  e.student_user_id,
  a.id            AS assignment_id,
  a.title         AS assignment_title,
  a.max_marks,
  a.due_at,
  s.id            AS submission_id,
  s.submitted_at,
  s.is_late,
  s.marks_awarded,
  s.grade_status,
  (s.id IS NULL)  AS is_missing
FROM enrollment e
JOIN assignment a      ON a.offering_id = e.offering_id AND a.status = 'published'
LEFT JOIN submission s ON s.assignment_id = a.id AND s.enrollment_id = e.id
WHERE e.status = 'active';

-- ---------------------------------------------------------------------------
-- v_faculty_offerings
-- ---------------------------------------------------------------------------
CREATE VIEW v_faculty_offerings WITH (security_invoker = true) AS
SELECT
  o.id              AS offering_id,
  o.course_id,
  c.code            AS course_code,
  c.title           AS course_title,
  o.term_id,
  t.academic_year,
  t.term_no,
  t.label           AS term_label,
  o.faculty_user_id,
  fu.full_name      AS faculty_name,
  o.section_code,
  o.status,
  o.capacity,
  (SELECT count(*) FROM enrollment e
    WHERE e.offering_id = o.id AND e.status = 'active') AS enrolled_count,
  (SELECT min(cs.starts_at) FROM class_session cs
    WHERE cs.offering_id = o.id AND cs.status = 'scheduled'
      AND cs.starts_at >= now())                        AS next_session_at
FROM course_offering o
JOIN course c          ON c.id = o.course_id
JOIN academic_term t   ON t.id = o.term_id
JOIN faculty_profile f ON f.user_id = o.faculty_user_id
JOIN app_user fu       ON fu.id = f.user_id;

-- ---------------------------------------------------------------------------
-- v_student_schedule: upcoming sessions for a student's active enrollments.
-- ---------------------------------------------------------------------------
CREATE VIEW v_student_schedule WITH (security_invoker = true) AS
SELECT
  cs.id             AS session_id,
  cs.offering_id,
  c.code            AS course_code,
  c.title           AS course_title,
  cs.starts_at,
  cs.ends_at,
  cs.topic,
  cs.status,
  e.student_user_id,
  o.faculty_user_id,
  fu.full_name      AS faculty_name
FROM class_session cs
JOIN course_offering o ON o.id = cs.offering_id
JOIN course c          ON c.id = o.course_id
JOIN enrollment e      ON e.offering_id = o.id AND e.status = 'active'
JOIN app_user fu       ON fu.id = o.faculty_user_id
WHERE cs.status = 'scheduled' AND cs.starts_at >= now();

-- ---------------------------------------------------------------------------
-- fn_attendance_percent
-- Computes a percentage only when every policy argument is supplied explicitly.
-- Passing NULL for any policy argument returns policy_configured = false and a
-- NULL percentage, never 0. Unknown policy values raise.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_attendance_percent(
  p_enrollment_id       uuid,
  p_excused_policy      text,
  p_unmarked_policy     text,
  p_denominator_policy  text,
  p_rounding_decimals   integer
)
RETURNS TABLE (
  attendance_percent numeric,
  is_complete        boolean,
  policy_configured  boolean,
  sessions_counted   bigint,
  present_count      bigint,
  absent_count       bigint,
  excused_count      bigint,
  unmarked_count     bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total     bigint;
  v_present   bigint;
  v_absent    bigint;
  v_excused   bigint;
  v_unmarked  bigint;
  v_numerator bigint;
  v_denom     bigint;
  v_percent   numeric;
  v_complete  boolean := true;
BEGIN
  -- Raw counts are always available.
  SELECT c.sessions_total_non_cancelled, c.present_count, c.absent_count,
         c.excused_count, c.unmarked_count
    INTO v_total, v_present, v_absent, v_excused, v_unmarked
  FROM v_attendance_counts c
  WHERE c.enrollment_id = p_enrollment_id;

  IF v_total IS NULL THEN
    v_total := 0; v_present := 0; v_absent := 0; v_excused := 0; v_unmarked := 0;
  END IF;

  IF p_excused_policy IS NULL OR p_unmarked_policy IS NULL
     OR p_denominator_policy IS NULL OR p_rounding_decimals IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, false, false, v_total::bigint,
                        v_present, v_absent, v_excused, v_unmarked;
    RETURN;
  END IF;

  IF p_excused_policy NOT IN ('count_present', 'exclude', 'count_absent') THEN
    RAISE EXCEPTION 'unknown excused policy: %', p_excused_policy USING ERRCODE = '22023';
  END IF;
  IF p_unmarked_policy NOT IN ('count_absent', 'exclude', 'block') THEN
    RAISE EXCEPTION 'unknown unmarked policy: %', p_unmarked_policy USING ERRCODE = '22023';
  END IF;
  IF p_denominator_policy NOT IN ('all_scheduled', 'sessions_held', 'enrollment_window') THEN
    RAISE EXCEPTION 'unknown denominator policy: %', p_denominator_policy USING ERRCODE = '22023';
  END IF;
  IF p_rounding_decimals < 0 OR p_rounding_decimals > 4 THEN
    RAISE EXCEPTION 'rounding decimals must be between 0 and 4' USING ERRCODE = '22023';
  END IF;

  -- Re-count when the denominator is not "all scheduled non-cancelled sessions".
  IF p_denominator_policy <> 'all_scheduled' THEN
    SELECT count(*),
           count(a.id) FILTER (WHERE a.status = 'present'),
           count(a.id) FILTER (WHERE a.status = 'absent'),
           count(a.id) FILTER (WHERE a.status = 'excused'),
           count(*) FILTER (WHERE a.id IS NULL)
      INTO v_total, v_present, v_absent, v_excused, v_unmarked
    FROM enrollment e
    JOIN class_session cs ON cs.offering_id = e.offering_id
    LEFT JOIN attendance a ON a.session_id = cs.id AND a.enrollment_id = e.id
    WHERE e.id = p_enrollment_id
      AND cs.status <> 'cancelled'
      AND (
        (p_denominator_policy = 'sessions_held'
          AND (cs.status = 'completed'
               OR EXISTS (SELECT 1 FROM attendance x WHERE x.session_id = cs.id)))
        OR
        (p_denominator_policy = 'enrollment_window'
          AND cs.starts_at >= e.enrolled_at
          AND (e.dropped_at IS NULL OR cs.starts_at <= e.dropped_at))
      );
  END IF;

  v_denom := v_total;

  IF p_unmarked_policy = 'block' AND v_unmarked > 0 THEN
    v_complete := false;
  ELSIF p_unmarked_policy = 'exclude' THEN
    v_denom := v_denom - v_unmarked;
  END IF;

  IF p_excused_policy = 'count_present' THEN
    v_numerator := v_present + v_excused;
  ELSIF p_excused_policy = 'exclude' THEN
    v_numerator := v_present;
    v_denom := v_denom - v_excused;
  ELSE
    v_numerator := v_present;
  END IF;

  IF v_complete AND v_denom > 0 THEN
    v_percent := round(v_numerator::numeric * 100 / v_denom, p_rounding_decimals);
  END IF;

  RETURN QUERY SELECT v_percent, v_complete, true, v_denom,
                      v_present, v_absent, v_excused, v_unmarked;
END;
$$;

-- ---------------------------------------------------------------------------
-- fn_compute_final_grade
-- Requires a fully-configured active grade_policy for the offering's term plus
-- attendance policy settings. Raises P0001 with POLICY_NOT_CONFIGURED when any
-- required value is missing. No weights, boundaries, or penalties are defaulted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_compute_final_grade(p_enrollment_id uuid)
RETURNS TABLE (
  final_grade_id     uuid,
  policy_id          uuid,
  attendance_percent numeric,
  coursework_percent numeric,
  final_percent      numeric,
  letter_grade       text,
  status             final_grade_status,
  computed_at        timestamptz
)
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_offering_id     uuid;
  v_term_id         uuid;
  v_policy          grade_policy;
  v_excused         text;
  v_unmarked        text;
  v_denominator     text;
  v_att_pct         numeric;
  v_cw_pct          numeric;
  v_final           numeric;
  v_letter          text;
  v_details         jsonb;
  v_id              uuid;
  v_status          final_grade_status;
  v_computed_at     timestamptz;
BEGIN
  SELECT e.offering_id, o.term_id
    INTO v_offering_id, v_term_id
  FROM enrollment e
  JOIN course_offering o ON o.id = e.offering_id
  WHERE e.id = p_enrollment_id;

  IF v_offering_id IS NULL THEN
    RAISE EXCEPTION 'enrollment % does not exist', p_enrollment_id USING ERRCODE = '23503';
  END IF;

  SELECT * INTO v_policy
  FROM grade_policy gp
  WHERE gp.is_active
    AND (gp.term_id = v_term_id OR gp.term_id IS NULL)
  ORDER BY (gp.term_id IS NOT NULL) DESC, gp.version DESC
  LIMIT 1;

  IF v_policy.id IS NULL THEN
    RAISE EXCEPTION 'POLICY_NOT_CONFIGURED: no active grade policy for this term'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_policy.attendance_weight IS NULL
     OR v_policy.coursework_weight IS NULL
     OR v_policy.rounding_decimals IS NULL
     OR v_policy.late_penalty_mode IS NULL
     OR v_policy.missing_work_policy IS NULL
     OR v_policy.letter_boundaries IS NULL
     OR v_policy.pass_percent IS NULL
     OR (v_policy.late_penalty_mode <> 'none'
         AND (v_policy.late_penalty_value IS NULL OR v_policy.late_penalty_cap_percent IS NULL)) THEN
    RAISE EXCEPTION 'POLICY_NOT_CONFIGURED: grade policy % v% is incomplete',
      v_policy.name, v_policy.version USING ERRCODE = 'P0001';
  END IF;

  SELECT
    max(CASE WHEN key = 'attendance.excused_policy' THEN value #>> '{}' END),
    max(CASE WHEN key = 'attendance.unmarked_policy' THEN value #>> '{}' END),
    max(CASE WHEN key = 'attendance.denominator_policy' THEN value #>> '{}' END)
    INTO v_excused, v_unmarked, v_denominator
  FROM app_setting
  WHERE key IN ('attendance.excused_policy', 'attendance.unmarked_policy',
                'attendance.denominator_policy');

  IF v_excused IS NULL OR v_unmarked IS NULL OR v_denominator IS NULL THEN
    RAISE EXCEPTION 'POLICY_NOT_CONFIGURED: attendance policy settings are missing'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT f.attendance_percent INTO v_att_pct
  FROM fn_attendance_percent(
    p_enrollment_id, v_excused, v_unmarked, v_denominator, v_policy.rounding_decimals
  ) f;

  IF v_att_pct IS NULL THEN
    RAISE EXCEPTION 'POLICY_NOT_CONFIGURED: attendance percent unavailable (no eligible sessions or incomplete marking)'
      USING ERRCODE = 'P0001';
  END IF;

  -- Coursework: published assignments for the offering, penalized per policy,
  -- with missing work handled per policy and drop-lowest applied if configured.
  WITH raw AS (
    SELECT a.id AS assignment_id, a.max_marks, s.marks_awarded,
           s.is_late, s.submitted_at, a.due_at
    FROM assignment a
    LEFT JOIN submission s
      ON s.assignment_id = a.id AND s.enrollment_id = p_enrollment_id
    WHERE a.offering_id = v_offering_id AND a.status = 'published'
  ),
  scored AS (
    SELECT r.assignment_id, r.max_marks,
           CASE
             WHEN r.marks_awarded IS NULL THEN NULL
             ELSE greatest(
               0::numeric,
               r.marks_awarded - CASE
                 WHEN r.is_late AND v_policy.late_penalty_mode <> 'none' THEN
                   r.max_marks
                   * least(
                       v_policy.late_penalty_cap_percent,
                       v_policy.late_penalty_value * CASE v_policy.late_penalty_mode
                         WHEN 'flat_percent' THEN 1
                         WHEN 'per_day_percent' THEN
                           ceil(extract(epoch FROM (r.submitted_at - r.due_at)) / 86400.0)
                         WHEN 'per_hour_percent' THEN
                           ceil(extract(epoch FROM (r.submitted_at - r.due_at)) / 3600.0)
                       END
                     ) / 100.0
                 ELSE 0::numeric
               END
             )
           END AS effective_marks
    FROM raw r
  ),
  kept AS (
    SELECT assignment_id, max_marks, effective_marks
    FROM scored WHERE effective_marks IS NOT NULL
    UNION ALL
    SELECT assignment_id, max_marks, 0::numeric
    FROM scored
    WHERE effective_marks IS NULL AND v_policy.missing_work_policy = 'zero'
  ),
  ranked AS (
    SELECT k.*,
           row_number() OVER (ORDER BY k.effective_marks / k.max_marks ASC) AS rn
    FROM kept k
  ),
  aggregated AS (
    SELECT sum(effective_marks) AS marks_sum, sum(max_marks) AS max_sum
    FROM ranked
    WHERE rn > coalesce(v_policy.drop_lowest_count, 0)
  )
  SELECT CASE WHEN max_sum > 0
              THEN round(marks_sum / max_sum * 100, v_policy.rounding_decimals)
              ELSE NULL END
    INTO v_cw_pct
  FROM aggregated;

  IF v_cw_pct IS NULL THEN
    RAISE EXCEPTION 'POLICY_NOT_CONFIGURED: coursework percent unavailable (no counted submissions)'
      USING ERRCODE = 'P0001';
  END IF;

  v_final := round(
    (v_att_pct * v_policy.attendance_weight + v_cw_pct * v_policy.coursework_weight) / 100,
    v_policy.rounding_decimals
  );

  IF jsonb_typeof(v_policy.letter_boundaries) <> 'array'
     OR jsonb_array_length(v_policy.letter_boundaries) = 0 THEN
    RAISE EXCEPTION 'POLICY_NOT_CONFIGURED: letter_boundaries must be a non-empty array'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT b.elem ->> 'letter'
    INTO v_letter
  FROM jsonb_array_elements(v_policy.letter_boundaries) AS b(elem)
  WHERE (b.elem ->> 'minPercent')::numeric <= v_final
  ORDER BY (b.elem ->> 'minPercent')::numeric DESC
  LIMIT 1;

  IF v_letter IS NULL THEN
    RAISE EXCEPTION 'POLICY_NOT_CONFIGURED: letter boundaries do not cover %', v_final
      USING ERRCODE = 'P0001';
  END IF;

  v_details := jsonb_build_object(
    'policyId', v_policy.id,
    'policyName', v_policy.name,
    'policyVersion', v_policy.version,
    'attendanceWeight', v_policy.attendance_weight,
    'courseworkWeight', v_policy.coursework_weight,
    'roundingDecimals', v_policy.rounding_decimals,
    'latePenaltyMode', v_policy.late_penalty_mode,
    'missingWorkPolicy', v_policy.missing_work_policy,
    'dropLowestCount', v_policy.drop_lowest_count,
    'attendanceExcusedPolicy', v_excused,
    'attendanceUnmarkedPolicy', v_unmarked,
    'attendanceDenominatorPolicy', v_denominator,
    'passPercent', v_policy.pass_percent,
    'componentAttendance', v_att_pct,
    'componentCoursework', v_cw_pct,
    'computedAt', now()
  );

  INSERT INTO final_grade (
    enrollment_id, policy_id, attendance_percent, coursework_percent,
    final_percent, letter_grade, status, calculation_details, computed_at
  ) VALUES (
    p_enrollment_id, v_policy.id, v_att_pct, v_cw_pct,
    v_final, v_letter, 'draft', v_details, now()
  )
  ON CONFLICT (enrollment_id) DO UPDATE
    SET policy_id = EXCLUDED.policy_id,
        attendance_percent = EXCLUDED.attendance_percent,
        coursework_percent = EXCLUDED.coursework_percent,
        final_percent = EXCLUDED.final_percent,
        letter_grade = EXCLUDED.letter_grade,
        status = 'draft',
        calculation_details = EXCLUDED.calculation_details,
        computed_at = EXCLUDED.computed_at,
        published_at = NULL,
        published_by = NULL,
        updated_at = now()
  RETURNING final_grade.id, final_grade.status, final_grade.computed_at
    INTO v_id, v_status, v_computed_at;

  RETURN QUERY SELECT v_id, v_policy.id, v_att_pct, v_cw_pct, v_final,
                      v_letter, v_status, v_computed_at;
END;
$$;

-- Computes for every active/completed enrollment in an offering. One transaction
-- means a missing policy rolls the whole batch back.
CREATE OR REPLACE FUNCTION fn_compute_final_grades_for_offering(p_offering_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enrollment record;
  v_count integer := 0;
BEGIN
  FOR v_enrollment IN
    SELECT e.id FROM enrollment e
    WHERE e.offering_id = p_offering_id
      AND e.status IN ('active', 'completed')
    ORDER BY e.id
  LOOP
    PERFORM fn_compute_final_grade(v_enrollment.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Publishes computed draft grades for one offering. Rows without a percent and
-- letter cannot exist in draft (function guarantees them), but the WHERE clause
-- keeps the check constraint as the final guard.
CREATE OR REPLACE FUNCTION fn_publish_final_grades(p_offering_id uuid, p_actor uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE final_grade fg
     SET status = 'published',
         published_at = now(),
         published_by = p_actor
   FROM enrollment e
  WHERE e.id = fg.enrollment_id
    AND e.offering_id = p_offering_id
    AND fg.status = 'draft'
    AND fg.final_percent IS NOT NULL
    AND fg.letter_grade IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
