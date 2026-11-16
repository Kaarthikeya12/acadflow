'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import { withTransaction, withAdvisoryLock } from '@/lib/db/transaction';
import { hashPassword } from '@/lib/auth/password';
import { canTransitionEnrollment, canTransitionOffering } from '@/lib/authz/transitions';
import {
  clearCurrentTerm,
  insertCourse,
  insertDepartment,
  insertTerm,
  insertUser,
  setCourseActive as setCourseActiveRepo,
  setCurrentTerm as setCurrentTermRepo,
  setDepartmentActive as setDepartmentActiveRepo,
  setUserActive,
  setUserPasswordHash,
  updateCourse as updateCourseRepo,
  updateDepartment as updateDepartmentRepo,
  updateTerm as updateTermRepo,
  updateUser as updateUserRepo,
} from '@/lib/db/queries/admin';
import {
  enrollStudentTx,
  getEnrollmentStatusForUpdate,
  getOfferingStatusForUpdate,
  insertOffering,
  setEnrollmentStatus as setEnrollmentStatusRepo,
  setOfferingStatus as setOfferingStatusRepo,
  updateOffering as updateOfferingRepo,
} from '@/lib/db/queries/offerings';
import {
  createCourseSchema,
  createDepartmentSchema,
  createOfferingSchema,
  createTermSchema,
  createUserSchema,
  enrollStudentSchema,
  resetPasswordSchema,
  setActiveSchema,
  setCurrentTermSchema,
  setEnrollmentStatusSchema,
  setOfferingStatusSchema,
  setUserActiveSchema,
  updateCourseSchema,
  updateDepartmentSchema,
  updateOfferingSchema,
  updateTermSchema,
  updateUserSchema,
} from '@/lib/validation/schemas';
import { parseInput, runAction } from './helpers';

const ADMIN_ONLY = ['admin'] as const;

function revalidateAdmin(): void {
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/departments');
  revalidatePath('/admin/courses');
  revalidatePath('/admin/users');
  revalidatePath('/admin/offerings');
  revalidatePath('/admin/enrollments');
}

/* ------------------------------ departments ------------------------------ */

export async function createDepartment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'createDepartment',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(createDepartmentSchema, input);
      const id = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        insertDepartment(client, data),
      );
      revalidateAdmin();
      return { id };
    },
  });
}

export async function updateDepartment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'updateDepartment',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(updateDepartmentSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await updateDepartmentRepo(client, data);
        if (!updated) throw new AppError('NOT_FOUND', 'The department was not found.');
      });
      revalidateAdmin();
      return { id: data.id };
    },
  });
}

export async function setDepartmentActive(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'setDepartmentActive',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(setActiveSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await setDepartmentActiveRepo(client, data);
        if (!updated) throw new AppError('NOT_FOUND', 'The department was not found.');
      });
      revalidateAdmin();
      return { id: data.id };
    },
  });
}

/* --------------------------------- courses ------------------------------- */

export async function createCourse(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'createCourse',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(createCourseSchema, input);
      const id = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        insertCourse(client, data),
      );
      revalidateAdmin();
      return { id };
    },
  });
}

export async function updateCourse(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'updateCourse',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(updateCourseSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await updateCourseRepo(client, data);
        if (!updated) throw new AppError('NOT_FOUND', 'The course was not found.');
      });
      revalidateAdmin();
      return { id: data.id };
    },
  });
}

export async function setCourseActive(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'setCourseActive',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(setActiveSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await setCourseActiveRepo(client, data);
        if (!updated) throw new AppError('NOT_FOUND', 'The course was not found.');
      });
      revalidateAdmin();
      return { id: data.id };
    },
  });
}

/* ---------------------------------- terms -------------------------------- */

export async function createTerm(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'createTerm',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(createTermSchema, input);
      const id = await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        if (!data.isCurrent) return insertTerm(client, { ...data, isCurrent: false });
        return withAdvisoryLock(client, 'academic_term.current', async () => {
          await clearCurrentTerm(client);
          return insertTerm(client, { ...data, isCurrent: true });
        });
      });
      revalidateAdmin();
      return { id };
    },
  });
}

export async function updateTerm(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'updateTerm',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(updateTermSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await updateTermRepo(client, data);
        if (!updated) throw new AppError('NOT_FOUND', 'The term was not found.');
      });
      revalidateAdmin();
      revalidatePath('/faculty/dashboard');
      return { id: data.id };
    },
  });
}

export async function setCurrentTerm(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'setCurrentTerm',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(setCurrentTermSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        await withAdvisoryLock(client, 'academic_term.current', async () => {
          const updated = await setCurrentTermRepo(client, data.id);
          if (!updated) throw new AppError('NOT_FOUND', 'The term was not found.');
        });
      });
      revalidateAdmin();
      revalidatePath('/faculty/dashboard');
      return { id: data.id };
    },
  });
}

/* ---------------------------------- users -------------------------------- */

