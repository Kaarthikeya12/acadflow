'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/contracts';
import { AppError } from '@/lib/db/errors';
import { withTransaction } from '@/lib/db/transaction';
import { zonedLocalToUtc } from '@/lib/time';
import { canTransitionAssignment } from '@/lib/authz/transitions';
import {
  requireAssignmentFaculty,
  requireOfferingFaculty,
  requireSessionFaculty,
  requireSubmissionAccess,
} from '@/lib/authz/guards';
import {
  cancelSession as cancelSessionRepo,
  getSessionById,
  insertSession,
  saveAttendanceTx,
  updateSession as updateSessionRepo,
} from '@/lib/db/queries/teaching';
import {
  closeAssignment as closeAssignmentRepo,
  getAssignmentStatusForUpdate,
  gradeSubmissionTx,
  insertAssignment,
  publishAssignment as publishAssignmentRepo,
  releaseGradeTx,
  updateAssignment as updateAssignmentRepo,
} from '@/lib/db/queries/assessment';
import { computeFinalGradesTx, publishFinalGradesTx } from '@/lib/db/queries/policy';
import {
  assignmentIdSchema,
  cancelSessionSchema,
  computeFinalGradesSchema,
  createAssignmentSchema,
  createSessionSchema,
  gradeSubmissionSchema,
  publishFinalGradesSchema,
  releaseGradeSchema,
  saveAttendanceSchema,
  updateAssignmentSchema,
  updateSessionSchema,
} from '@/lib/validation/schemas';
import { parseInput, runAction } from './helpers';

function revalidateFaculty(offeringId?: string): void {
  revalidatePath('/faculty/dashboard');
  revalidatePath('/faculty/offerings');
  if (offeringId) revalidatePath(`/faculty/offerings/${offeringId}`);
  revalidatePath('/faculty/sessions');
  revalidatePath('/faculty/attendance');
  revalidatePath('/faculty/assignments');
  revalidatePath('/faculty/submissions');
  revalidatePath('/faculty/gradebook');
  revalidatePath('/admin/audit-log');
}

/* -------------------------------- sessions ------------------------------- */

export async function createSession(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'createSession',
    capability: 'write:sessions',
    handler: async ({ user, requestId }) => {
      const data = parseInput(createSessionSchema, input);
      await requireOfferingFaculty(data.offeringId, user);

      const startsAt = zonedLocalToUtc(data.startsAt);
      const endsAt = data.endsAt ? zonedLocalToUtc(data.endsAt) : null;
      if (endsAt && endsAt <= startsAt) {
        throw new AppError('VALIDATION_ERROR', 'The end time must be after the start time.', {
          fieldErrors: { endsAt: ['The end time must be after the start time.'] },
        });
      }

      const id = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        insertSession(client, { ...data, startsAt, endsAt, createdBy: user.id }),
      );
      revalidateFaculty(data.offeringId);
      return { id };
    },
  });
}

export async function updateSession(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'updateSession',
    capability: 'write:sessions',
    handler: async ({ user, requestId }) => {
      const data = parseInput(updateSessionSchema, input);
      const offeringId = await requireSessionFaculty(data.sessionId, user);
      const current = await getSessionById(data.sessionId);
      if (!current) throw new AppError('NOT_FOUND', 'The session was not found.');

      const startsAt = data.startsAt ? zonedLocalToUtc(data.startsAt) : new Date(current.startsAt);
      let endsAt: Date | null;
      if (data.endsAt === undefined) {
        endsAt = current.endsAt ? new Date(current.endsAt) : null;
      } else {
        endsAt = data.endsAt ? zonedLocalToUtc(data.endsAt) : null;
      }
      if (endsAt && endsAt <= startsAt) {
        throw new AppError('VALIDATION_ERROR', 'The end time must be after the start time.', {
          fieldErrors: { endsAt: ['The end time must be after the start time.'] },
        });
      }

      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await updateSessionRepo(client, {
          sessionId: data.sessionId,
          startsAt,
          endsAt,
          topic: data.topic ?? current.topic,
        });
        if (!updated) throw new AppError('NOT_FOUND', 'The session was not found.');
      });
      revalidateFaculty(offeringId);
      return { id: data.sessionId };
    },
  });
}

export async function cancelSession(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'cancelSession',
    capability: 'write:sessions',
    handler: async ({ user, requestId }) => {
      const data = parseInput(cancelSessionSchema, input);
      const offeringId = await requireSessionFaculty(data.sessionId, user);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await cancelSessionRepo(client, data.sessionId);
        if (!updated) throw new AppError('NOT_FOUND', 'The session was not found.');
      });
      revalidateFaculty(offeringId);
      return { id: data.sessionId };
    },
  });
}

/* ------------------------------- attendance ------------------------------ */

export async function saveAttendance(
  input: unknown,
): Promise<ActionResult<{ saved: number }>> {
  return runAction({
    action: 'saveAttendance',
    capability: 'write:attendance',
    handler: async ({ user, requestId }) => {
      const data = parseInput(saveAttendanceSchema, input);
      const offeringId = await requireSessionFaculty(data.sessionId, user);
      const saved = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        saveAttendanceTx(client, {
          sessionId: data.sessionId,
          offeringId,
          markedBy: user.id,
          entries: data.entries.map((entry) => ({
            enrollmentId: entry.enrollmentId,
            status: entry.status,
            note: entry.note ?? null,
          })),
        }),
      );
      revalidateFaculty(offeringId);
      revalidatePath('/student/attendance');
      return { saved };
    },
  });
}

/* ------------------------------- assignments ----------------------------- */

