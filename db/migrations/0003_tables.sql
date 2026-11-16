-- Core relational schema. Table names are singular snake_case; `app_user` avoids
-- the reserved word `user`. All timestamps are timestamptz, all money-free academic
-- numbers use numeric. Foreign keys are RESTRICT: academic history is never cascaded.

-- ---------------------------------------------------------------------------
-- department
-- ---------------------------------------------------------------------------
CREATE TABLE department (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL,
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT department_code_normalized CHECK (code = upper(btrim(code)) AND code <> ''),
  CONSTRAINT department_name_not_blank   CHECK (btrim(name) <> '')
);

-- ---------------------------------------------------------------------------
-- app_user: login identity for all roles. Role-specific data lives in profiles.
-- ---------------------------------------------------------------------------
CREATE TABLE app_user (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  password_hash   text NOT NULL,
  full_name       text NOT NULL,
  role            user_role NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  session_version integer NOT NULL DEFAULT 0,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_user_email_normalized CHECK (email = lower(btrim(email)) AND email <> ''),
  CONSTRAINT app_user_full_name_not_blank CHECK (btrim(full_name) <> ''),
  CONSTRAINT app_user_password_hash_not_blank CHECK (btrim(password_hash) <> ''),
  CONSTRAINT app_user_session_version_non_negative CHECK (session_version >= 0)
);

