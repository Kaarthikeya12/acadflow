import 'server-only';
import type { PoolClient, QueryResultRow } from 'pg';
import type {
  CourseDTO,
  DepartmentDTO,
  PageQuery,
  Paginated,
  Role,
  TermDTO,
  UserDTO,
} from '@/types/contracts';
import { query } from '@/lib/db/pool';
import { likePattern, orderClause, pageWindow, totalPages } from './pagination';

/* ================================ departments ============================== */

type DepartmentRow = QueryResultRow & {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  course_count: string;
  faculty_count: string;
  student_count: string;
};

function mapDepartment(row: DepartmentRow): DepartmentDTO {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    courseCount: Number(row.course_count),
    facultyCount: Number(row.faculty_count),
    studentCount: Number(row.student_count),
  };
}

const DEPARTMENT_SELECT = `
  SELECT d.id, d.code, d.name, d.is_active,
         (SELECT count(*) FROM course c WHERE c.department_id = d.id)          AS course_count,
         (SELECT count(*) FROM faculty_profile f WHERE f.department_id = d.id) AS faculty_count,
         (SELECT count(*) FROM student_profile s WHERE s.department_id = d.id) AS student_count
    FROM department d
`;

export async function listDepartments(input: PageQuery): Promise<Paginated<DepartmentDTO>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const pattern = likePattern(input.q);
  const order = orderClause(
    input.sort,
    input.order,
    { code: 'd.code', name: 'd.name', createdAt: 'd.created_at' },
    'd.code',
  );
  const params = [pattern, limit, offset];
  const rows = await query<DepartmentRow>(
    `${DEPARTMENT_SELECT}
      WHERE ($1::text IS NULL OR d.code ILIKE $1 OR d.name ILIKE $1)
      ORDER BY ${order}
      LIMIT $2 OFFSET $3`,
    params,
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total FROM department d
      WHERE ($1::text IS NULL OR d.code ILIKE $1 OR d.name ILIKE $1)`,
    [pattern],
  );
  const total = Number(countRows[0]?.total ?? 0);
  return { items: rows.map(mapDepartment), page, pageSize, total, totalPages: totalPages(total, pageSize) };
}

export async function getDepartmentById(id: string): Promise<DepartmentDTO | null> {
  const rows = await query<DepartmentRow>(`${DEPARTMENT_SELECT} WHERE d.id = $1`, [id]);
  return rows[0] ? mapDepartment(rows[0]) : null;
}

export async function listActiveDepartments(): Promise<{ id: string; code: string; name: string }[]> {
  return query<{ id: string; code: string; name: string }>(
    `SELECT id, code, name FROM department WHERE is_active ORDER BY code`,
  );
}

export async function insertDepartment(
  client: PoolClient,
  input: { code: string; name: string },
): Promise<string> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO department (code, name) VALUES (upper(btrim($1)), btrim($2)) RETURNING id`,
    [input.code, input.name],
  );
  const id = rows.rows[0]?.id;
  if (!id) throw new Error('Department insert returned no id');
  return id;
}

export async function updateDepartment(
  client: PoolClient,
  input: { id: string; code: string; name: string },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE department SET code = upper(btrim($2)), name = btrim($3) WHERE id = $1`,
    [input.id, input.code, input.name],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setDepartmentActive(
  client: PoolClient,
  input: { id: string; isActive: boolean },
): Promise<boolean> {
  const result = await client.query(`UPDATE department SET is_active = $2 WHERE id = $1`, [
    input.id,
    input.isActive,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/* ================================== courses =============================== */

type CourseRow = QueryResultRow & {
  id: string;
  code: string;
  title: string;
  credits: string;
  department_id: string;
  department_name: string;
  description: string | null;
  is_active: boolean;
  offering_count: string;
};

function mapCourse(row: CourseRow): CourseDTO {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    credits: row.credits,
    departmentId: row.department_id,
    departmentName: row.department_name,
    description: row.description,
    isActive: row.is_active,
    offeringCount: Number(row.offering_count),
  };
}

const COURSE_SELECT = `
  SELECT c.id, c.code, c.title, c.credits, c.department_id,
         d.name AS department_name, c.description, c.is_active,
         (SELECT count(*) FROM course_offering o WHERE o.course_id = c.id) AS offering_count
    FROM course c
    JOIN department d ON d.id = c.department_id
`;

export async function listCourses(
  input: PageQuery & { departmentId?: string; isActive?: boolean },
): Promise<Paginated<CourseDTO>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const pattern = likePattern(input.q);
  const order = orderClause(
    input.sort,
    input.order,
    { code: 'c.code', title: 'c.title', credits: 'c.credits', createdAt: 'c.created_at' },
    'c.code',
  );
  const where = `
    WHERE ($1::text IS NULL OR c.code ILIKE $1 OR c.title ILIKE $1)
      AND ($2::uuid IS NULL OR c.department_id = $2)
      AND ($3::boolean IS NULL OR c.is_active = $3)
  `;
  const filterParams = [pattern, input.departmentId ?? null, input.isActive ?? null];
  const rows = await query<CourseRow>(
    `${COURSE_SELECT} ${where} ORDER BY ${order} LIMIT $4 OFFSET $5`,
    [...filterParams, limit, offset],
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total FROM course c ${where}`,
    filterParams,
  );
  const total = Number(countRows[0]?.total ?? 0);
  return { items: rows.map(mapCourse), page, pageSize, total, totalPages: totalPages(total, pageSize) };
}

