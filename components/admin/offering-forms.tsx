'use client';

import { useActionState } from 'react';
import type { ActionResult, OfferingDTO } from '@/types/contracts';
import { createOffering, setOfferingStatus, updateOffering } from '@/lib/actions/admin';
import { canTransitionOffering } from '@/lib/authz/transitions';
import { Field, FormMessage, Select, SubmitButton, TextInput } from '@/components/form';
import { Badge, buttonClasses } from '@/components/ui';

type CourseOption = { id: string; code: string; title: string; departmentId: string };
type TermOption = { id: string; academicYear: string; label: string; isCurrent: boolean };
type FacultyOption = { id: string; fullName: string; email: string };

function errorOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.error : null;
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

const STATUSES: Array<OfferingDTO['status']> = ['draft', 'active', 'closed', 'archived'];
const STATUS_LABEL: Record<OfferingDTO['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

export function OfferingCreateForm({
  courses,
  terms,
  faculty,
}: {
  courses: CourseOption[];
  terms: TermOption[];
  faculty: FacultyOption[];
}) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => {
      const capacity = value(formData, 'capacity');
      return createOffering({
        courseId: value(formData, 'courseId'),
        termId: value(formData, 'termId'),
        facultyUserId: value(formData, 'facultyUserId'),
        sectionCode: value(formData, 'sectionCode') || undefined,
        capacity: capacity || null,
      }) as Promise<ActionResult<unknown>>;
    },
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} success="Offering created as a draft." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Course" htmlFor="offering-course" required error={error?.fieldErrors?.courseId}>
          <Select id="offering-course" name="courseId" required>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Academic term" htmlFor="offering-term" required error={error?.fieldErrors?.termId}>
          <Select id="offering-term" name="termId" required>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academicYear} · {term.label}
                {term.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Faculty member" htmlFor="offering-faculty" required error={error?.fieldErrors?.facultyUserId}>
          <Select id="offering-faculty" name="facultyUserId" required>
            {faculty.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName} — {member.email}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Section"
            htmlFor="offering-section"
            hint="Defaults to A"
            error={error?.fieldErrors?.sectionCode}
          >
            <TextInput id="offering-section" name="sectionCode" placeholder="A" maxLength={10} />
          </Field>
          <Field label="Capacity" htmlFor="offering-capacity" error={error?.fieldErrors?.capacity}>
            <TextInput id="offering-capacity" name="capacity" inputMode="numeric" placeholder="Optional" />
          </Field>
        </div>
      </div>
      <div>
        <SubmitButton size="sm">Create offering</SubmitButton>
      </div>
    </form>
  );
}

export function OfferingEditForm({
  offering,
  faculty,
}: {
  offering: OfferingDTO;
  faculty: FacultyOption[];
}) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => {
      const capacity = value(formData, 'capacity');
      return updateOffering({
        offeringId: offering.id,
        facultyUserId: value(formData, 'facultyUserId'),
        sectionCode: value(formData, 'sectionCode') || undefined,
        capacity: capacity || null,
      }) as Promise<ActionResult<unknown>>;
    },
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Offering updated." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Faculty member" htmlFor={`offering-faculty-${offering.id}`} required>
          <Select
            id={`offering-faculty-${offering.id}`}
            name="facultyUserId"
            defaultValue={offering.facultyUserId}
            required
          >
            {faculty.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName} — {member.email}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section" htmlFor={`offering-section-${offering.id}`}>
            <TextInput
              id={`offering-section-${offering.id}`}
              name="sectionCode"
              defaultValue={offering.sectionCode}
              maxLength={10}
            />
          </Field>
          <Field label="Capacity" htmlFor={`offering-capacity-${offering.id}`}>
            <TextInput
              id={`offering-capacity-${offering.id}`}
              name="capacity"
              inputMode="numeric"
              defaultValue={offering.capacity ?? ''}
            />
          </Field>
        </div>
      </div>
      <div>
        <SubmitButton size="sm">Save offering</SubmitButton>
      </div>
    </form>
  );
}

export function OfferingStatusForm({ offering }: { offering: OfferingDTO }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      setOfferingStatus({
        offeringId: offering.id,
        status: value(formData, 'status') as OfferingDTO['status'],
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const allowed = STATUSES.filter((status) => canTransitionOffering(offering.status, status));

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select
        name="status"
        defaultValue={offering.status}
        className={buttonClasses('secondary', 'sm', 'h-8 pr-2')}
        aria-label={`Status for ${offering.courseCode}`}
      >
        {allowed.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <SubmitButton size="sm" variant="ghost">
        Update
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function OfferingStatusNote() {
  return (
    <p className="text-xs leading-relaxed text-muted">
      <Badge tone="warning">Lifecycle</Badge> Draft can move to active or archived. Active can move
      to closed. Closed can move to archived. Archived is final.
    </p>
  );
}
