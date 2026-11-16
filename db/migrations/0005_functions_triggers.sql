-- Database-maintained integrity and audit. Every trigger uses a fixed search_path.
-- SECURITY DEFINER is used only for the grade-audit trigger, which must write to a
-- table the runtime application role cannot touch.

-- ---------------------------------------------------------------------------
-- Shared: updated_at maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Role/profile consistency. A profile must extend a user of the matching role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_assert_faculty_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_user u WHERE u.id = NEW.user_id AND u.role = 'faculty'
  ) THEN
    RAISE EXCEPTION 'faculty_profile requires an app_user whose role is faculty'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_assert_student_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_user u WHERE u.id = NEW.user_id AND u.role = 'student'
  ) THEN
    RAISE EXCEPTION 'student_profile requires an app_user whose role is student'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Role is immutable: profiles and historical records depend on it.
CREATE OR REPLACE FUNCTION fn_user_role_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'app_user.role is immutable; create a new account instead'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Submission: server-authoritative timestamp and late snapshot
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_submission_set_late()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_due_at timestamptz;
  v_import boolean := coalesce(current_setting('app.import_mode', true) = 'on', false);
BEGIN
  IF NOT v_import THEN
    NEW.submitted_at := now();
  END IF;

  SELECT a.due_at INTO v_due_at FROM assignment a WHERE a.id = NEW.assignment_id;
  IF v_due_at IS NULL THEN
    RAISE EXCEPTION 'assignment % does not exist', NEW.assignment_id USING ERRCODE = '23503';
  END IF;

  NEW.is_late := NEW.submitted_at > v_due_at;
  RETURN NEW;
END;
$$;

-- A student may only submit to a published assignment for an active enrollment
-- in the same offering. Resubmission replacement is also blocked once dropped/closed.
CREATE OR REPLACE FUNCTION fn_submission_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM enrollment e
      WHERE e.id = NEW.enrollment_id AND e.status = 'active'
    ) THEN
      RAISE EXCEPTION 'submission requires an active enrollment' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM assignment a
      WHERE a.id = NEW.assignment_id AND a.status = 'published'
    ) THEN
      RAISE EXCEPTION 'submission requires a published assignment' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;

  -- Replacement (a new file) re-checks eligibility, including closed assignments.
  IF NEW.file_id IS DISTINCT FROM OLD.file_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM enrollment e
      WHERE e.id = NEW.enrollment_id AND e.status = 'active'
    ) THEN
      RAISE EXCEPTION 'resubmission requires an active enrollment' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM assignment a
      WHERE a.id = NEW.assignment_id AND a.status = 'published'
    ) THEN
      RAISE EXCEPTION 'resubmission requires a published assignment' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_submission_marks_within_max()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max numeric(6,2);
BEGIN
  IF NEW.marks_awarded IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.max_marks INTO v_max FROM assignment a WHERE a.id = NEW.assignment_id;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'assignment % does not exist', NEW.assignment_id USING ERRCODE = '23503';
  END IF;

  IF NEW.marks_awarded < 0 OR NEW.marks_awarded > v_max THEN
    RAISE EXCEPTION 'marks_awarded must be between 0 and %', v_max USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- Lowering max_marks below an already-awarded mark is invalid.
CREATE OR REPLACE FUNCTION fn_assignment_max_marks_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.max_marks IS DISTINCT FROM OLD.max_marks AND EXISTS (
    SELECT 1 FROM submission s
    WHERE s.assignment_id = NEW.id
      AND s.marks_awarded IS NOT NULL
      AND s.marks_awarded > NEW.max_marks
  ) THEN
    RAISE EXCEPTION 'max_marks cannot be lowered below an awarded mark'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Provisional D17 rule: due_at is frozen once a submission exists.