export async function getCourseById(id: string): Promise<CourseDTO | null> {
  const rows = await query<CourseRow>(`${COURSE_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ? mapCourse(rows[0]) : null;
}

export async function listCourseOptions(): Promise<
  { id: string; code: string; title: string; departmentId: string }[]
> {
  return query(
    `SELECT id, code, title, department_id AS "departmentId"
       FROM course WHERE is_active ORDER BY code`,
  );
}

export async function insertCourse(
  client: PoolClient,
  input: {
    departmentId: string;
    code: string;
    title: string;
    credits: string;
    description?: string | null;
  },
): Promise<string> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO course (department_id, code, title, credits, description)
     VALUES ($1, upper(btrim($2)), btrim($3), $4::numeric, $5)
     RETURNING id`,
    [input.departmentId, input.code, input.title, input.credits, input.description ?? null],
  );
  const id = rows.rows[0]?.id;
  if (!id) throw new Error('Course insert returned no id');
  return id;
}

export async function updateCourse(
  client: PoolClient,
  input: {
    id: string;
    departmentId: string;
    code: string;
    title: string;
    credits: string;
    description?: string | null;
  },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE course
        SET department_id = $2, code = upper(btrim($3)), title = btrim($4),
            credits = $5::numeric, description = $6
      WHERE id = $1`,
    [input.id, input.departmentId, input.code, input.title, input.credits, input.description ?? null],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setCourseActive(
  client: PoolClient,
  input: { id: string; isActive: boolean },
): Promise<boolean> {
  const result = await client.query(`UPDATE course SET is_active = $2 WHERE id = $1`, [
    input.id,
    input.isActive,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/* ================================== terms ================================= */

type TermRow = QueryResultRow & {
  id: string;
  academic_year: string;
  term_no: number;
  label: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
};

function mapTerm(row: TermRow): TermDTO {
  return {
    id: row.id,
    academicYear: row.academic_year,
    termNo: row.term_no,
    label: row.label,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    isCurrent: row.is_current,
  };
}

const TERM_SELECT = `
  SELECT t.id, t.academic_year, t.term_no, t.label,
         t.starts_on::text AS starts_on, t.ends_on::text AS ends_on, t.is_current
    FROM academic_term t
`;

export async function listTerms(): Promise<TermDTO[]> {
  const rows = await query<TermRow>(
    `${TERM_SELECT} ORDER BY t.academic_year DESC, t.term_no ASC`,
  );
  return rows.map(mapTerm);
}

export async function getCurrentTerm(): Promise<TermDTO | null> {
  const rows = await query<TermRow>(`${TERM_SELECT} WHERE t.is_current LIMIT 1`);
  return rows[0] ? mapTerm(rows[0]) : null;
}

export async function getTermById(id: string): Promise<TermDTO | null> {
  const rows = await query<TermRow>(`${TERM_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] ? mapTerm(rows[0]) : null;
}

export async function clearCurrentTerm(client: PoolClient): Promise<void> {
  await client.query(`UPDATE academic_term SET is_current = false WHERE is_current`);
}

