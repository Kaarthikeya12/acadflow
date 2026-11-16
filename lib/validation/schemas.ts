import { z } from 'zod';

export const uuidSchema = z.string().uuid('Enter a valid identifier.');
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');
export const localDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Use YYYY-MM-DDTHH:mm.');

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(200, 'Password is too long.');

export const fullNameSchema = z.string().trim().min(1, 'Name is required.').max(200);
export const codeSchema = z
  .string()
  .trim()
  .min(1, 'Code is required.')
  .max(30)
  .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, digits, dots, dashes or underscores.');

/** Decimal string with bounded integer/fraction digits. Never a JS float. */
export function decimalSchema(integerDigits: number, fractionDigits: number) {
  const pattern = new RegExp(`^\\d{1,${integerDigits}}(\\.\\d{1,${fractionDigits}})?$`);
  return z.string().trim().regex(pattern, 'Enter a valid decimal number.');
}

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.string().trim().max(40).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

/* -------------------------------- auth ---------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(200),
});

/**
 * Public student self-registration. Faculty and administrator accounts remain
 * institution-provisioned through the admin workspace.
 */
export const registerStudentSchema = z
  .object({
    email: emailSchema,
    fullName: fullNameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    departmentId: uuidSchema,
    rollNo: z.string().trim().min(1, 'Roll number is required.').max(40),
    admissionYear: z.coerce
      .number()
      .int()
      .min(1900, 'Enter a valid admission year.')
      .max(2200, 'Enter a valid admission year.'),
    program: z.string().trim().min(1, 'Program is required.').max(120),
    batch: z.string().trim().max(40).optional().nullable(),
    termsAccepted: z.boolean().refine((value) => value, {
      message: 'Please accept the institutional terms of use.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

/* ----------------------------- master data ------------------------------- */

export const createDepartmentSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, 'Name is required.').max(200),
});

export const updateDepartmentSchema = createDepartmentSchema.extend({ id: uuidSchema });

export const setActiveSchema = z.object({ id: uuidSchema, isActive: z.boolean() });

export const createCourseSchema = z.object({
  departmentId: uuidSchema,
  code: codeSchema,
  title: z.string().trim().min(1, 'Title is required.').max(300),
  credits: decimalSchema(2, 1),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateCourseSchema = createCourseSchema.extend({ id: uuidSchema });

export const createTermSchema = z.object({
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-YY.'),
  termNo: z.coerce.number().int().min(1).max(3),
  label: z.string().trim().min(1).max(80),
  startsOn: isoDateSchema,
  endsOn: isoDateSchema,
  isCurrent: z.boolean().optional(),
});

export const updateTermSchema = createTermSchema.omit({ isCurrent: true }).extend({ id: uuidSchema });

export const setCurrentTermSchema = z.object({ id: uuidSchema });

const baseUserFields = {
  email: emailSchema,
  fullName: fullNameSchema,
};

const facultyFields = {
  departmentId: uuidSchema,
  employeeNo: z.string().trim().min(1, 'Employee number is required.').max(40),
  designation: z.string().trim().max(120).optional().nullable(),
};

const studentFields = {
  departmentId: uuidSchema,
  rollNo: z.string().trim().min(1, 'Roll number is required.').max(40),
  admissionYear: z.coerce.number().int().min(1900).max(2200),
  program: z.string().trim().min(1, 'Program is required.').max(120),
  batch: z.string().trim().max(40).optional().nullable(),
};

export const createAdminSchema = z.object({
  role: z.literal('admin'),
  ...baseUserFields,
  password: passwordSchema,
});

export const createFacultySchema = z.object({
  role: z.literal('faculty'),
  ...baseUserFields,
  ...facultyFields,
  password: passwordSchema,
});

export const createStudentSchema = z.object({
  role: z.literal('student'),
  ...baseUserFields,
  ...studentFields,
  password: passwordSchema,
});

export const createUserSchema = z.discriminatedUnion('role', [
  createAdminSchema,
  createFacultySchema,
  createStudentSchema,
]);

export const updateUserSchema = z
  .object({
    userId: uuidSchema,
    ...baseUserFields,
    departmentId: uuidSchema.optional().nullable(),
    employeeNo: z.string().trim().max(40).optional().nullable(),
    designation: z.string().trim().max(120).optional().nullable(),
    rollNo: z.string().trim().max(40).optional().nullable(),
    admissionYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
    program: z.string().trim().max(120).optional().nullable(),
    batch: z.string().trim().max(40).optional().nullable(),
  })
  .strict();

export const setUserActiveSchema = z.object({ userId: uuidSchema, isActive: z.boolean() });

export const resetPasswordSchema = z.object({ userId: uuidSchema, newPassword: passwordSchema });

/* -------------------------- offerings/enrollments ------------------------ */

export const createOfferingSchema = z.object({
  courseId: uuidSchema,
  termId: uuidSchema,
  facultyUserId: uuidSchema,
  sectionCode: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, digits or dashes.')
    .optional(),
  capacity: z.coerce.number().int().min(1).max(10_000).optional().nullable(),
});

export const updateOfferingSchema = z.object({
  offeringId: uuidSchema,
  facultyUserId: uuidSchema.optional(),
  sectionCode: z.string().trim().min(1).max(10).optional(),
  capacity: z.coerce.number().int().min(1).max(10_000).optional().nullable(),
  status: z.enum(['draft', 'active', 'closed', 'archived']).optional(),
});

export const setOfferingStatusSchema = z.object({
  offeringId: uuidSchema,
  status: z.enum(['draft', 'active', 'closed', 'archived']),
});

export const enrollStudentSchema = z.object({
  offeringId: uuidSchema,
  studentUserId: uuidSchema,
});

export const setEnrollmentStatusSchema = z.object({
  enrollmentId: uuidSchema,
  status: z.enum(['active', 'dropped', 'completed']),
});

/* ------------------------------- teaching -------------------------------- */

export const createSessionSchema = z.object({
  offeringId: uuidSchema,
  startsAt: localDateTimeSchema,
  endsAt: localDateTimeSchema.optional().nullable(),
  topic: z.string().trim().min(1, 'Topic is required.').max(300),
});

export const updateSessionSchema = z.object({
  sessionId: uuidSchema,
  startsAt: localDateTimeSchema.optional(),
  endsAt: localDateTimeSchema.optional().nullable(),
  topic: z.string().trim().min(1).max(300).optional(),
});

export const cancelSessionSchema = z.object({ sessionId: uuidSchema });

export const saveAttendanceSchema = z.object({
  sessionId: uuidSchema,
  entries: z
    .array(
      z.object({
        enrollmentId: uuidSchema,
        status: z.enum(['present', 'absent', 'excused']),
        note: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(1, 'Select at least one student.')
    .max(500)
    .refine(
      (entries) => new Set(entries.map((entry) => entry.enrollmentId)).size === entries.length,
      'Each student may appear only once.',
    ),
});

/* ------------------------------ assignments ------------------------------ */

export const createAssignmentSchema = z.object({
  offeringId: uuidSchema,
  title: z.string().trim().min(1, 'Title is required.').max(300),
  instructions: z.string().max(20_000).optional().default(''),
  dueAt: localDateTimeSchema,
  maxMarks: decimalSchema(4, 2),
  latePenaltyPercent: decimalSchema(3, 2),
  allowResubmission: z.boolean().optional().default(false),
});

export const updateAssignmentSchema = z.object({
  assignmentId: uuidSchema,
  title: z.string().trim().min(1).max(300).optional(),
  instructions: z.string().max(20_000).optional(),
  dueAt: localDateTimeSchema.optional(),
  maxMarks: decimalSchema(4, 2).optional(),
  latePenaltyPercent: decimalSchema(3, 2).optional(),
  allowResubmission: z.boolean().optional(),
});

export const assignmentIdSchema = z.object({ assignmentId: uuidSchema });

export const gradeSubmissionSchema = z.object({
  submissionId: uuidSchema,
  marksAwarded: decimalSchema(4, 2),
  feedback: z.string().max(5000).optional().nullable(),
  release: z.boolean().optional().default(false),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const releaseGradeSchema = z.object({ submissionId: uuidSchema });

export const computeFinalGradesSchema = z.object({ offeringId: uuidSchema });

export const publishFinalGradesSchema = z.object({ offeringId: uuidSchema });
