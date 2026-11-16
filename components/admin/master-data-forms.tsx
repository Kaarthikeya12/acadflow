'use client';

import { useActionState } from 'react';
import type { ActionResult, CourseDTO, DepartmentDTO, TermDTO } from '@/types/contracts';
import {
  createCourse,
  createDepartment,
  createTerm,
  setCourseActive,
  setCurrentTerm,
  setDepartmentActive,
  updateCourse,
  updateDepartment,
  updateTerm,
} from '@/lib/actions/admin';
import { Field, FormMessage, Select, SubmitButton, TextArea, TextInput } from '@/components/form';
import { buttonClasses } from '@/components/ui';

type DepartmentOption = { id: string; code: string; name: string };

function errorOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.error : null;
}

export function DepartmentCreateForm() {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      createDepartment({
        code: String(formData.get('code') ?? ''),
        name: String(formData.get('name') ?? ''),
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} success="Department created." />
      <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
        <Field label="Code" htmlFor="dept-code" required error={error?.fieldErrors?.code}>
          <TextInput
            id="dept-code"
            name="code"
            placeholder="CSE"
            aria-invalid={Boolean(error?.fieldErrors?.code)}
            required
          />
        </Field>
        <Field label="Department name" htmlFor="dept-name" required error={error?.fieldErrors?.name}>
          <TextInput
            id="dept-name"
            name="name"
            placeholder="Computer Science & Engineering"
            aria-invalid={Boolean(error?.fieldErrors?.name)}
            required
          />
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Add department</SubmitButton>
      </div>
    </form>
  );
}

