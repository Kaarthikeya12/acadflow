'use client';

import { useActionState } from 'react';
import type { ActionResult, SessionDTO } from '@/types/contracts';
import { cancelSession, createSession, updateSession } from '@/lib/actions/faculty';
import { Field, FormMessage, SubmitButton, TextInput } from '@/components/form';
import { toDateTimeLocal } from '@/components/format';

function errorOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.error : null;
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

const HOUR = 60 * 60 * 1000;

export function SessionCreateForm({ offeringId }: { offeringId: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      createSession({
        offeringId,
        startsAt: value(formData, 'startsAt'),
        endsAt: value(formData, 'endsAt') || null,
        topic: value(formData, 'topic'),
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} success="Class session scheduled." />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
        <Field label="Starts at" htmlFor={`session-start-${offeringId}`} required error={error?.fieldErrors?.startsAt}>
          <TextInput
            id={`session-start-${offeringId}`}
            name="startsAt"
            type="datetime-local"
            required
          />
        </Field>
        <Field label="Ends at" htmlFor={`session-end-${offeringId}`} hint="Optional" error={error?.fieldErrors?.endsAt}>
          <TextInput id={`session-end-${offeringId}`} name="endsAt" type="datetime-local" />
        </Field>
        <Field label="Topic" htmlFor={`session-topic-${offeringId}`} required error={error?.fieldErrors?.topic}>
          <TextInput
            id={`session-topic-${offeringId}`}
            name="topic"
            placeholder="Normalisation and functional dependencies"
            required
          />
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Schedule session</SubmitButton>
      </div>
      <p className="text-xs text-muted">
        Times use the institution timezone. A session can be marked, edited or cancelled later.
      </p>
    </form>
  );
}

export function SessionEditForm({ session }: { session: SessionDTO }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      updateSession({
        sessionId: session.id,
        startsAt: value(formData, 'startsAt') || undefined,
        endsAt: value(formData, 'endsAt') || null,
        topic: value(formData, 'topic') || undefined,
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);
  const startsAt = toDateTimeLocal(session.startsAt);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Session updated." />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
        <Field label="Starts at" htmlFor={`edit-session-start-${session.id}`} required>
          <TextInput
            id={`edit-session-start-${session.id}`}
            name="startsAt"
            type="datetime-local"
            defaultValue={startsAt}
            required
          />
        </Field>
        <Field label="Ends at" htmlFor={`edit-session-end-${session.id}`}>
          <TextInput
            id={`edit-session-end-${session.id}`}
            name="endsAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(session.endsAt)}
          />
        </Field>
        <Field label="Topic" htmlFor={`edit-session-topic-${session.id}`} required>
          <TextInput
            id={`edit-session-topic-${session.id}`}
            name="topic"
            defaultValue={session.topic}
            required
          />
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Save session</SubmitButton>
      </div>
    </form>
  );
}

export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => cancelSession({ sessionId }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton
        size="sm"
        variant="ghost"
        className="text-danger"
        confirm="Cancel this class session? Existing attendance stays intact."
      >
        Cancel session
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export { HOUR };
