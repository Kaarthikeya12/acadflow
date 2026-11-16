import 'server-only';
import type { PoolClient, QueryResultRow } from 'pg';
import type {
  EnrollmentDTO,
  OfferingDTO,
  PageQuery,
  Paginated,
  StudentCourseDTO,
} from '@/types/contracts';
import { query } from '@/lib/db/pool';
import { AppError } from '@/lib/db/errors';
import { likePattern, orderClause, pageWindow, totalPages } from './pagination';

/* ================================ offerings =============================== */

type OfferingRow = QueryResultRow & {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  term_id: string;
  academic_year: string;
  term_no: number;
  term_label: string;
  section_code: string;
  faculty_user_id: string;
  faculty_name: string;
  status: OfferingDTO['status'];
  enrolled_count: string;
  capacity: number | null;
};

function mapOffering(row: OfferingRow): OfferingDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    termId: row.term_id,
    academicYear: row.academic_year,
    termNo: row.term_no,
    termLabel: row.term_label,
    sectionCode: row.section_code,
    facultyUserId: row.faculty_user_id,
    facultyName: row.faculty_name,
    status: row.status,
    enrolledCount: Number(row.enrolled_count),
    capacity: row.capacity,
  };
}

const OFFERING_SELECT = `
  SELECT o.id, o.course_id, c.code AS course_code, c.title AS course_title,
         o.term_id, t.academic_year, t.term_no, t.label AS term_label,
         o.section_code, o.faculty_user_id, fu.full_name AS faculty_name,
         o.status, o.capacity,
         (SELECT count(*) FROM enrollment e
           WHERE e.offering_id = o.id AND e.status = 'active') AS enrolled_count
    FROM course_offering o
    JOIN course c        ON c.id = o.course_id
    JOIN academic_term t ON t.id = o.term_id
    JOIN app_user fu     ON fu.id = o.faculty_user_id
`;

const OFFERING_FILTER = `
  WHERE ($1::text IS NULL OR c.code ILIKE $1 OR c.title ILIKE $1 OR fu.full_name ILIKE $1)
    AND ($2::uuid IS NULL OR o.course_id = $2)
    AND ($3::uuid IS NULL OR o.term_id = $3)
    AND ($4::uuid IS NULL OR o.faculty_user_id = $4)
    AND ($5::offering_status IS NULL OR o.status = $5)
    AND ($6::uuid IS NULL OR c.department_id = $6)
`;

export type OfferingListQuery = PageQuery & {
  courseId?: string;
  termId?: string;
  facultyUserId?: string;
  status?: OfferingDTO['status'];
  departmentId?: string;
};

export async function listOfferings(input: OfferingListQuery): Promise<Paginated<OfferingDTO>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const pattern = likePattern(input.q);
  const order = orderClause(
    input.sort,
    input.order,
    {
      courseCode: 'c.code',
      status: 'o.status',
      createdAt: 'o.created_at',
      term: 't.starts_on',
    },
    't.starts_on',
  );
  const filterParams = [
    pattern,
    input.courseId ?? null,
    input.termId ?? null,
    input.facultyUserId ?? null,
    input.status ?? null,
    input.departmentId ?? null,
  ];
  const rows = await query<OfferingRow>(
    `${OFFERING_SELECT} ${OFFERING_FILTER} ORDER BY ${order} LIMIT $7 OFFSET $8`,
    [...filterParams, limit, offset],
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total
       FROM course_offering o
       JOIN course c    ON c.id = o.course_id
       JOIN app_user fu ON fu.id = o.faculty_user_id
     ${OFFERING_FILTER}`,
    filterParams,
  );
  const total = Number(countRows[0]?.total ?? 0);
  return { items: rows.map(mapOffering), page, pageSize, total, totalPages: totalPages(total, pageSize) };
}

export async function getOfferingById(id: string): Promise<OfferingDTO | null> {
  const rows = await query<OfferingRow>(`${OFFERING_SELECT} WHERE o.id = $1`, [id]);
  return rows[0] ? mapOffering(rows[0]) : null;
}

export async function listFacultyOfferings(
  facultyUserId: string,
  input: PageQuery & { status?: OfferingDTO['status'] },
): Promise<Paginated<OfferingDTO>> {
  return listOfferings({ ...input, facultyUserId });
}

export async function listStudentOfferings(studentUserId: string): Promise<StudentCourseDTO[]> {
  return query<StudentCourseDTO>(
    `SELECT o.id            AS "offeringId",
            e.id            AS "enrollmentId",
            c.code          AS "courseCode",
            c.title         AS "courseTitle",
            t.label         AS "termLabel",
            t.academic_year AS "academicYear",
            fu.full_name    AS "facultyName",
            e.status,
            e.enrolled_at::text AS "enrolledAt"
       FROM enrollment e
       JOIN course_offering o ON o.id = e.offering_id
       JOIN course c          ON c.id = o.course_id
       JOIN academic_term t   ON t.id = o.term_id
       JOIN app_user fu       ON fu.id = o.faculty_user_id
      WHERE e.student_user_id = $1
      ORDER BY t.starts_on DESC, c.code`,
    [studentUserId],
  );
}

export async function insertOffering(
  client: PoolClient,
  input: {
    courseId: string;
    termId: string;
    facultyUserId: string;
    sectionCode: string;
    capacity: number | null;
    createdBy: string;
  },
): Promise<string> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO course_offering
       (course_id, term_id, faculty_user_id, section_code, capacity, created_by)
     VALUES (
       $1, $2, $3, upper(btrim($4)), $5, $6
     )
     RETURNING id`,
    [
      input.courseId,
      input.termId,
      input.facultyUserId,
      input.sectionCode || 'A',
      input.capacity,
      input.createdBy,
    ],
  );
  const id = rows.rows[0]?.id;
  if (!id) throw new Error('Offering insert returned no id');
  return id;
}

