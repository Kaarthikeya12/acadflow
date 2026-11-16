import 'server-only';
import type { PoolClient, QueryResultRow } from 'pg';
import type {
  AssignmentDTO,
  GradeChangeDTO,
  PageQuery,
  Paginated,
  StudentAssignmentDTO,
  SubmissionDTO,
} from '@/types/contracts';
import { query } from '@/lib/db/pool';
import { AppError } from '@/lib/db/errors';
import { likePattern, orderClause, pageWindow, totalPages } from './pagination';

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/* =============================== assignments ============================= */

type AssignmentRow = QueryResultRow & {
  id: string;
  offering_id: string;
  course_code: string;
  title: string;
  instructions: string;
  due_at: Date | string;
  max_marks: string;
  late_penalty_percent: string;
  allow_resubmission: boolean;
  status: AssignmentDTO['status'];
  submission_count: string;
  graded_count: string;
};

function mapAssignment(row: AssignmentRow): AssignmentDTO {
  return {
    id: row.id,
    offeringId: row.offering_id,
    courseCode: row.course_code,
    title: row.title,
    instructions: row.instructions,
    dueAt: iso(row.due_at),
    maxMarks: row.max_marks,
    latePenaltyPercent: row.late_penalty_percent,
    allowResubmission: row.allow_resubmission,
    status: row.status,
    submissionCount: Number(row.submission_count),
    gradedCount: Number(row.graded_count),
  };
}

const ASSIGNMENT_SELECT = `
  SELECT a.id, a.offering_id, c.code AS course_code, a.title, a.instructions,
         a.due_at, a.max_marks, a.late_penalty_percent, a.allow_resubmission, a.status,
         (SELECT count(*) FROM submission s WHERE s.assignment_id = a.id)             AS submission_count,
         (SELECT count(*) FROM submission s
           WHERE s.assignment_id = a.id AND s.grade_status <> 'pending')              AS graded_count
    FROM assignment a
    JOIN course_offering o ON o.id = a.offering_id
    JOIN course c          ON c.id = o.course_id
`;

export async function listAssignments(offeringId: string): Promise<AssignmentDTO[]> {
  const rows = await query<AssignmentRow>(
    `${ASSIGNMENT_SELECT} WHERE a.offering_id = $1 ORDER BY a.due_at DESC`,
    [offeringId],
  );
  return rows.map(mapAssignment);
}

export async function getAssignmentById(assignmentId: string): Promise<AssignmentDTO | null> {
  const rows = await query<AssignmentRow>(`${ASSIGNMENT_SELECT} WHERE a.id = $1`, [assignmentId]);
  return rows[0] ? mapAssignment(rows[0]) : null;
}

export async function insertAssignment(
  client: PoolClient,
  input: {
    offeringId: string;
    title: string;
    instructions: string;
    dueAt: Date;
    maxMarks: string;
    latePenaltyPercent: string;
    allowResubmission: boolean;
    createdBy: string;
  },
): Promise<string> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO assignment
       (offering_id, title, instructions, due_at, max_marks,
        late_penalty_percent, allow_resubmission, created_by)
     VALUES ($1, btrim($2), $3, $4, $5::numeric, $6::numeric, $7, $8)
     RETURNING id`,
    [
      input.offeringId,
      input.title,
      input.instructions,
      input.dueAt,
      input.maxMarks,
      input.latePenaltyPercent,
      input.allowResubmission,
      input.createdBy,
    ],
  );
  const id = rows.rows[0]?.id;
  if (!id) throw new Error('Assignment insert returned no id');
  return id;
}

export async function updateAssignment(
  client: PoolClient,
  input: {
    assignmentId: string;
    title: string | null;
    instructions: string | null;
    dueAt: Date | null;
    maxMarks: string | null;
    latePenaltyPercent: string | null;
    allowResubmission: boolean | null;
  },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE assignment
        SET title = coalesce($2, title),
            instructions = coalesce($3, instructions),
            due_at = coalesce($4, due_at),
            max_marks = coalesce($5::numeric, max_marks),
            late_penalty_percent = coalesce($6::numeric, late_penalty_percent),
            allow_resubmission = coalesce($7, allow_resubmission)
      WHERE id = $1`,
    [
      input.assignmentId,
      input.title,
      input.instructions,
      input.dueAt,
      input.maxMarks,
      input.latePenaltyPercent,
      input.allowResubmission,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getAssignmentStatusForUpdate(
  client: PoolClient,
  assignmentId: string,
): Promise<AssignmentDTO['status'] | null> {
  const rows = await client.query<{ status: AssignmentDTO['status'] }>(
    `SELECT status FROM assignment WHERE id = $1 FOR UPDATE`,
    [assignmentId],
  );
  return rows.rows[0]?.status ?? null;
}

export async function publishAssignment(
  client: PoolClient,
  assignmentId: string,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE assignment SET status = 'published', published_at = now() WHERE id = $1`,
    [assignmentId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function closeAssignment(
  client: PoolClient,
  assignmentId: string,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE assignment SET status = 'closed' WHERE id = $1`,
    [assignmentId],
  );
  return (result.rowCount ?? 0) > 0;
}

