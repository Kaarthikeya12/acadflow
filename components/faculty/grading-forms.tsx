'use client';

import { useActionState } from 'react';
import type { ActionResult, SubmissionDTO } from '@/types/contracts';
import {
  computeFinalGrades,
  gradeSubmission,
  publishFinalGrades,
  releaseGrade,
} from '@/lib/actions/faculty';
import { Field, FormMessage, SubmitButton, TextArea, TextInput } from '@/components/form';
import { Badge } from '@/components/ui';

function errorOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.error : null;
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export function GradeSubmissionForm({
  submission,
  maxMarks,
}: {
  submission: SubmissionDTO;
  maxMarks: string;
}) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      gradeSubmission({
        submissionId: submission.id,
        marksAwarded: value(formData, 'marksAwarded'),
        feedback: value(formData, 'feedback') || null,
        release: formData.get('release') === 'on',
        reason: value(formData, 'reason') || null,
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage
        state={state}
        success={
          submission.gradeStatus === 'pending'
            ? 'Marks saved. The audit trigger recorded the initial entry.'
            : 'Marks updated. The audit trigger recorded the change.'
        }
      />
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Field
          label={`Marks (max ${maxMarks})`}
          htmlFor={`marks-${submission.id}`}
          required
          error={error?.fieldErrors?.marksAwarded}
        >
          <TextInput
            id={`marks-${submission.id}`}
            name="marksAwarded"
            inputMode="decimal"
            defaultValue={submission.marksAwarded ?? ''}
            required
          />
        </Field>
        <Field label="Feedback" htmlFor={`feedback-${submission.id}`} error={error?.fieldErrors?.feedback}>
          <TextArea
            id={`feedback-${submission.id}`}
            name="feedback"
            rows={2}
            defaultValue={submission.feedback ?? ''}
            placeholder="Optional feedback for the student"
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field
          label="Reason for change"
          htmlFor={`reason-${submission.id}`}
          hint="Recorded in the audit trail when replacing an existing mark."
          error={error?.fieldErrors?.reason}
        >
          <TextInput
            id={`reason-${submission.id}`}
            name="reason"
            placeholder="e.g. Re-marked after regrade request"
          />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-xs text-muted">
          <input type="checkbox" name="release" className="h-4 w-4 rounded border-line accent-ink" />
          Release to student
        </label>
      </div>
      <div>
        <SubmitButton size="sm">
          {submission.gradeStatus === 'pending' ? 'Save marks' : 'Update marks'}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ReleaseGradeButton({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => releaseGrade({ submissionId }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton size="sm" variant="secondary">
        Release marks
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function FinalGradeActions({
  offeringId,
  policyConfigured,
  hasRows,
}: {
  offeringId: string;
  policyConfigured: boolean;
  hasRows: boolean;
}) {
  const [computeState, computeAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => computeFinalGrades({ offeringId }) as Promise<ActionResult<unknown>>,
    null,
  );
  const [publishState, publishAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => publishFinalGrades({ offeringId }) as Promise<ActionResult<unknown>>,
    null,
  );

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex flex-col gap-2">
        <form action={computeAction}>
          <SubmitButton size="sm" disabled={!policyConfigured || !hasRows}>
            Compute final grades
          </SubmitButton>
        </form>
        <FormMessage state={computeState} success="Final grades computed from the active policy." />
      </div>
      <div className="flex flex-col gap-2">
        <form action={publishAction}>
          <SubmitButton size="sm" variant="secondary" disabled={!policyConfigured || !hasRows}>
            Publish computed grades
          </SubmitButton>
        </form>
        <FormMessage state={publishState} success="Computed final grades published to students." />
      </div>
      {!policyConfigured ? (
        <Badge tone="warning">Configure the grade policy before computing</Badge>
      ) : null}
    </div>
  );
}