export async function updateOffering(
  client: PoolClient,
  input: {
    offeringId: string;
    facultyUserId: string | null;
    sectionCode: string | null;
    capacity: number | null;
    status: OfferingDTO['status'] | null;
  },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE course_offering
        SET faculty_user_id = coalesce($2, faculty_user_id),
            section_code = coalesce(upper(btrim($3)), section_code),
            capacity = coalesce($4, capacity),
            status = coalesce($5, status)
      WHERE id = $1`,
    [input.offeringId, input.facultyUserId, input.sectionCode, input.capacity, input.status],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getOfferingStatusForUpdate(
  client: PoolClient,
  offeringId: string,
): Promise<OfferingDTO['status'] | null> {
  const rows = await client.query<{ status: OfferingDTO['status'] }>(
    `SELECT status FROM course_offering WHERE id = $1 FOR UPDATE`,
    [offeringId],
  );
  return rows.rows[0]?.status ?? null;
}

export async function setOfferingStatus(
  client: PoolClient,
  input: { offeringId: string; status: OfferingDTO['status'] },
): Promise<boolean> {
  const result = await client.query(`UPDATE course_offering SET status = $2 WHERE id = $1`, [
    input.offeringId,
    input.status,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function getOfferingStatus(
  offeringId: string,
): Promise<OfferingDTO['status'] | null> {
  const rows = await query<{ status: OfferingDTO['status'] }>(
    'SELECT status FROM course_offering WHERE id = $1',
    [offeringId],
  );
  return rows[0]?.status ?? null;
}

/* =============================== enrollments ============================== */

type EnrollmentRow = QueryResultRow & {
  id: string;
  offering_id: string;
  student_user_id: string;
  student_name: string;
  roll_no: string;
  status: EnrollmentDTO['status'];
  enrolled_at: string;
};

function mapEnrollment(row: EnrollmentRow): EnrollmentDTO {
  return {
    id: row.id,
    offeringId: row.offering_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    rollNo: row.roll_no,
    status: row.status,
    enrolledAt: row.enrolled_at,
  };
}

const ENROLLMENT_SELECT = `
  SELECT e.id, e.offering_id, e.student_user_id,
         u.full_name AS student_name, sp.roll_no, e.status,
         e.enrolled_at::text AS enrolled_at
    FROM enrollment e
    JOIN student_profile sp ON sp.user_id = e.student_user_id
    JOIN app_user u         ON u.id = e.student_user_id
`;

export async function listEnrollments(
  input: PageQuery & { offeringId?: string; studentUserId?: string; status?: EnrollmentDTO['status'] },
): Promise<Paginated<EnrollmentDTO>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const pattern = likePattern(input.q);
  const order = orderClause(
    input.sort,
    input.order,
    {
      studentName: 'u.full_name',
      rollNo: 'sp.roll_no',
      status: 'e.status',
      enrolledAt: 'e.enrolled_at',
    },
    'u.full_name',
  );
  const filterParams = [
    pattern,
    input.offeringId ?? null,
    input.studentUserId ?? null,
    input.status ?? null,
  ];
  const where = `
    WHERE ($1::text IS NULL OR u.full_name ILIKE $1 OR sp.roll_no ILIKE $1)
      AND ($2::uuid IS NULL OR e.offering_id = $2)
      AND ($3::uuid IS NULL OR e.student_user_id = $3)
      AND ($4::enrollment_status IS NULL OR e.status = $4)
  `;
  const rows = await query<EnrollmentRow>(
    `${ENROLLMENT_SELECT} ${where} ORDER BY ${order} LIMIT $5 OFFSET $6`,
    [...filterParams, limit, offset],
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total
       FROM enrollment e
       JOIN student_profile sp ON sp.user_id = e.student_user_id
       JOIN app_user u ON u.id = e.student_user_id
     ${where}`,
    filterParams,
  );
  const total = Number(countRows[0]?.total ?? 0);
  return { items: rows.map(mapEnrollment), page, pageSize, total, totalPages: totalPages(total, pageSize) };
}