export async function createUser(input: unknown): Promise<ActionResult<{ userId: string }>> {
  return runAction({
    action: 'createUser',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(createUserSchema, input);
      const passwordHash = await hashPassword(data.password);

      const userId = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        insertUser(client, {
          role: data.role,
          email: data.email,
          fullName: data.fullName,
          passwordHash,
          departmentId: 'departmentId' in data ? data.departmentId : null,
          employeeNo: 'employeeNo' in data ? data.employeeNo : null,
          designation: 'designation' in data ? data.designation ?? null : null,
          rollNo: 'rollNo' in data ? data.rollNo : null,
          admissionYear: 'admissionYear' in data ? data.admissionYear : null,
          program: 'program' in data ? data.program : null,
          batch: 'batch' in data ? data.batch ?? null : null,
        }),
      );
      revalidateAdmin();
      return { userId };
    },
  });
}

export async function updateUser(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  return runAction({
    action: 'updateUser',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(updateUserSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const role = await updateUserRepo(client, data);
        if (!role) throw new AppError('NOT_FOUND', 'The user was not found.');
      });
      revalidateAdmin();
      return { userId: data.userId };
    },
  });
}

export async function setUserActiveAction(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  return runAction({
    action: 'setUserActive',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(setUserActiveSchema, input);
      if (data.userId === user.id && !data.isActive) {
        throw new AppError('VALIDATION_ERROR', 'You cannot deactivate your own account.', {
          fieldErrors: { isActive: ['You cannot deactivate your own account.'] },
        });
      }
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await setUserActive(client, data);
        if (!updated) throw new AppError('NOT_FOUND', 'The user was not found.');
      });
      revalidateAdmin();
      return { userId: data.userId };
    },
  });
}

export async function resetUserPassword(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  return runAction({
    action: 'resetUserPassword',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(resetPasswordSchema, input);
      const passwordHash = await hashPassword(data.newPassword);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await setUserPasswordHash(client, {
          userId: data.userId,
          passwordHash,
        });
        if (!updated) throw new AppError('NOT_FOUND', 'The user was not found.');
      });
      revalidateAdmin();
      return { userId: data.userId };
    },
  });
}

/* -------------------------------- offerings ------------------------------ */

export async function createOffering(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'createOffering',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(createOfferingSchema, input);
      const id = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        insertOffering(client, {
          courseId: data.courseId,
          termId: data.termId,
          facultyUserId: data.facultyUserId,
          sectionCode: data.sectionCode ?? 'A',
          capacity: data.capacity ?? null,
          createdBy: user.id,
        }),
      );
      revalidateAdmin();
      return { id };
    },
  });
}

export async function updateOffering(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'updateOffering',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(updateOfferingSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        if (data.status) {
          const current = await getOfferingStatusForUpdate(client, data.offeringId);
          if (!current) throw new AppError('NOT_FOUND', 'The offering was not found.');
          if (!canTransitionOffering(current, data.status)) {
            throw new AppError(
              'CONFLICT',
              `An offering cannot move from ${current} to ${data.status}.`,
            );
          }
        }
        const updated = await updateOfferingRepo(client, {
          offeringId: data.offeringId,
          facultyUserId: data.facultyUserId ?? null,
          sectionCode: data.sectionCode ?? null,
          capacity: data.capacity ?? null,
          status: data.status ?? null,
        });
        if (!updated) throw new AppError('NOT_FOUND', 'The offering was not found.');
      });
      revalidateAdmin();
      return { id: data.offeringId };
    },
  });
}

export async function setOfferingStatus(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'setOfferingStatus',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(setOfferingStatusSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const current = await getOfferingStatusForUpdate(client, data.offeringId);
        if (!current) throw new AppError('NOT_FOUND', 'The offering was not found.');
        if (!canTransitionOffering(current, data.status)) {
          throw new AppError(
            'CONFLICT',
            `An offering cannot move from ${current} to ${data.status}.`,
          );
        }
        await setOfferingStatusRepo(client, data);
      });
      revalidateAdmin();
      return { id: data.offeringId };
    },
  });
}

/* ------------------------------- enrollments ----------------------------- */

export async function enrollStudent(
  input: unknown,
): Promise<ActionResult<{ enrollmentId: string; reactivated: boolean }>> {
  return runAction({
    action: 'enrollStudent',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(enrollStudentSchema, input);
      const result = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        enrollStudentTx(client, { ...data, createdBy: user.id }),
      );
      revalidateAdmin();
      return result;
    },
  });
}

export async function setEnrollmentStatus(
  input: unknown,
): Promise<ActionResult<{ enrollmentId: string }>> {
  return runAction({
    action: 'setEnrollmentStatus',
    roles: [...ADMIN_ONLY],
    handler: async ({ user, requestId }) => {
      const data = parseInput(setEnrollmentStatusSchema, input);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const current = await getEnrollmentStatusForUpdate(client, data.enrollmentId);
        if (!current) throw new AppError('NOT_FOUND', 'The enrollment was not found.');
        if (!canTransitionEnrollment(current, data.status)) {
          throw new AppError(
            'CONFLICT',
            `An enrollment cannot move from ${current} to ${data.status}.`,
          );
        }
        await setEnrollmentStatusRepo(client, data);
      });
      revalidateAdmin();
      revalidatePath('/student/dashboard');
      return { enrollmentId: data.enrollmentId };
    },
  });
}
