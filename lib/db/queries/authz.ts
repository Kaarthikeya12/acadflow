import 'server-only';
import type { QueryResultRow } from 'pg';
import { query } from '@/lib/db/pool';

/** Canonical ownership predicates (§8.5). Parameterized; no string interpolation. */

export type OfferingAccessContext = {
  offeringId: string;
  facultyUserId: string;
  courseCode: string;
  courseTitle: string;
  termLabel: string;
};

type OfferingRow = QueryResultRow & {
  offering_id: string;
  faculty_user_id: string;
  course_code: string;
  course_title: string;
  term_label: string;
};

export async function getOfferingAccessContext(
  offeringId: string,
): Promise<OfferingAccessContext | null> {
  const rows = await query<OfferingRow>(
    `SELECT o.id AS offering_id, o.faculty_user_id, c.code AS course_code,
            c.title AS course_title, t.label AS term_label
       FROM course_offering o
       JOIN course c ON c.id = o.course_id
       JOIN academic_term t ON t.id = o.term_id
      WHERE o.id = $1`,
    [offeringId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    offeringId: row.offering_id,
    facultyUserId: row.faculty_user_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    termLabel: row.term_label,
  };
}

export async function facultyOwnsOffering(
  offeringId: string,
  facultyUserId: string,
): Promise<boolean> {
  const rows = await query<QueryResultRow>(
    `SELECT 1 FROM course_offering o WHERE o.id = $1 AND o.faculty_user_id = $2`,
    [offeringId, facultyUserId],
  );
  return rows.length > 0;
}

export async function studentHasEnrollment(
  offeringId: string,
  studentUserId: string,
  options: { activeOnly?: boolean } = {},
): Promise<boolean> {
  const activeOnly = options.activeOnly ?? true;
  const rows = await query<QueryResultRow>(
    `SELECT 1 FROM enrollment e
      WHERE e.offering_id = $1 AND e.student_user_id = $2
        AND ($3::boolean = false OR e.status = 'active')`,
    [offeringId, studentUserId, activeOnly],
  );
  return rows.length > 0;
}

export type AssignmentAccessContext = {
  assignmentId: string;
  offeringId: string;
  facultyUserId: string;
  status: 'draft' | 'published' | 'closed';
  title: string;
};

type AssignmentRow = QueryResultRow & {
  assignment_id: string;
  offering_id: string;
  faculty_user_id: string;
  status: 'draft' | 'published' | 'closed';
  title: string;
};

export async function getAssignmentAccessContext(
  assignmentId: string,
): Promise<AssignmentAccessContext | null> {
  const rows = await query<AssignmentRow>(
    `SELECT a.id AS assignment_id, a.offering_id, o.faculty_user_id, a.status, a.title
       FROM assignment a
       JOIN course_offering o ON o.id = a.offering_id
      WHERE a.id = $1`,
    [assignmentId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    assignmentId: row.assignment_id,
    offeringId: row.offering_id,
    facultyUserId: row.faculty_user_id,
    status: row.status,
    title: row.title,
  };
}

/** Student may access a published assignment only through an active enrollment. */
export async function studentMayAccessAssignment(
  assignmentId: string,
  studentUserId: string,
): Promise<boolean> {
  const rows = await query<QueryResultRow>(
    `SELECT 1
       FROM assignment a
       JOIN enrollment e ON e.offering_id = a.offering_id
      WHERE a.id = $1
        AND e.student_user_id = $2
        AND e.status = 'active'
        AND a.status = 'published'`,
    [assignmentId, studentUserId],
  );
  return rows.length > 0;
}

export type SubmissionAccessContext = {
  submissionId: string;
  offeringId: string;
  facultyUserId: string;
  studentUserId: string;
  assignmentId: string;
};

type SubmissionRow = QueryResultRow & {
  submission_id: string;
  offering_id: string;
  faculty_user_id: string;
  student_user_id: string;
  assignment_id: string;
};

export async function getSubmissionAccessContext(
  submissionId: string,
): Promise<SubmissionAccessContext | null> {
  const rows = await query<SubmissionRow>(
    `SELECT s.id AS submission_id, s.offering_id, o.faculty_user_id,
            e.student_user_id, s.assignment_id
       FROM submission s
       JOIN course_offering o ON o.id = s.offering_id
       JOIN enrollment e ON e.id = s.enrollment_id
      WHERE s.id = $1`,
    [submissionId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    submissionId: row.submission_id,
    offeringId: row.offering_id,
    facultyUserId: row.faculty_user_id,
    studentUserId: row.student_user_id,
    assignmentId: row.assignment_id,
  };
}

export type FileAccessContext = {
  fileId: string;
  submissionId: string;
  offeringId: string;
  facultyUserId: string;
  studentUserId: string;
};

export async function getFileAccessContext(fileId: string): Promise<FileAccessContext | null> {
  const rows = await query<QueryResultRow & {
    file_id: string;
    submission_id: string;
    offering_id: string;
    faculty_user_id: string;
    student_user_id: string;
  }>(
    `SELECT f.id AS file_id, s.id AS submission_id, s.offering_id,
            o.faculty_user_id, e.student_user_id
       FROM stored_file f
       JOIN submission s ON s.file_id = f.id
       JOIN course_offering o ON o.id = s.offering_id
       JOIN enrollment e ON e.id = s.enrollment_id
      WHERE f.id = $1`,
    [fileId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    fileId: row.file_id,
    submissionId: row.submission_id,
    offeringId: row.offering_id,
    facultyUserId: row.faculty_user_id,
    studentUserId: row.student_user_id,
  };
}

export type SessionAccessContext = {
  sessionId: string;
  offeringId: string;
  facultyUserId: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

export async function getSessionAccessContext(
  sessionId: string,
): Promise<SessionAccessContext | null> {
  const rows = await query<QueryResultRow & {
    session_id: string;
    offering_id: string;
    faculty_user_id: string;
    status: 'scheduled' | 'completed' | 'cancelled';
  }>(
    `SELECT cs.id AS session_id, cs.offering_id, o.faculty_user_id, cs.status
       FROM class_session cs
       JOIN course_offering o ON o.id = cs.offering_id
      WHERE cs.id = $1`,
    [sessionId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    sessionId: row.session_id,
    offeringId: row.offering_id,
    facultyUserId: row.faculty_user_id,
    status: row.status,
  };
}

export async function enrollmentBelongsToOffering(
  enrollmentId: string,
  offeringId: string,
): Promise<boolean> {
  const rows = await query<QueryResultRow>(
    `SELECT 1 FROM enrollment e WHERE e.id = $1 AND e.offering_id = $2`,
    [enrollmentId, offeringId],
  );
  return rows.length > 0;
}
