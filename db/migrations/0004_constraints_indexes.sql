-- Uniqueness that must be case-insensitive and indexes for demonstrated queries.
-- Constraint/index names are part of the error-mapping contract (§9.2).

-- Case-insensitive natural keys.
CREATE UNIQUE INDEX app_user_email_key ON app_user (lower(email));
CREATE UNIQUE INDEX department_code_key ON department (upper(code));
CREATE UNIQUE INDEX department_name_key ON department (lower(btrim(name)));
CREATE UNIQUE INDEX faculty_profile_employee_no_key ON faculty_profile (upper(employee_no));
CREATE UNIQUE INDEX student_profile_roll_no_key ON student_profile (upper(roll_no));
CREATE UNIQUE INDEX course_code_key ON course (upper(code));

-- At most one current term.
CREATE UNIQUE INDEX academic_term_current_key ON academic_term (is_current) WHERE is_current = true;

-- Lookup indexes.
CREATE INDEX app_user_role_active_idx ON app_user (role, is_active);
CREATE INDEX faculty_profile_department_idx ON faculty_profile (department_id);
CREATE INDEX student_profile_department_idx ON student_profile (department_id);
CREATE INDEX course_department_active_idx ON course (department_id, is_active);
CREATE INDEX course_offering_course_idx ON course_offering (course_id);
CREATE INDEX course_offering_term_idx ON course_offering (term_id);
CREATE INDEX course_offering_faculty_idx ON course_offering (faculty_user_id);
CREATE INDEX course_offering_status_idx ON course_offering (status);
CREATE INDEX enrollment_student_status_idx ON enrollment (student_user_id, status);
CREATE INDEX enrollment_offering_status_idx ON enrollment (offering_id, status);
CREATE INDEX class_session_offering_status_idx ON class_session (offering_id, status);
CREATE INDEX attendance_enrollment_idx ON attendance (enrollment_id);
CREATE INDEX assignment_offering_status_due_idx ON assignment (offering_id, status, due_at);
CREATE INDEX submission_assignment_grade_status_idx ON submission (assignment_id, grade_status);
CREATE INDEX submission_enrollment_idx ON submission (enrollment_id);
CREATE INDEX submission_submitted_at_idx ON submission (submitted_at);
CREATE INDEX grade_change_log_submission_changed_idx ON grade_change_log (submission_id, changed_at DESC);
CREATE INDEX grade_change_log_changed_by_idx ON grade_change_log (changed_by, changed_at DESC);
CREATE INDEX final_grade_status_idx ON final_grade (status);
CREATE INDEX stored_file_uploaded_by_idx ON stored_file (uploaded_by);