export function DepartmentEditForm({ department }: { department: DepartmentDTO }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      updateDepartment({
        id: department.id,
        code: String(formData.get('code') ?? ''),
        name: String(formData.get('name') ?? ''),
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Department updated." />
      <input type="hidden" name="id" value={department.id} />
      <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
        <Field label="Code" htmlFor={`dept-code-${department.id}`} required error={error?.fieldErrors?.code}>
          <TextInput
            id={`dept-code-${department.id}`}
            name="code"
            defaultValue={department.code}
            required
          />
        </Field>
        <Field label="Name" htmlFor={`dept-name-${department.id}`} required error={error?.fieldErrors?.name}>
          <TextInput
            id={`dept-name-${department.id}`}
            name="name"
            defaultValue={department.name}
            required
          />
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Save department</SubmitButton>
      </div>
    </form>
  );
}

export function DepartmentActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => setDepartmentActive({ id, isActive: !isActive }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton
        variant="ghost"
        size="sm"
        className={isActive ? 'text-danger' : 'text-success'}
        confirm={isActive ? 'Deactivate this department? Existing records stay intact.' : undefined}
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function CourseCreateForm({ departments }: { departments: DepartmentOption[] }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      createCourse({
        departmentId: String(formData.get('departmentId') ?? ''),
        code: String(formData.get('code') ?? ''),
        title: String(formData.get('title') ?? ''),
        credits: String(formData.get('credits') ?? ''),
        description: String(formData.get('description') ?? '') || null,
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} success="Course created." />
      <div className="grid gap-3 sm:grid-cols-[120px_1fr_110px]">
        <Field label="Code" htmlFor="course-code" required error={error?.fieldErrors?.code}>
          <TextInput id="course-code" name="code" placeholder="CS301" required />
        </Field>
        <Field label="Course title" htmlFor="course-title" required error={error?.fieldErrors?.title}>
          <TextInput
            id="course-title"
            name="title"
            placeholder="Database Systems"
            required
          />
        </Field>
        <Field label="Credits" htmlFor="course-credits" required error={error?.fieldErrors?.credits}>
          <TextInput
            id="course-credits"
            name="credits"
            inputMode="decimal"
            placeholder="3.0"
            required
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Department"
          htmlFor="course-department"
          required
          error={error?.fieldErrors?.departmentId}
        >
          <Select id="course-department" name="departmentId" required>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} — {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="course-description" hint="Optional, shown in course details.">
          <TextInput id="course-description" name="description" placeholder="One-line catalogue note" />
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Add course</SubmitButton>
      </div>
    </form>
  );
}

export function CourseEditForm({
  course,
  departments,
}: {
  course: CourseDTO;
  departments: DepartmentOption[];
}) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      updateCourse({
        id: course.id,
        departmentId: String(formData.get('departmentId') ?? ''),
        code: String(formData.get('code') ?? ''),
        title: String(formData.get('title') ?? ''),
        credits: String(formData.get('credits') ?? ''),
        description: String(formData.get('description') ?? '') || null,
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Course updated." />
      <input type="hidden" name="id" value={course.id} />
      <div className="grid gap-3 sm:grid-cols-[120px_1fr_110px]">
        <Field label="Code" htmlFor={`course-code-${course.id}`} required error={error?.fieldErrors?.code}>
          <TextInput id={`course-code-${course.id}`} name="code" defaultValue={course.code} required />
        </Field>
        <Field label="Title" htmlFor={`course-title-${course.id}`} required error={error?.fieldErrors?.title}>
          <TextInput id={`course-title-${course.id}`} name="title" defaultValue={course.title} required />
        </Field>
        <Field label="Credits" htmlFor={`course-credits-${course.id}`} required error={error?.fieldErrors?.credits}>
          <TextInput
            id={`course-credits-${course.id}`}
            name="credits"
            inputMode="decimal"
            defaultValue={course.credits}
            required
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Department" htmlFor={`course-dept-${course.id}`} required>
          <Select id={`course-dept-${course.id}`} name="departmentId" defaultValue={course.departmentId} required>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} — {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor={`course-desc-${course.id}`}>
          <TextArea
            id={`course-desc-${course.id}`}
            name="description"
            defaultValue={course.description ?? ''}
            className="min-h-10"
            rows={2}
          />
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Save course</SubmitButton>
      </div>
    </form>
  );
}

export function CourseActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => setCourseActive({ id, isActive: !isActive }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton
        variant="ghost"
        size="sm"
        className={isActive ? 'text-danger' : 'text-success'}
        confirm={isActive ? 'Deactivate this course? Existing offerings stay intact.' : undefined}
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function TermCreateForm() {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      createTerm({
        academicYear: String(formData.get('academicYear') ?? ''),
        termNo: Number(formData.get('termNo') ?? 0),
        label: String(formData.get('label') ?? ''),
        startsOn: String(formData.get('startsOn') ?? ''),
        endsOn: String(formData.get('endsOn') ?? ''),
        isCurrent: formData.get('isCurrent') === 'on',
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} success="Academic term created." />
      <div className="grid gap-3 sm:grid-cols-[130px_110px_1fr]">
        <Field label="Academic year" htmlFor="term-year" required hint="YYYY-YY" error={error?.fieldErrors?.academicYear}>
          <TextInput id="term-year" name="academicYear" placeholder="2026-27" required />
        </Field>
        <Field label="Term" htmlFor="term-no" required error={error?.fieldErrors?.termNo}>
          <Select id="term-no" name="termNo" defaultValue="1">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </Select>
        </Field>
        <Field label="Label" htmlFor="term-label" required error={error?.fieldErrors?.label}>
          <TextInput id="term-label" name="label" placeholder="Semester 1" required />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts on" htmlFor="term-start" required error={error?.fieldErrors?.startsOn}>
          <TextInput id="term-start" name="startsOn" type="date" required />
        </Field>
        <Field label="Ends on" htmlFor="term-end" required error={error?.fieldErrors?.endsOn}>
          <TextInput id="term-end" name="endsOn" type="date" required />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="isCurrent" className="h-4 w-4 rounded border-line accent-ink" />
        Make this the current term
      </label>
      <div>
        <SubmitButton size="sm">Add academic term</SubmitButton>
      </div>
    </form>
  );
}

export function TermEditForm({ term }: { term: TermDTO }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      updateTerm({
        id: term.id,
        academicYear: String(formData.get('academicYear') ?? ''),
        termNo: Number(formData.get('termNo') ?? 0),
        label: String(formData.get('label') ?? ''),
        startsOn: String(formData.get('startsOn') ?? ''),
        endsOn: String(formData.get('endsOn') ?? ''),
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Term updated." />
      <input type="hidden" name="id" value={term.id} />
      <div className="grid gap-3 sm:grid-cols-[130px_110px_1fr]">
        <Field label="Academic year" htmlFor={`term-year-${term.id}`} required>
          <TextInput id={`term-year-${term.id}`} name="academicYear" defaultValue={term.academicYear} required />
        </Field>
        <Field label="Term" htmlFor={`term-no-${term.id}`} required>
          <Select id={`term-no-${term.id}`} name="termNo" defaultValue={String(term.termNo)}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </Select>
        </Field>
        <Field label="Label" htmlFor={`term-label-${term.id}`} required>
          <TextInput id={`term-label-${term.id}`} name="label" defaultValue={term.label} required />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts on" htmlFor={`term-start-${term.id}`} required>
          <TextInput id={`term-start-${term.id}`} name="startsOn" type="date" defaultValue={term.startsOn} required />
        </Field>
        <Field label="Ends on" htmlFor={`term-end-${term.id}`} required>
          <TextInput id={`term-end-${term.id}`} name="endsOn" type="date" defaultValue={term.endsOn} required />
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Save term</SubmitButton>
      </div>
    </form>
  );
}

export function SetCurrentTermButton({ id }: { id: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => setCurrentTerm({ id }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton variant="ghost" size="sm">
        Set current
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export { buttonClasses };