/* =============================== submissions ============================= */

type SubmissionRow = QueryResultRow & {
  id: string;
  assignment_id: string;
  student_user_id: string;
  student_name: string;
  roll_no: string;
  submitted_at: Date | string;
  is_late: boolean;
  marks_awarded: string | null;
  grade_status: SubmissionDTO['gradeStatus'];
  file_id: string | null;
  original_filename: string | null;
  feedback: string | null;
};

function mapSubmission(row: SubmissionRow): SubmissionDTO {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    rollNo: row.roll_no,
    submittedAt: iso(row.submitted_at),
    isLate: row.is_late,
    marksAwarded: row.marks_awarded,
    gradeStatus: row.grade_status,
    fileId: row.file_id,
    originalFilename: row.original_filename,
    feedback: row.feedback,
  };
}

const SUBMISSION_SELECT = `
  SELECT s.id, s.assignment_id, e.student_user_id,
         u.full_name AS student_name, sp.roll_no,
         s.submitted_at, s.is_late, s.marks_awarded, s.grade_status,
         s.file_id, f.original_filename, s.feedback
    FROM submission s
    JOIN enrollment e       ON e.id = s.enrollment_id
    JOIN student_profile sp ON sp.user_id = e.student_user_id
    JOIN app_user u         ON u.id = e.student_user_id
    LEFT JOIN stored_file f ON f.id = s.file_id
`;

export async function listSubmissions(
  assignmentId: string,
  options: { q?: string; gradeStatus?: SubmissionDTO['gradeStatus'] } = {},
): Promise<SubmissionDTO[]> {
  const rows = await query<SubmissionRow>(
    `${SUBMISSION_SELECT}
      WHERE s.assignment_id = $1
        AND ($2::text IS NULL OR u.full_name ILIKE $2 OR sp.roll_no ILIKE $2)
        AND ($3::grade_status IS NULL OR s.grade_status = $3)
      ORDER BY s.submitted_at ASC`,
    [assignmentId, likePattern(options.q), options.gradeStatus ?? null],
  );
  return rows.map(mapSubmission);
}

export async function listStudentSubmissions(
  studentUserId: string,
  options: { assignmentId?: string } = {},
): Promise<SubmissionDTO[]> {
  const rows = await query<SubmissionRow>(
    `${SUBMISSION_SELECT}
      WHERE e.student_user_id = $1
        AND ($2::uuid IS NULL OR s.assignment_id = $2)
      ORDER BY s.submitted_at DESC`,
    [studentUserId, options.assignmentId ?? null],
  );
  return rows.map(mapSubmission);
}

export async function getSubmissionById(submissionId: string): Promise<SubmissionDTO | null> {
  const rows = await query<SubmissionRow>(`${SUBMISSION_SELECT} WHERE s.id = $1`, [submissionId]);
  return rows[0] ? mapSubmission(rows[0]) : null;
}

export type SubmissionDetail = SubmissionDTO & {
  offeringId: string;
  assignmentTitle: string;
  courseCode: string;
  maxMarks: string;
  feedback: string | null;
  releasedAt: string | null;
};

