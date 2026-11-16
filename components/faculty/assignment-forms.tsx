'use client';

import { useActionState } from 'react';
import type { ActionResult, AssignmentDTO } from '@/types/contracts';
import {
  closeAssignment,
  createAssignment,
  publishAssignment,
  updateAssignment,
} from '@/lib/actions/faculty';
import { Field, FormMessage, SubmitButton, TextArea, TextInput } from '@/components/form';
import { toDateTimeLocal } from '@/components/format';

function errorOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.error : null;
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export function AssignmentCreateForm({ offeringId }: { offeringId: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      createAssignment({
        offeringId,
        title: value(formData, 'title'),
        instructions: String(formData.get('instructions') ?? ''),
        dueAt: value(formData, 'dueAt'),
        maxMarks: value(formData, 'maxMarks'),
        latePenaltyPercent: value(formData, 'latePenaltyPercent') || '0',
        allowResubmission: formData.get('allowResubmission') === 'on',
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} success="Assignment created as a draft. Publish it when ready." />
      <Field label="Title" htmlFor={`assignment-title-${offeringId}`} required error={error?.fieldErrors?.title}>
        <TextInput
          id={`assignment-title-${offeringId}`}
          name="title"
          placeholder="Normalisation problem set"
          required
        />
      </Field>
      <Field label="Instructions" htmlFor={`assignment-instructions-${offeringId}`} error={error?.fieldErrors?.instructions}>
        <TextArea
          id={`assignment-instructions-${offeringId}`}
          name="instructions"
          rows={3}
          placeholder="What students should submit, how it will be assessed, and any constraints."
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Due at" htmlFor={`assignment-due-${offeringId}`} required error={error?.fieldErrors?.dueAt}>
          <TextInput id={`assignment-due-${offeringId}`} name="dueAt" type="datetime-local" required />
        </Field>
        <Field label="Maximum marks" htmlFor={`assignment-marks-${offeringId}`} required error={error?.fieldErrors?.maxMarks}>
          <TextInput
            id={`assignment-marks-${offeringId}`}
            name="maxMarks"
            inputMode="decimal"
            defaultValue="100"
            required
          />
        </Field>
        <Field
          label="Late penalty (%)"
          htmlFor={`assignment-penalty-${offeringId}`}
          required
          error={error?.fieldErrors?.latePenaltyPercent}
        >
          <TextInput
            id={`assignment-penalty-${offeringId}`}
            name="latePenaltyPercent"
            inputMode="decimal"
            defaultValue="0"
            required
          />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-xs text-muted">
          <input type="checkbox" name="allowResubmission" className="h-4 w-4 rounded border-line accent-ink" />
          Allow resubmission
        </label>
      </div>
      <div>
        <SubmitButton size="sm">Create assignment</SubmitButton>
      </div>
    </form>
  );
}

export function AssignmentEditForm({ assignment }: { assignment: AssignmentDTO }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      updateAssignment({
        assignmentId: assignment.id,
        title: value(formData, 'title') || undefined,
        instructions: String(formData.get('instructions') ?? ''),
        dueAt: value(formData, 'dueAt') || undefined,
        maxMarks: value(formData, 'maxMarks') || undefined,
        latePenaltyPercent: value(formData, 'latePenaltyPercent') || undefined,
        allowResubmission: formData.get('allowResubmission') === 'on',
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Assignment updated." />
      <Field label="Title" htmlFor={`edit-assignment-title-${assignment.id}`} required>
        <TextInput
          id={`edit-assignment-title-${assignment.id}`}
          name="title"
          defaultValue={assignment.title}
          required
        />
      </Field>
      <Field label="Instructions" htmlFor={`edit-assignment-instructions-${assignment.id}`}>
        <TextArea
          id={`edit-assignment-instructions-${assignment.id}`}
          name="instructions"
          rows={4}
          defaultValue={assignment.instructions}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Due at" htmlFor={`edit-assignment-due-${assignment.id}`} required>
          <TextInput
            id={`edit-assignment-due-${assignment.id}`}
            name="dueAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(assignment.dueAt)}
            required
          />
        </Field>
        <Field label="Maximum marks" htmlFor={`edit-assignment-marks-${assignment.id}`} required>
          <TextInput
            id={`edit-assignment-marks-${assignment.id}`}
            name="maxMarks"
            inputMode="decimal"
            defaultValue={assignment.maxMarks}
            required
          />
        </Field>
        <Field label="Late penalty (%)" htmlFor={`edit-assignment-penalty-${assignment.id}`} required>
          <TextInput
            id={`edit-assignment-penalty-${assignment.id}`}
            name="latePenaltyPercent"
            inputMode="decimal"
            defaultValue={assignment.latePenaltyPercent}
            required
          />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-xs text-muted">
          <input
            type="checkbox"
            name="allowResubmission"
            defaultChecked={assignment.allowResubmission}
            className="h-4 w-4 rounded border-line accent-ink"
          />
          Allow resubmission
        </label>
      </div>
      <div>
        <SubmitButton size="sm">Save assignment</SubmitButton>
      </div>
    </form>
  );
}

export function PublishAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => publishAssignment({ assignmentId }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton size="sm" confirm="Publish this assignment to enrolled students?">
        Publish
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function CloseAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => closeAssignment({ assignmentId }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton
        size="sm"
        variant="secondary"
        confirm="Close this assignment? Students can no longer submit after it is closed."
      >
        Close
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}