CREATE OR REPLACE FUNCTION fn_assignment_due_at_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.due_at IS DISTINCT FROM OLD.due_at AND EXISTS (
    SELECT 1 FROM submission s WHERE s.assignment_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'due_at cannot change after a submission exists (D17 pending)'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Cancelled sessions cannot receive attendance.
CREATE OR REPLACE FUNCTION fn_attendance_session_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM class_session cs
    WHERE cs.id = NEW.session_id AND cs.status = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'attendance cannot be recorded on a cancelled session'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grade-change audit
-- The actor and request id come from transaction-local settings:
--   SET LOCAL app.actor_user_id = '<uuid>'
--   SET LOCAL app.request_id   = '<id>'
-- A missing/invalid actor aborts the whole mark change.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_grade_change_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor      uuid;
  v_request_id text;
  v_reason     text;
  v_change     audit_change_type;
BEGIN
  -- Initial insert with no marks is not a grade event.
  IF TG_OP = 'INSERT' AND NEW.marks_awarded IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only an actual marks change is audited.
  IF TG_OP = 'UPDATE'
     AND NEW.marks_awarded IS NOT DISTINCT FROM OLD.marks_awarded THEN
    RETURN NEW;
  END IF;

  IF NEW.marks_awarded IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_actor := nullif(current_setting('app.actor_user_id', true), '')::uuid;
  EXCEPTION WHEN others THEN
    v_actor := NULL;
  END;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'grade change requires app.actor_user_id to be set'
      USING ERRCODE = '42501';
  END IF;

  v_request_id := nullif(current_setting('app.request_id', true), '');
  v_reason     := nullif(current_setting('app.change_reason', true), '');

  IF TG_OP = 'INSERT' OR OLD.marks_awarded IS NULL THEN
    v_change := 'initial';
  ELSE
    v_change := 'update';
  END IF;

  INSERT INTO grade_change_log (
    submission_id, old_marks, new_marks, old_grade_status, new_grade_status,
    change_type, changed_by, reason, request_id
  ) VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.marks_awarded ELSE NULL END,
    NEW.marks_awarded,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.grade_status ELSE NULL END,
    NEW.grade_status,
    v_change,
    v_actor,
    v_reason,
    v_request_id
  );

  RETURN NEW;
END;
$$;

-- The audit log is append-only even for the schema owner.
CREATE OR REPLACE FUNCTION fn_grade_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'grade_change_log is append-only' USING ERRCODE = '23514';
END;
$$;

-- ---------------------------------------------------------------------------
-- Attach triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER department_set_updated_at
  BEFORE UPDATE ON department FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER app_user_set_updated_at
  BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER faculty_profile_set_updated_at
  BEFORE UPDATE ON faculty_profile FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER student_profile_set_updated_at
  BEFORE UPDATE ON student_profile FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER course_set_updated_at
  BEFORE UPDATE ON course FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER academic_term_set_updated_at
  BEFORE UPDATE ON academic_term FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER course_offering_set_updated_at
  BEFORE UPDATE ON course_offering FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER enrollment_set_updated_at
  BEFORE UPDATE ON enrollment FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER class_session_set_updated_at
  BEFORE UPDATE ON class_session FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER attendance_set_updated_at
  BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER assignment_set_updated_at
  BEFORE UPDATE ON assignment FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER submission_set_updated_at
  BEFORE UPDATE ON submission FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER grade_policy_set_updated_at
  BEFORE UPDATE ON grade_policy FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER final_grade_set_updated_at
  BEFORE UPDATE ON final_grade FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER app_setting_set_updated_at
  BEFORE UPDATE ON app_setting FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER faculty_profile_assert_role
  BEFORE INSERT OR UPDATE ON faculty_profile
  FOR EACH ROW EXECUTE FUNCTION fn_assert_faculty_role();
CREATE TRIGGER student_profile_assert_role
  BEFORE INSERT OR UPDATE ON student_profile
  FOR EACH ROW EXECUTE FUNCTION fn_assert_student_role();
CREATE TRIGGER app_user_role_immutable
  BEFORE UPDATE OF role ON app_user
  FOR EACH ROW EXECUTE FUNCTION fn_user_role_immutable();

CREATE TRIGGER submission_set_late
  BEFORE INSERT OR UPDATE OF submitted_at ON submission
  FOR EACH ROW EXECUTE FUNCTION fn_submission_set_late();
CREATE TRIGGER submission_eligibility
  BEFORE INSERT OR UPDATE OF file_id, assignment_id, enrollment_id ON submission
  FOR EACH ROW EXECUTE FUNCTION fn_submission_eligibility();
CREATE TRIGGER submission_marks_within_max
  BEFORE INSERT OR UPDATE OF marks_awarded ON submission
  FOR EACH ROW EXECUTE FUNCTION fn_submission_marks_within_max();
CREATE TRIGGER submission_audit_marks_change
  AFTER INSERT OR UPDATE OF marks_awarded ON submission
  FOR EACH ROW EXECUTE FUNCTION fn_grade_change_audit();

CREATE TRIGGER assignment_max_marks_guard
  BEFORE UPDATE OF max_marks ON assignment
  FOR EACH ROW EXECUTE FUNCTION fn_assignment_max_marks_guard();
CREATE TRIGGER assignment_due_at_guard
  BEFORE UPDATE OF due_at ON assignment
  FOR EACH ROW EXECUTE FUNCTION fn_assignment_due_at_guard();

CREATE TRIGGER attendance_session_guard
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_session_guard();

CREATE TRIGGER grade_change_log_immutable
  BEFORE UPDATE OR DELETE ON grade_change_log
  FOR EACH ROW EXECUTE FUNCTION fn_grade_log_immutable();
