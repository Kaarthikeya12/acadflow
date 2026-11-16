import 'server-only';
import type { ActionErrorCode } from '@/types/contracts';

/** HTTP status per contract §9.1. Server Actions reuse the code without a status. */
export const ERROR_HTTP_STATUS: Record<ActionErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  POLICY_NOT_CONFIGURED: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export const DEFAULT_ERROR_MESSAGES: Record<ActionErrorCode, string> = {
  BAD_REQUEST: 'The request could not be read.',
  UNAUTHENTICATED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested record was not found.',
  CONFLICT: 'This action conflicts with existing data.',
  POLICY_NOT_CONFIGURED:
    'This value cannot be calculated until the academic policy is configured.',
  PAYLOAD_TOO_LARGE: 'The uploaded file is too large.',
  UNSUPPORTED_MEDIA_TYPE: 'This file type is not allowed.',
  VALIDATION_ERROR: 'Check the highlighted fields.',
  RATE_LIMITED: 'Too many attempts. Try again later.',
  INTERNAL: 'Something went wrong. Please try again.',
};

export class AppError extends Error {
  readonly code: ActionErrorCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requestId?: string;

  constructor(
    code: ActionErrorCode,
    message?: string,
    options?: { fieldErrors?: Record<string, string[]>; requestId?: string; cause?: unknown },
  ) {
    super(message ?? DEFAULT_ERROR_MESSAGES[code], { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.requestId = options?.requestId;
  }
}

type PgErrorLike = {
  code?: unknown;
  constraint?: unknown;
  message?: unknown;
  detail?: unknown;
};

/** Constraint name -> form field, per §9.2. */
const CONSTRAINT_FIELD_MAP: Record<string, string> = {
  app_user_email_key: 'email',
  department_code_key: 'code',
  department_name_key: 'name',
  course_code_key: 'code',
  faculty_profile_employee_no_key: 'employeeNo',
  student_profile_roll_no_key: 'rollNo',
  enrollment_offering_student_key: 'studentUserId',
  attendance_session_enrollment_key: 'entries',
  submission_assignment_enrollment_key: 'assignmentId',
  submission_file_unique: 'fileId',
  course_offering_course_term_section_key: 'sectionCode',
  academic_term_year_term_key: 'termNo',
  academic_term_current_key: 'isCurrent',
  grade_policy_name_version_key: 'version',
  stored_file_storage_key_unique: 'fileId',
};

const CONSTRAINT_MESSAGE_MAP: Record<string, string> = {
  app_user_email_key: 'This email address is already in use.',
  department_code_key: 'A department with this code already exists.',
  department_name_key: 'A department with this name already exists.',
  course_code_key: 'A course with this code already exists.',
  faculty_profile_employee_no_key: 'This employee number is already in use.',
  student_profile_roll_no_key: 'This roll number is already in use.',
  enrollment_offering_student_key: 'This student is already enrolled in the offering.',
  attendance_session_enrollment_key: 'Attendance for this student is already recorded.',
  submission_assignment_enrollment_key: 'A submission already exists for this assignment.',
  submission_file_unique: 'This file is already attached to another submission.',
  course_offering_course_term_section_key:
    'An offering for this course, term, and section already exists.',
  academic_term_year_term_key: 'This term already exists for the academic year.',
  academic_term_current_key: 'Another term is already current.',
  grade_policy_name_version_key: 'This policy name and version already exists.',
  stored_file_storage_key_unique: 'A file with this storage key already exists.',
};

function isPgErrorLike(error: unknown): error is PgErrorLike {
  return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Translates PostgreSQL failures into typed, safe application errors.
 * Raw SQL text and driver messages never reach the caller.
 */
export function mapPgError(error: unknown, requestId?: string): AppError {
  if (error instanceof AppError) return error;

  if (!isPgErrorLike(error)) {
    return new AppError('INTERNAL', undefined, { cause: error, requestId });
  }

  const sqlState = typeof error.code === 'string' ? error.code : '';
  const constraint = typeof error.constraint === 'string' ? error.constraint : '';
  const rawMessage = typeof error.message === 'string' ? error.message : '';
  const field = CONSTRAINT_FIELD_MAP[constraint];

  switch (sqlState) {
    case '23505': {
      return new AppError('CONFLICT', CONSTRAINT_MESSAGE_MAP[constraint], {
        fieldErrors: field ? { [field]: ['Already in use.'] } : undefined,
        cause: error,
        requestId,
      });
    }
    case '23503': {
      const referencedInUse = /still referenced/i.test(rawMessage);
      return new AppError(referencedInUse ? 'CONFLICT' : 'VALIDATION_ERROR', undefined, {
        cause: error,
        requestId,
      });
    }
    case '23514':
    case '23502':
    case '22P02':
    case '22003':
    case '22007':
    case '22023': {
      // Constraint messages are authored by this project, so they are safe to show.
      const safe = /^[A-Za-z0-9 ,.:%()/-]{1,200}$/.test(rawMessage) ? rawMessage : undefined;
      return new AppError('VALIDATION_ERROR', safe, {
        fieldErrors: field ? { [field]: [safe ?? 'Invalid value.'] } : undefined,
        cause: error,
        requestId,
      });
    }
    case '40001':
      return new AppError('CONFLICT', 'The record changed concurrently. Please retry.', {
        cause: error,
        requestId,
      });
    case '40P01':
      return new AppError('INTERNAL', undefined, { cause: error, requestId });
    case '42501':
      return new AppError('INTERNAL', undefined, { cause: error, requestId });
    case 'P0001': {
      if (rawMessage.startsWith('POLICY_NOT_CONFIGURED')) {
        return new AppError('POLICY_NOT_CONFIGURED', rawMessage.replace(/^POLICY_NOT_CONFIGURED:\s*/, ''), {
          cause: error,
          requestId,
        });
      }
      const safe = rawMessage.slice(0, 200);
      return new AppError('VALIDATION_ERROR', safe || undefined, { cause: error, requestId });
    }
    default:
      return new AppError('INTERNAL', undefined, { cause: error, requestId });
  }
}

export function isRetryablePgError(error: unknown): boolean {
  if (!isPgErrorLike(error)) return false;
  return error.code === '40001' || error.code === '40P01';
}