export async function getOfferingRoster(
  offeringId: string,
  options: { includeInactive?: boolean } = {},
): Promise<EnrollmentDTO[]> {
  const includeInactive = options.includeInactive ?? false;
  const rows = await query<EnrollmentRow>(
    `${ENROLLMENT_SELECT}
      WHERE e.offering_id = $1
        AND ($2::boolean = true OR e.status = 'active')
      ORDER BY u.full_name`,
    [offeringId, includeInactive],
  );
  return rows.map(mapEnrollment);
}

/**
 * Enrolls a student, reactivating a previously dropped row. Locks the offering
 * row so the capacity check cannot race (§13.4).
 */
export async function enrollStudentTx(
  client: PoolClient,
  input: { offeringId: string; studentUserId: string; createdBy: string },
): Promise<{ enrollmentId: string; reactivated: boolean }> {
  const offeringRows = await client.query<{ status: OfferingDTO['status']; capacity: number | null }>(
    `SELECT status, capacity FROM course_offering WHERE id = $1 FOR UPDATE`,
    [input.offeringId],
  );
  const offering = offeringRows.rows[0];
  if (!offering) throw new AppError('NOT_FOUND', 'The offering was not found.');
  if (offering.status !== 'active') {
    throw new AppError('CONFLICT', 'Students can only be enrolled in an active offering.');
  }

  const existingRows = await client.query<{ id: string; status: EnrollmentDTO['status'] }>(
    `SELECT id, status FROM enrollment
      WHERE offering_id = $1 AND student_user_id = $2
      FOR UPDATE`,
    [input.offeringId, input.studentUserId],
  );
  const existing = existingRows.rows[0];

  if (existing && existing.status !== 'dropped') {
    throw new AppError('CONFLICT', 'This student is already enrolled in the offering.', {
      fieldErrors: { studentUserId: ['Already enrolled.'] },
    });
  }

  if (!existing && offering.capacity !== null) {
    const countRows = await client.query<{ active: string }>(
      `SELECT count(*) AS active FROM enrollment
        WHERE offering_id = $1 AND status = 'active'`,
      [input.offeringId],
    );
    const active = Number(countRows.rows[0]?.active ?? 0);
    if (active >= offering.capacity) {
      throw new AppError('CONFLICT', 'The offering has reached its capacity.');
    }
  }

  if (existing) {
    const updated = await client.query<{ id: string }>(
      `UPDATE enrollment
          SET status = 'active', dropped_at = NULL,
              enrolled_at = now(), status_changed_at = now(),
              created_by = $3
        WHERE id = $1 AND offering_id = $2
        RETURNING id`,
      [existing.id, input.offeringId, input.createdBy],
    );
    const enrollmentId = updated.rows[0]?.id;
    if (!enrollmentId) throw new AppError('INTERNAL');
    return { enrollmentId, reactivated: true };
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO enrollment (offering_id, student_user_id, created_by)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.offeringId, input.studentUserId, input.createdBy],
  );
  const enrollmentId = inserted.rows[0]?.id;
  if (!enrollmentId) throw new AppError('INTERNAL');
  return { enrollmentId, reactivated: false };
}

export async function getEnrollmentStatusForUpdate(
  client: PoolClient,
  enrollmentId: string,
): Promise<EnrollmentDTO['status'] | null> {
  const rows = await client.query<{ status: EnrollmentDTO['status'] }>(
    `SELECT status FROM enrollment WHERE id = $1 FOR UPDATE`,
    [enrollmentId],
  );
  return rows.rows[0]?.status ?? null;
}

export async function setEnrollmentStatus(
  client: PoolClient,
  input: { enrollmentId: string; status: EnrollmentDTO['status'] },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE enrollment
        SET status = $2,
            status_changed_at = now(),
            dropped_at = CASE WHEN $2 = 'dropped' THEN now() ELSE NULL END
      WHERE id = $1`,
    [input.enrollmentId, input.status],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getEnrollmentById(id: string): Promise<EnrollmentDTO | null> {
  const rows = await query<EnrollmentRow>(`${ENROLLMENT_SELECT} WHERE e.id = $1`, [id]);
  return rows[0] ? mapEnrollment(rows[0]) : null;
}

export async function getEnrollmentForStudent(
  offeringId: string,
  studentUserId: string,
): Promise<{ enrollmentId: string; status: EnrollmentDTO['status'] } | null> {
  const rows = await query<{ id: string; status: EnrollmentDTO['status'] }>(
    `SELECT id, status FROM enrollment
      WHERE offering_id = $1 AND student_user_id = $2`,
    [offeringId, studentUserId],
  );
  const row = rows[0];
  return row ? { enrollmentId: row.id, status: row.status } : null;
}