export async function getSubmissionDetail(
  submissionId: string,
): Promise<SubmissionDetail | null> {
  const rows = await query<
    SubmissionRow & {
      offering_id: string;
      assignment_title: string;
      course_code: string;
      max_marks: string;
      feedback: string | null;
      released_at: Date | string | null;
    }
  >(
    `SELECT s.id, s.assignment_id, e.student_user_id, u.full_name AS student_name,
            sp.roll_no, s.submitted_at, s.is_late, s.marks_awarded, s.grade_status,
            s.file_id, f.original_filename, a.offering_id, a.title AS assignment_title,
            c.code AS course_code, a.max_marks, s.feedback, s.released_at
       FROM submission s
       JOIN assignment a       ON a.id = s.assignment_id
       JOIN course_offering o  ON o.id = a.offering_id
       JOIN course c           ON c.id = o.course_id
       JOIN enrollment e       ON e.id = s.enrollment_id
       JOIN student_profile sp ON sp.user_id = e.student_user_id
       JOIN app_user u         ON u.id = e.student_user_id
       LEFT JOIN stored_file f ON f.id = s.file_id
      WHERE s.id = $1`,
    [submissionId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...mapSubmission(row),
    offeringId: row.offering_id,
    assignmentTitle: row.assignment_title,
    courseCode: row.course_code,
    maxMarks: row.max_marks,
    feedback: row.feedback,
    releasedAt: row.released_at ? iso(row.released_at) : null,
  };
}

/* ------------------------------ grade writes ----------------------------- */

export type GradeResult = {
  submissionId: string;
  marksAwarded: string;
  gradeStatus: SubmissionDTO['gradeStatus'];
  auditLogId: string;
};

export async function gradeSubmissionTx(
  client: PoolClient,
  input: {
    submissionId: string;
    marksAwarded: string;
    feedback: string | null;
    release: boolean;
    gradedBy: string;
  },
): Promise<GradeResult> {
  const locked = await client.query<{
    id: string;
    marks_awarded: string | null;
    grade_status: SubmissionDTO['gradeStatus'];
  }>(
    `SELECT id, marks_awarded, grade_status FROM submission WHERE id = $1 FOR UPDATE`,
    [input.submissionId],
  );
  if (!locked.rows[0]) throw new AppError('NOT_FOUND', 'The submission was not found.');

  const result = await client.query<{ marks_awarded: string; grade_status: SubmissionDTO['gradeStatus'] }>(
    `UPDATE submission
        SET marks_awarded = $2::numeric,
            feedback = $3,
            grade_status = $4::grade_status,
            graded_by = $5,
            graded_at = now(),
            released_at = CASE WHEN $4::grade_status = 'released' THEN now() ELSE released_at END
      WHERE id = $1
      RETURNING marks_awarded, grade_status`,
    [
      input.submissionId,
      input.marksAwarded,
      input.feedback,
      input.release ? 'released' : 'graded',
      input.gradedBy,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new AppError('INTERNAL');

  // Written by the audit trigger in this same transaction.
  const audit = await client.query<{ id: string }>(
    `SELECT id FROM grade_change_log WHERE submission_id = $1 ORDER BY id DESC LIMIT 1`,
    [input.submissionId],
  );
  const auditLogId = audit.rows[0]?.id;
  if (!auditLogId) {
    throw new AppError('INTERNAL', 'The grade audit record was not created.');
  }

  return {
    submissionId: input.submissionId,
    marksAwarded: row.marks_awarded,
    gradeStatus: row.grade_status,
    auditLogId,
  };
}

export async function releaseGradeTx(
  client: PoolClient,
  submissionId: string,
): Promise<{ submissionId: string; releasedAt: string }> {
  const rows = await client.query<{ released_at: Date }>(
    `UPDATE submission
        SET grade_status = 'released',
            released_at = now()
      WHERE id = $1
        AND marks_awarded IS NOT NULL
      RETURNING released_at`,
    [submissionId],
  );
  const releasedAt = rows.rows[0]?.released_at;
  if (!releasedAt) {
    throw new AppError('CONFLICT', 'This submission cannot be released: marks are missing.');
  }
  return { submissionId, releasedAt: iso(releasedAt) };
}

/* ============================ grade change audit ========================= */

type GradeChangeRow = QueryResultRow & {
  audit_id: string;
  submission_id: string;
  student_name: string;
  course_code: string;
  assignment_title: string;
  old_marks: string | null;
  new_marks: string;
  change_type: GradeChangeDTO['changeType'];
  changed_by_name: string;
  changed_at: Date | string;
  reason: string | null;
};

export async function listGradeChanges(
  input: PageQuery & {
    offeringId?: string;
    facultyUserId?: string;
    studentUserId?: string;
    courseCode?: string;
  },
): Promise<Paginated<GradeChangeDTO>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const filterParams = [
    input.offeringId ?? null,
    input.facultyUserId ?? null,
    input.studentUserId ?? null,
    likePattern(input.courseCode),
  ];
  const where = `
    WHERE ($1::uuid IS NULL OR g.offering_id = $1)
      AND ($2::uuid IS NULL OR o.faculty_user_id = $2)
      AND ($3::uuid IS NULL OR g.student_user_id = $3)
      AND ($4::text IS NULL OR g.course_code ILIKE $4)
  `;
  const rows = await query<GradeChangeRow>(
    `SELECT g.audit_id, g.submission_id, g.student_name, g.course_code,
            g.assignment_title, g.old_marks, g.new_marks, g.change_type,
            g.changed_by_name, g.changed_at, g.reason
       FROM v_grade_change_audit g
       JOIN course_offering o ON o.id = g.offering_id
     ${where}
     ORDER BY g.changed_at DESC, g.audit_id DESC
     LIMIT $5 OFFSET $6`,
    [...filterParams, limit, offset],
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total
       FROM v_grade_change_audit g
       JOIN course_offering o ON o.id = g.offering_id
     ${where}`,
    filterParams,
  );
  const total = Number(countRows[0]?.total ?? 0);
  return {
    items: rows.map((row) => ({
      id: row.audit_id,
      submissionId: row.submission_id,
      studentName: row.student_name,
      courseCode: row.course_code,
      assignmentTitle: row.assignment_title,
      oldMarks: row.old_marks,
      newMarks: row.new_marks,
      changeType: row.change_type,
      changedByName: row.changed_by_name,
      changedAt: iso(row.changed_at),
      reason: row.reason,
    })),
    page,
    pageSize,
    total,
    totalPages: totalPages(total, pageSize),
  };
}

/* ========================== student assignment read ====================== */

type StudentAssignmentRow = QueryResultRow & {
  id: string;
  offering_id: string;
  course_code: string;
  course_title: string;
  title: string;
  due_at: Date | string;
  max_marks: string;
  allow_resubmission: boolean;
  status: StudentAssignmentDTO['status'];
  submission_id: string | null;
  submitted_at: Date | string | null;
  is_late: boolean | null;
  marks_awarded: string | null;
  grade_status: StudentAssignmentDTO['gradeStatus'];
  feedback: string | null;
  instructions: string;
};

export async function listStudentAssignments(
  studentUserId: string,
  options: { assignmentId?: string; includeClosed?: boolean } = {},
): Promise<Array<StudentAssignmentDTO & { instructions: string; courseTitle: string }>> {
  const rows = await query<StudentAssignmentRow>(
    `SELECT a.id, a.offering_id, c.code AS course_code, c.title AS course_title,
            a.title, a.due_at, a.max_marks, a.allow_resubmission, a.status, a.instructions,
            s.id AS submission_id, s.submitted_at, s.is_late,
            CASE WHEN s.grade_status = 'released' THEN s.marks_awarded END AS marks_awarded,
            s.grade_status,
            CASE WHEN s.grade_status = 'released' THEN s.feedback END AS feedback
       FROM enrollment e
       JOIN course_offering o ON o.id = e.offering_id
       JOIN course c          ON c.id = o.course_id
       JOIN assignment a      ON a.offering_id = o.id
       LEFT JOIN submission s ON s.assignment_id = a.id AND s.enrollment_id = e.id
      WHERE e.student_user_id = $1
        AND e.status = 'active'
        AND a.status IN ('published', 'closed')
        AND ($2::uuid IS NULL OR a.id = $2)
        AND ($3::boolean = true OR a.status = 'published')
      ORDER BY a.due_at ASC`,
    [studentUserId, options.assignmentId ?? null, options.includeClosed ?? false],
  );

  return rows.map((row) => ({
    id: row.id,
    offeringId: row.offering_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    title: row.title,
    dueAt: iso(row.due_at),
    maxMarks: row.max_marks,
    allowResubmission: row.allow_resubmission,
    status: row.status,
    submissionId: row.submission_id,
    submittedAt: row.submitted_at ? iso(row.submitted_at) : null,
    isLate: row.is_late,
    marksAwarded: row.marks_awarded,
    gradeStatus: row.grade_status,
    feedback: row.feedback,
    instructions: row.instructions,
  }));
}
