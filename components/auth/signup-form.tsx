'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { ActionResult } from '@/types/contracts';
import { registerStudentAction } from '@/lib/actions/auth';
import { Field, FormMessage, Select, SubmitButton, TextInput } from '@/components/form';
import { ArrowRightIcon } from '@/components/icons';

type Department = { id: string; code: string; name: string };

export function SignupForm({
  departments,
  defaultAdmissionYear,
}: {
  departments: Department[];
  defaultAdmissionYear: number;
}) {
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    rollNo: '',
    admissionYear: String(defaultAdmissionYear),
    program: '',
    batch: '',
    departmentId: departments[0]?.id ?? '',
    password: '',
    confirmPassword: '',
  });
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => {
      const result = await registerStudentAction({
        fullName: String(formData.get('fullName') ?? ''),
        email: String(formData.get('email') ?? ''),
        rollNo: String(formData.get('rollNo') ?? ''),
        admissionYear: String(formData.get('admissionYear') ?? ''),
        program: String(formData.get('program') ?? ''),
        batch: String(formData.get('batch') ?? ''),
        departmentId: String(formData.get('departmentId') ?? ''),
        password: String(formData.get('password') ?? ''),
        confirmPassword: String(formData.get('confirmPassword') ?? ''),
        termsAccepted: formData.get('termsAccepted') === 'on',
      });
      return result as ActionResult<unknown>;
    },
    null,
  );

  const error = state && !state.ok ? state.error : null;
  const fieldError = (name: string) => error?.fieldErrors?.[name];

  const update =
    (key: keyof typeof values) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
    };

  return (
    <div>
      <p className="eyebrow">Student access</p>
      <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight tracking-[-0.04em]">
        Create your student account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Use the details your institution has on record. An administrator can update them later.
      </p>

      <div className="mt-6">
        <FormMessage state={state} success="Account created. Opening your dashboard…" />
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-4" noValidate>
        <Field label="Full name" htmlFor="fullName" required error={fieldError('fullName')}>
          <TextInput
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Aarav Sharma"
            value={values.fullName}
            onChange={update('fullName')}
            aria-invalid={Boolean(fieldError('fullName'))}
            required
          />
        </Field>

        <Field
          label="Institutional email"
          htmlFor="email"
          required
          hint="Use the address your institution expects for academic mail."
          error={fieldError('email')}
        >
          <TextInput
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@institution.edu"
            value={values.email}
            onChange={update('email')}
            aria-invalid={Boolean(fieldError('email'))}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Roll number" htmlFor="rollNo" required error={fieldError('rollNo')}>
            <TextInput
              id="rollNo"
              name="rollNo"
              placeholder="CSE-2026-014"
              value={values.rollNo}
              onChange={update('rollNo')}
              aria-invalid={Boolean(fieldError('rollNo'))}
              required
            />
          </Field>
          <Field
            label="Admission year"
            htmlFor="admissionYear"
            required
            error={fieldError('admissionYear')}
          >
            <TextInput
              id="admissionYear"
              name="admissionYear"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2200}
              value={values.admissionYear}
              onChange={update('admissionYear')}
              aria-invalid={Boolean(fieldError('admissionYear'))}
              required
            />
          </Field>
        </div>

        <Field label="Department" htmlFor="departmentId" required error={fieldError('departmentId')}>
          <Select
            id="departmentId"
            name="departmentId"
            value={values.departmentId}
            onChange={update('departmentId')}
            aria-invalid={Boolean(fieldError('departmentId'))}
            required
          >
            {departments.length === 0 ? (
              <option value="">No active departments available</option>
            ) : (
              departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} — {department.name}
                </option>
              ))
            )}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Program" htmlFor="program" required error={fieldError('program')}>
            <TextInput
              id="program"
              name="program"
              placeholder="B.Tech Computer Science"
              value={values.program}
              onChange={update('program')}
              aria-invalid={Boolean(fieldError('program'))}
              required
            />
          </Field>
          <Field label="Batch" htmlFor="batch" hint="Optional" error={fieldError('batch')}>
            <TextInput
              id="batch"
              name="batch"
              placeholder="2026–2030"
              value={values.batch}
              onChange={update('batch')}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Password"
            htmlFor="password"
            required
            hint="At least 12 characters."
            error={fieldError('password')}
          >
            <div className="relative">
              <TextInput
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a password"
                value={values.password}
                onChange={update('password')}
                aria-invalid={Boolean(fieldError('password'))}
                className="pr-14"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted transition-colors hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <Field
            label="Confirm password"
            htmlFor="confirmPassword"
            required
            error={fieldError('confirmPassword')}
          >
            <TextInput
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat password"
              value={values.confirmPassword}
              onChange={update('confirmPassword')}
              aria-invalid={Boolean(fieldError('confirmPassword'))}
              required
            />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-ink"
            required
          />
          <span>
            I confirm these details are correct and accept the institution’s acceptable-use
            policy for academic systems. {fieldError('termsAccepted') ? (
              <span className="font-medium text-danger">{fieldError('termsAccepted')}</span>
            ) : null}
          </span>
        </label>

        <SubmitButton
          className="w-full"
          size="lg"
          pendingLabel="Creating account…"
          disabled={departments.length === 0}
        >
          Create student account <ArrowRightIcon size={16} />
        </SubmitButton>
      </form>

      <p className="mt-5 text-sm text-muted">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
        Faculty and administrator accounts are provisioned by the institution and cannot be
        self-registered. Contact your academic office if you need a role change.
      </p>
    </div>
  );
}