export async function createAssignment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'createAssignment',
    capability: 'write:assignments',
    handler: async ({ user, requestId }) => {
      const data = parseInput(createAssignmentSchema, input);
      await requireOfferingFaculty(data.offeringId, user);
      const dueAt = zonedLocalToUtc(data.dueAt);
      const id = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        insertAssignment(client, { ...data, dueAt, createdBy: user.id }),
      );
      revalidateFaculty(data.offeringId);
      return { id };
    },
  });
}

export async function updateAssignment(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'updateAssignment',
    capability: 'write:assignments',
    handler: async ({ user, requestId }) => {
      const data = parseInput(updateAssignmentSchema, input);
      const offeringId = await requireAssignmentFaculty(data.assignmentId, user);
      const dueAt = data.dueAt ? zonedLocalToUtc(data.dueAt) : null;
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const updated = await updateAssignmentRepo(client, {
          assignmentId: data.assignmentId,
          title: data.title ?? null,
          instructions: data.instructions ?? null,
          dueAt,
          maxMarks: data.maxMarks ?? null,
          latePenaltyPercent: data.latePenaltyPercent ?? null,
          allowResubmission: data.allowResubmission ?? null,
        });
        if (!updated) throw new AppError('NOT_FOUND', 'The assignment was not found.');
      });
      revalidateFaculty(offeringId);
      return { id: data.assignmentId };
    },
  });
}

export async function publishAssignment(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'publishAssignment',
    capability: 'write:assignments',
    handler: async ({ user, requestId }) => {
      const data = parseInput(assignmentIdSchema, input);
      const offeringId = await requireAssignmentFaculty(data.assignmentId, user);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const current = await getAssignmentStatusForUpdate(client, data.assignmentId);
        if (!current) throw new AppError('NOT_FOUND', 'The assignment was not found.');
        if (!canTransitionAssignment(current, 'published')) {
          throw new AppError('CONFLICT', `An assignment cannot move from ${current} to published.`);
        }
        await publishAssignmentRepo(client, data.assignmentId);
      });
      revalidateFaculty(offeringId);
      revalidatePath('/student/assignments');
      return { id: data.assignmentId };
    },
  });
}

export async function closeAssignment(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction({
    action: 'closeAssignment',
    capability: 'write:assignments',
    handler: async ({ user, requestId }) => {
      const data = parseInput(assignmentIdSchema, input);
      const offeringId = await requireAssignmentFaculty(data.assignmentId, user);
      await withTransaction({ actorUserId: user.id, requestId }, async (client) => {
        const current = await getAssignmentStatusForUpdate(client, data.assignmentId);
        if (!current) throw new AppError('NOT_FOUND', 'The assignment was not found.');
        if (!canTransitionAssignment(current, 'closed')) {
          throw new AppError('CONFLICT', `An assignment cannot move from ${current} to closed.`);
        }
        await closeAssignmentRepo(client, data.assignmentId);
      });
      revalidateFaculty(offeringId);
      revalidatePath('/student/assignments');
      return { id: data.assignmentId };
    },
  });
}

/* --------------------------------- grading ------------------------------- */

export async function gradeSubmission(input: unknown): Promise<
  ActionResult<{
    submissionId: string;
    marksAwarded: string;
    gradeStatus: 'pending' | 'graded' | 'released';
    auditLogId: string;
  }>
> {
  return runAction({
    action: 'gradeSubmission',
    capability: 'grade:submission',
    handler: async ({ user, requestId }) => {
      const data = parseInput(gradeSubmissionSchema, input);
      await requireSubmissionAccess(data.submissionId, user, 'grade');

      const result = await withTransaction(
        {
          actorUserId: user.id,
          requestId,
          changeReason: data.reason ?? undefined,
        },
        (client) =>
          gradeSubmissionTx(client, {
            submissionId: data.submissionId,
            marksAwarded: data.marksAwarded,
            feedback: data.feedback ?? null,
            release: data.release ?? false,
            gradedBy: user.id,
          }),
      );

      revalidateFaculty();
      revalidatePath('/student/grades');
      revalidatePath('/student/assignments');
      return result;
    },
  });
}

export async function releaseGrade(
  input: unknown,
): Promise<ActionResult<{ submissionId: string; releasedAt: string }>> {
  return runAction({
    action: 'releaseGrade',
    capability: 'release:grade',
    handler: async ({ user, requestId }) => {
      const data = parseInput(releaseGradeSchema, input);
      await requireSubmissionAccess(data.submissionId, user, 'grade');
      const result = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        releaseGradeTx(client, data.submissionId),
      );
      revalidateFaculty();
      revalidatePath('/student/grades');
      revalidatePath('/student/assignments');
      return result;
    },
  });
}

/* ------------------------------- final grades ---------------------------- */

export async function computeFinalGrades(
  input: unknown,
): Promise<ActionResult<{ computed: number }>> {
  return runAction({
    action: 'computeFinalGrades',
    capability: 'compute:final_grades',
    handler: async ({ user, requestId }) => {
      const data = parseInput(computeFinalGradesSchema, input);
      await requireOfferingFaculty(data.offeringId, user);
      const computed = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        computeFinalGradesTx(client, data.offeringId),
      );
      revalidateFaculty(data.offeringId);
      return { computed };
    },
  });
}

export async function publishFinalGrades(
  input: unknown,
): Promise<ActionResult<{ published: number }>> {
  return runAction({
    action: 'publishFinalGrades',
    capability: 'publish:final_grades',
    handler: async ({ user, requestId }) => {
      const data = parseInput(publishFinalGradesSchema, input);
      await requireOfferingFaculty(data.offeringId, user);
      const published = await withTransaction({ actorUserId: user.id, requestId }, (client) =>
        publishFinalGradesTx(client, data.offeringId, user.id),
      );
      revalidateFaculty(data.offeringId);
      revalidatePath('/student/grades');
      return { published };
    },
  });
}