-- ---------------------------------------------------------------------------
-- faculty_profile / student_profile: 1:1 extensions of app_user.
-- Role match is enforced by triggers (see 0005).
-- ---------------------------------------------------------------------------
CREATE TABLE faculty_profile (
  user_id       uuid PRIMARY KEY,
  department_id uuid NOT NULL,
  employee_no   text NOT NULL,
  designation   text,
  joined_on     date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT faculty_profile_user_fk
    FOREIGN KEY (user_id) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT faculty_profile_department_fk
    FOREIGN KEY (department_id) REFERENCES department (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT faculty_profile_employee_no_not_blank CHECK (btrim(employee_no) <> '')
);

CREATE TABLE student_profile (
  user_id        uuid PRIMARY KEY,
  department_id  uuid NOT NULL,
  roll_no        text NOT NULL,
  admission_year integer NOT NULL,
  program        text NOT NULL,
  batch          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_profile_user_fk
    FOREIGN KEY (user_id) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT student_profile_department_fk
    FOREIGN KEY (department_id) REFERENCES department (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT student_profile_roll_no_not_blank CHECK (btrim(roll_no) <> ''),
  CONSTRAINT student_profile_program_not_blank CHECK (btrim(program) <> ''),
  CONSTRAINT student_profile_admission_year_range CHECK (admission_year BETWEEN 1900 AND 2200)
);

-- ---------------------------------------------------------------------------
-- course catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE course (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL,
  code          text NOT NULL,
  title         text NOT NULL,
  credits       numeric(3,1) NOT NULL,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_department_fk
    FOREIGN KEY (department_id) REFERENCES department (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT course_code_normalized CHECK (code = upper(btrim(code)) AND code <> ''),
  CONSTRAINT course_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT course_credits_range CHECK (credits > 0 AND credits <= 30)
);

-- ---------------------------------------------------------------------------
-- academic_term: normalized semester + academic year pair.
-- ---------------------------------------------------------------------------
CREATE TABLE academic_term (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  term_no       smallint NOT NULL,
  label         text NOT NULL,
  starts_on     date NOT NULL,
  ends_on       date NOT NULL,
  is_current    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_term_year_format CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT academic_term_no_range CHECK (term_no BETWEEN 1 AND 3),
  CONSTRAINT academic_term_dates_order CHECK (ends_on > starts_on),
  CONSTRAINT academic_term_label_not_blank CHECK (btrim(label) <> ''),
  CONSTRAINT academic_term_year_term_key UNIQUE (academic_year, term_no)
);

-- ---------------------------------------------------------------------------
-- course_offering: one course in one term, taught by exactly one faculty member.
-- ---------------------------------------------------------------------------
CREATE TABLE course_offering (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL,
  term_id         uuid NOT NULL,
  faculty_user_id uuid NOT NULL,
  section_code    text NOT NULL DEFAULT 'A',
  status          offering_status NOT NULL DEFAULT 'draft',
  capacity        integer,
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_offering_course_fk
    FOREIGN KEY (course_id) REFERENCES course (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT course_offering_term_fk
    FOREIGN KEY (term_id) REFERENCES academic_term (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT course_offering_faculty_fk
    FOREIGN KEY (faculty_user_id) REFERENCES faculty_profile (user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT course_offering_created_by_fk
    FOREIGN KEY (created_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT course_offering_section_normalized
    CHECK (section_code = upper(btrim(section_code)) AND section_code <> ''),
  CONSTRAINT course_offering_capacity_positive CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT course_offering_course_term_section_key UNIQUE (course_id, term_id, section_code)
);

-- ---------------------------------------------------------------------------
-- enrollment: student registration in an offering (many-to-many junction).
-- ---------------------------------------------------------------------------
CREATE TABLE enrollment (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id       uuid NOT NULL,
  student_user_id   uuid NOT NULL,
  status            enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at       timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  dropped_at        timestamptz,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollment_offering_fk
    FOREIGN KEY (offering_id) REFERENCES course_offering (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT enrollment_student_fk
    FOREIGN KEY (student_user_id) REFERENCES student_profile (user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT enrollment_created_by_fk
    FOREIGN KEY (created_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT enrollment_offering_student_key UNIQUE (offering_id, student_user_id),
  -- Composite key required by attendance/submission composite foreign keys.
  CONSTRAINT enrollment_id_offering_key UNIQUE (id, offering_id),
  -- A dropped enrollment records when; any other status has no drop timestamp.
  CONSTRAINT enrollment_dropped_at_consistency
    CHECK ((status = 'dropped' AND dropped_at IS NOT NULL)
        OR (status <> 'dropped' AND dropped_at IS NULL))
);

-- ---------------------------------------------------------------------------
-- class_session
-- ---------------------------------------------------------------------------
CREATE TABLE class_session (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz,
  topic       text NOT NULL,
  status      session_status NOT NULL DEFAULT 'scheduled',
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_session_offering_fk
    FOREIGN KEY (offering_id) REFERENCES course_offering (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT class_session_created_by_fk
    FOREIGN KEY (created_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT class_session_topic_not_blank CHECK (btrim(topic) <> ''),
  CONSTRAINT class_session_time_order CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT class_session_offering_start_key UNIQUE (offering_id, starts_at),
  CONSTRAINT class_session_id_offering_key UNIQUE (id, offering_id)
);

-- ---------------------------------------------------------------------------
-- attendance: one row per (session, enrollment). offering_id is redundant but
-- lets composite foreign keys prove the session and enrollment share an offering.
-- ---------------------------------------------------------------------------
CREATE TABLE attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  offering_id   uuid NOT NULL,
  status        attendance_status NOT NULL,
  note          text,
  marked_by     uuid NOT NULL,
  marked_at     timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_session_fk
    FOREIGN KEY (session_id, offering_id)
    REFERENCES class_session (id, offering_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT attendance_enrollment_fk
    FOREIGN KEY (enrollment_id, offering_id)
    REFERENCES enrollment (id, offering_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT attendance_marked_by_fk
    FOREIGN KEY (marked_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT attendance_session_enrollment_key UNIQUE (session_id, enrollment_id)
);

-- ---------------------------------------------------------------------------
-- assignment
-- ---------------------------------------------------------------------------
CREATE TABLE assignment (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id          uuid NOT NULL,
  title                text NOT NULL,
  instructions         text NOT NULL DEFAULT '',
  due_at               timestamptz NOT NULL,
  max_marks            numeric(6,2) NOT NULL,
  late_penalty_percent numeric(5,2) NOT NULL DEFAULT 0,
  allow_resubmission   boolean NOT NULL DEFAULT false,
  status               assignment_status NOT NULL DEFAULT 'draft',
  published_at         timestamptz,
  created_by           uuid NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assignment_offering_fk
    FOREIGN KEY (offering_id) REFERENCES course_offering (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT assignment_created_by_fk
    FOREIGN KEY (created_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT assignment_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT assignment_max_marks_positive CHECK (max_marks > 0),
  CONSTRAINT assignment_late_penalty_range
    CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100),
  -- Publishing must stamp a publication time.
  CONSTRAINT assignment_published_at_required
    CHECK (status <> 'published' OR published_at IS NOT NULL),
  CONSTRAINT assignment_id_offering_key UNIQUE (id, offering_id)
);

-- ---------------------------------------------------------------------------
-- stored_file: file metadata only. Contents live outside PostgreSQL and outside
-- public/. storage_key is server-generated and never exposed to clients.
-- ---------------------------------------------------------------------------
CREATE TABLE stored_file (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key       text NOT NULL,
  original_filename text NOT NULL,
  mime_type         text NOT NULL,
  byte_size         bigint NOT NULL,
  sha256            text NOT NULL,
  uploaded_by       uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stored_file_uploaded_by_fk
    FOREIGN KEY (uploaded_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT stored_file_storage_key_unique UNIQUE (storage_key),
  CONSTRAINT stored_file_storage_key_not_blank CHECK (btrim(storage_key) <> ''),
  CONSTRAINT stored_file_filename_not_blank CHECK (btrim(original_filename) <> ''),
  CONSTRAINT stored_file_byte_size_positive CHECK (byte_size > 0),
  CONSTRAINT stored_file_sha256_format CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

-- ---------------------------------------------------------------------------
-- submission
-- ---------------------------------------------------------------------------
CREATE TABLE submission (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  uuid NOT NULL,
  enrollment_id  uuid NOT NULL,
  offering_id    uuid NOT NULL,
  file_id        uuid,
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  is_late        boolean NOT NULL DEFAULT false,
  attempt_no     integer NOT NULL DEFAULT 1,
  marks_awarded  numeric(6,2),
  grade_status   grade_status NOT NULL DEFAULT 'pending',
  feedback       text,
  graded_by      uuid,
  graded_at      timestamptz,
  released_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_assignment_fk
    FOREIGN KEY (assignment_id, offering_id)
    REFERENCES assignment (id, offering_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT submission_enrollment_fk
    FOREIGN KEY (enrollment_id, offering_id)
    REFERENCES enrollment (id, offering_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT submission_file_fk
    FOREIGN KEY (file_id) REFERENCES stored_file (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT submission_graded_by_fk
    FOREIGN KEY (graded_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT submission_assignment_enrollment_key UNIQUE (assignment_id, enrollment_id),
  CONSTRAINT submission_file_unique UNIQUE (file_id),
  CONSTRAINT submission_id_offering_key UNIQUE (id, offering_id),
  CONSTRAINT submission_attempt_positive CHECK (attempt_no > 0),
  CONSTRAINT submission_marks_non_negative CHECK (marks_awarded IS NULL OR marks_awarded >= 0),
  -- A graded or released submission always has marks.
  CONSTRAINT submission_graded_requires_marks
    CHECK (grade_status = 'pending' OR marks_awarded IS NOT NULL),
  -- A released submission records its release time.
  CONSTRAINT submission_released_at_required
    CHECK (grade_status <> 'released' OR released_at IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- grade_change_log: append-only audit written by a SECURITY DEFINER trigger.
-- ---------------------------------------------------------------------------
CREATE TABLE grade_change_log (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id    uuid NOT NULL,
  old_marks        numeric(6,2),
  new_marks        numeric(6,2) NOT NULL,
  old_grade_status grade_status,
  new_grade_status grade_status NOT NULL,
  change_type      audit_change_type NOT NULL,
  changed_by       uuid NOT NULL,
  changed_at       timestamptz NOT NULL DEFAULT now(),
  reason           text,
  request_id       text,
  CONSTRAINT grade_change_log_submission_fk
    FOREIGN KEY (submission_id) REFERENCES submission (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT grade_change_log_changed_by_fk
    FOREIGN KEY (changed_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT grade_change_log_new_marks_non_negative CHECK (new_marks >= 0)
);

-- ---------------------------------------------------------------------------
-- grade_policy: configuration, never seeded with invented values.
-- ---------------------------------------------------------------------------
CREATE TABLE grade_policy (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text NOT NULL,
  version                  integer NOT NULL,
  term_id                  uuid,
  attendance_weight        numeric(5,2),
  coursework_weight        numeric(5,2),
  late_penalty_mode        late_penalty_mode,
  late_penalty_value       numeric(6,2),
  late_penalty_cap_percent numeric(5,2),
  missing_work_policy      text,
  drop_lowest_count        integer,
  rounding_decimals        integer,
  pass_percent             numeric(5,2),
  letter_boundaries        jsonb,
  is_active                boolean NOT NULL DEFAULT true,
  created_by               uuid NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grade_policy_term_fk
    FOREIGN KEY (term_id) REFERENCES academic_term (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT grade_policy_created_by_fk
    FOREIGN KEY (created_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT grade_policy_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT grade_policy_version_positive CHECK (version > 0),
  CONSTRAINT grade_policy_name_version_key UNIQUE (name, version),
  CONSTRAINT grade_policy_attendance_weight_range
    CHECK (attendance_weight IS NULL OR (attendance_weight >= 0 AND attendance_weight <= 100)),
  CONSTRAINT grade_policy_coursework_weight_range
    CHECK (coursework_weight IS NULL OR (coursework_weight >= 0 AND coursework_weight <= 100)),
  CONSTRAINT grade_policy_weights_sum_to_100
    CHECK (attendance_weight IS NULL OR coursework_weight IS NULL
           OR attendance_weight + coursework_weight = 100),
  CONSTRAINT grade_policy_late_value_non_negative
    CHECK (late_penalty_value IS NULL OR late_penalty_value >= 0),
  CONSTRAINT grade_policy_late_cap_range
    CHECK (late_penalty_cap_percent IS NULL
           OR (late_penalty_cap_percent >= 0 AND late_penalty_cap_percent <= 100)),
  CONSTRAINT grade_policy_drop_lowest_non_negative
    CHECK (drop_lowest_count IS NULL OR drop_lowest_count >= 0),
  CONSTRAINT grade_policy_rounding_range
    CHECK (rounding_decimals IS NULL OR (rounding_decimals >= 0 AND rounding_decimals <= 4)),
  CONSTRAINT grade_policy_pass_percent_range
    CHECK (pass_percent IS NULL OR (pass_percent >= 0 AND pass_percent <= 100)),
  CONSTRAINT grade_policy_missing_work_vocabulary
    CHECK (missing_work_policy IS NULL
           OR missing_work_policy IN ('zero', 'exclude', 'best_of_n'))
);

-- ---------------------------------------------------------------------------
-- final_grade: computed result, one per enrollment. Policy-dependent, so rows
-- are only written by the calculation function once a policy is configured.
-- ---------------------------------------------------------------------------
CREATE TABLE final_grade (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id       uuid NOT NULL,
  policy_id           uuid NOT NULL,
  attendance_percent  numeric(5,2),
  coursework_percent  numeric(5,2),
  final_percent       numeric(5,2),
  letter_grade        text,
  status              final_grade_status NOT NULL DEFAULT 'draft',
  calculation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at         timestamptz,
  published_at        timestamptz,
  published_by        uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT final_grade_enrollment_fk
    FOREIGN KEY (enrollment_id) REFERENCES enrollment (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT final_grade_policy_fk
    FOREIGN KEY (policy_id) REFERENCES grade_policy (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT final_grade_published_by_fk
    FOREIGN KEY (published_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT final_grade_enrollment_key UNIQUE (enrollment_id),
  CONSTRAINT final_grade_attendance_percent_range
    CHECK (attendance_percent IS NULL OR (attendance_percent >= 0 AND attendance_percent <= 100)),
  CONSTRAINT final_grade_coursework_percent_range
    CHECK (coursework_percent IS NULL OR (coursework_percent >= 0 AND coursework_percent <= 100)),
  CONSTRAINT final_grade_final_percent_range
    CHECK (final_percent IS NULL OR (final_percent >= 0 AND final_percent <= 100)),
  -- Contract §4.5 #16: a published final grade needs a percent, letter and time.
  CONSTRAINT final_grade_published_requires_values
    CHECK (status <> 'published'
           OR (final_percent IS NOT NULL AND letter_grade IS NOT NULL AND published_at IS NOT NULL))
);

-- ---------------------------------------------------------------------------
-- app_setting: policy/configuration values. Secrets never belong here.
-- Academic policy keys are present but JSON `null` until the decision is signed.
-- ---------------------------------------------------------------------------
CREATE TABLE app_setting (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text NOT NULL,
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_setting_updated_by_fk
    FOREIGN KEY (updated_by) REFERENCES app_user (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT app_setting_key_not_blank CHECK (btrim(key) <> ''),
  CONSTRAINT app_setting_description_not_blank CHECK (btrim(description) <> '')
);