export async function insertTerm(
  client: PoolClient,
  input: {
    academicYear: string;
    termNo: number;
    label: string;
    startsOn: string;
    endsOn: string;
    isCurrent: boolean;
  },
): Promise<string> {
  const rows = await client.query<{ id: string }>(
    `INSERT INTO academic_term (academic_year, term_no, label, starts_on, ends_on, is_current)
     VALUES ($1, $2, btrim($3), $4::date, $5::date, $6)
     RETURNING id`,
    [input.academicYear, input.termNo, input.label, input.startsOn, input.endsOn, input.isCurrent],
  );
  const id = rows.rows[0]?.id;
  if (!id) throw new Error('Term insert returned no id');
  return id;
}

export async function updateTerm(
  client: PoolClient,
  input: {
    id: string;
    academicYear: string;
    termNo: number;
    label: string;
    startsOn: string;
    endsOn: string;
  },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE academic_term
        SET academic_year = $2, term_no = $3, label = btrim($4),
            starts_on = $5::date, ends_on = $6::date
      WHERE id = $1`,
    [input.id, input.academicYear, input.termNo, input.label, input.startsOn, input.endsOn],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setCurrentTerm(
  client: PoolClient,
  id: string,
): Promise<boolean> {
  await clearCurrentTerm(client);
  const result = await client.query(`UPDATE academic_term SET is_current = true WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

/* ================================== users ================================= */

type UserRow = QueryResultRow & {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  department_id: string | null;
  department_name: string | null;
  employee_no: string | null;
  designation: string | null;
  roll_no: string | null;
  program: string | null;
  batch: string | null;
  admission_year: number | null;
};

function mapUser(row: UserRow): UserDTO {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    departmentId: row.department_id,
    departmentName: row.department_name,
    employeeNo: row.employee_no,
    designation: row.designation,
    rollNo: row.roll_no,
    program: row.program,
    batch: row.batch,
    admissionYear: row.admission_year,
  };
}

const USER_SELECT = `
  SELECT u.id, u.email, u.full_name, u.role, u.is_active,
         coalesce(fp.department_id, sp.department_id) AS department_id,
         d.name AS department_name,
         fp.employee_no, fp.designation,
         sp.roll_no, sp.program, sp.batch, sp.admission_year
    FROM app_user u
    LEFT JOIN faculty_profile fp ON fp.user_id = u.id
    LEFT JOIN student_profile sp ON sp.user_id = u.id
    LEFT JOIN department d ON d.id = coalesce(fp.department_id, sp.department_id)
`;

const USER_FILTER = `
  WHERE ($1::text IS NULL OR u.full_name ILIKE $1 OR u.email ILIKE $1
         OR fp.employee_no ILIKE $1 OR sp.roll_no ILIKE $1)
    AND ($2::user_role IS NULL OR u.role = $2)
    AND ($3::uuid IS NULL OR coalesce(fp.department_id, sp.department_id) = $3)
    AND ($4::boolean IS NULL OR u.is_active = $4)
`;

export async function listUsers(
  input: PageQuery & { role?: Role; departmentId?: string; isActive?: boolean },
): Promise<Paginated<UserDTO>> {
  const { page, pageSize, limit, offset } = pageWindow(input);
  const pattern = likePattern(input.q);
  const order = orderClause(
    input.sort,
    input.order,
    { fullName: 'u.full_name', email: 'u.email', role: 'u.role', createdAt: 'u.created_at' },
    'u.full_name',
  );
  const filterParams = [
    pattern,
    input.role ?? null,
    input.departmentId ?? null,
    input.isActive ?? null,
  ];
  const rows = await query<UserRow>(
    `${USER_SELECT} ${USER_FILTER} ORDER BY ${order} LIMIT $5 OFFSET $6`,
    [...filterParams, limit, offset],
  );
  const countRows = await query<{ total: string }>(
    `SELECT count(*) AS total
       FROM app_user u
       LEFT JOIN faculty_profile fp ON fp.user_id = u.id
       LEFT JOIN student_profile sp ON sp.user_id = u.id
     ${USER_FILTER}`,
    filterParams,
  );
  const total = Number(countRows[0]?.total ?? 0);
  return { items: rows.map(mapUser), page, pageSize, total, totalPages: totalPages(total, pageSize) };
}

export async function getUserById(id: string): Promise<UserDTO | null> {
  const rows = await query<UserRow>(`${USER_SELECT} WHERE u.id = $1`, [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export type CreateUserInput = {
  /** Optional pre-generated id, used by self-registration for transaction context. */
  id?: string;
  role: Role;
  email: string;
  fullName: string;
  passwordHash: string;
  departmentId?: string | null;
  employeeNo?: string | null;
  designation?: string | null;
  rollNo?: string | null;
  admissionYear?: number | null;
  program?: string | null;
  batch?: string | null;
};

export async function insertUser(client: PoolClient, input: CreateUserInput): Promise<string> {
  const userRows = await client.query<{ id: string }>(
    input.id
      ? `INSERT INTO app_user (id, email, password_hash, full_name, role)
         VALUES ($5::uuid, lower(btrim($1)), $2, btrim($3), $4)
         RETURNING id`
      : `INSERT INTO app_user (email, password_hash, full_name, role)
         VALUES (lower(btrim($1)), $2, btrim($3), $4)
         RETURNING id`,
    input.id
      ? [input.email, input.passwordHash, input.fullName, input.role, input.id]
      : [input.email, input.passwordHash, input.fullName, input.role],
  );
  const userId = userRows.rows[0]?.id;
  if (!userId) throw new Error('User insert returned no id');

  if (input.role === 'faculty') {
    await client.query(
      `INSERT INTO faculty_profile (user_id, department_id, employee_no, designation)
       VALUES ($1, $2, upper(btrim($3)), $4)`,
      [userId, input.departmentId, input.employeeNo, input.designation ?? null],
    );
  } else if (input.role === 'student') {
    await client.query(
      `INSERT INTO student_profile
         (user_id, department_id, roll_no, admission_year, program, batch)
       VALUES ($1, $2, upper(btrim($3)), $4, btrim($5), $6)`,
      [
        userId,
        input.departmentId,
        input.rollNo,
        input.admissionYear,
        input.program,
        input.batch ?? null,
      ],
    );
  }

  return userId;
}

export type UpdateUserInput = {
  userId: string;
  email: string;
  fullName: string;
  departmentId?: string | null;
  employeeNo?: string | null;
  designation?: string | null;
  rollNo?: string | null;
  admissionYear?: number | null;
  program?: string | null;
  batch?: string | null;
};

/** Returns the affected user's role so the action can report a coherent result. */
export async function updateUser(
  client: PoolClient,
  input: UpdateUserInput,
): Promise<Role | null> {
  const rows = await client.query<{ role: Role }>(
    `UPDATE app_user
        SET email = lower(btrim($2)),
            full_name = btrim($3),
            session_version = session_version
              + CASE WHEN email IS DISTINCT FROM lower(btrim($2)) THEN 1 ELSE 0 END
      WHERE id = $1
      RETURNING role`,
    [input.userId, input.email, input.fullName],
  );
  const role = rows.rows[0]?.role;
  if (!role) return null;

  if (role === 'faculty') {
    await client.query(
      `UPDATE faculty_profile
          SET department_id = $2, employee_no = upper(btrim($3)), designation = $4
        WHERE user_id = $1`,
      [input.userId, input.departmentId, input.employeeNo, input.designation ?? null],
    );
  } else if (role === 'student') {
    await client.query(
      `UPDATE student_profile
          SET department_id = $2, roll_no = upper(btrim($3)),
              admission_year = $4, program = btrim($5), batch = $6
        WHERE user_id = $1`,
      [
        input.userId,
        input.departmentId,
        input.rollNo,
        input.admissionYear,
        input.program,
        input.batch ?? null,
      ],
    );
  }

  return role;
}

export async function setUserActive(
  client: PoolClient,
  input: { userId: string; isActive: boolean },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE app_user
        SET is_active = $2,
            session_version = session_version
              + CASE WHEN is_active IS DISTINCT FROM $2 THEN 1 ELSE 0 END
      WHERE id = $1`,
    [input.userId, input.isActive],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setUserPasswordHash(
  client: PoolClient,
  input: { userId: string; passwordHash: string },
): Promise<boolean> {
  const result = await client.query(
    `UPDATE app_user
        SET password_hash = $2, session_version = session_version + 1
      WHERE id = $1`,
    [input.userId, input.passwordHash],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function userExists(id: string): Promise<boolean> {
  const rows = await query('SELECT 1 FROM app_user WHERE id = $1', [id]);
  return rows.length > 0;
}
