'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import type { ActionResult, Role, UserDTO } from '@/types/contracts';
import {
  createUser,
  resetUserPassword,
  setUserActiveAction,
  updateUser,
} from '@/lib/actions/admin';
import { Field, FormMessage, Select, SubmitButton, TextInput } from '@/components/form';
import { Badge } from '@/components/ui';

type DepartmentOption = { id: string; code: string; name: string };

function errorOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.error : null;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function nullable(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value ? value : null;
}

export function UserCreateForm({ departments }: { departments: DepartmentOption[] }) {
  const [role, setRole] = useState<Role>('student');
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => {
      const selected = text(formData, 'role') as Role;
      const base = {
        role: selected,
        email: text(formData, 'email'),
        fullName: text(formData, 'fullName'),
        password: text(formData, 'password'),
      };
      const input =
        selected === 'admin'
          ? base
          : selected === 'faculty'
            ? {
                ...base,
                departmentId: text(formData, 'departmentId'),
                employeeNo: text(formData, 'employeeNo'),
                designation: nullable(formData, 'designation'),
              }
            : {
                ...base,
                departmentId: text(formData, 'departmentId'),
                rollNo: text(formData, 'rollNo'),
                admissionYear: text(formData, 'admissionYear'),
                program: text(formData, 'program'),
                batch: nullable(formData, 'batch'),
              };
      return createUser(input) as Promise<ActionResult<unknown>>;
    },
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} success="Account created. Share the temporary password securely." />

      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <Field label="Role" htmlFor="new-user-role" required>
          <Select
            id="new-user-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Administrator</option>
          </Select>
        </Field>
        <Field label="Full name" htmlFor="new-user-name" required error={error?.fieldErrors?.fullName}>
          <TextInput id="new-user-name" name="fullName" placeholder="As it should appear on records" required />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email" htmlFor="new-user-email" required error={error?.fieldErrors?.email}>
          <TextInput id="new-user-email" name="email" type="email" autoComplete="off" required />
        </Field>
        <Field
          label="Temporary password"
          htmlFor="new-user-password"
          required
          hint="At least 12 characters. The account holder should change it after first sign-in."
          error={error?.fieldErrors?.password}
        >
          <TextInput
            id="new-user-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        </Field>
      </div>

      {role !== 'admin' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Department"
            htmlFor="new-user-department"
            required
            error={error?.fieldErrors?.departmentId}
          >
            <Select id="new-user-department" name="departmentId" required>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} — {department.name}
                </option>
              ))}
            </Select>
          </Field>
          {role === 'faculty' ? (
            <>
              <Field
                label="Employee number"
                htmlFor="new-user-employee"
                required
                error={error?.fieldErrors?.employeeNo}
              >
                <TextInput id="new-user-employee" name="employeeNo" required />
              </Field>
              <Field label="Designation" htmlFor="new-user-designation" error={error?.fieldErrors?.designation}>
                <TextInput id="new-user-designation" name="designation" placeholder="Assistant Professor" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Roll number" htmlFor="new-user-roll" required error={error?.fieldErrors?.rollNo}>
                <TextInput id="new-user-roll" name="rollNo" required />
              </Field>
              <Field
                label="Admission year"
                htmlFor="new-user-admission"
                required
                error={error?.fieldErrors?.admissionYear}
              >
                <TextInput
                  id="new-user-admission"
                  name="admissionYear"
                  inputMode="numeric"
                  placeholder="2026"
                  required
                />
              </Field>
              <Field label="Program" htmlFor="new-user-program" required error={error?.fieldErrors?.program}>
                <TextInput id="new-user-program" name="program" placeholder="B.Tech Computer Science" required />
              </Field>
              <Field label="Batch" htmlFor="new-user-batch" error={error?.fieldErrors?.batch}>
                <TextInput id="new-user-batch" name="batch" placeholder="2026–30" />
              </Field>
            </>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Create account</SubmitButton>
        <p className="text-xs text-muted">
          <Badge tone="warning">Provisioned</Badge> Faculty and administrator accounts are created
          here; students may also self-register.
        </p>
      </div>
    </form>
  );
}

export function UserEditForm({
  user,
  departments,
}: {
  user: UserDTO;
  departments: DepartmentOption[];
}) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => {
      const input: Record<string, unknown> = {
        userId: user.id,
        email: text(formData, 'email'),
        fullName: text(formData, 'fullName'),
      };
      if (user.role !== 'admin') {
        input.departmentId = text(formData, 'departmentId');
      }
      if (user.role === 'faculty') {
        input.employeeNo = nullable(formData, 'employeeNo');
        input.designation = nullable(formData, 'designation');
      }
      if (user.role === 'student') {
        input.rollNo = nullable(formData, 'rollNo');
        input.program = nullable(formData, 'program');
        input.batch = nullable(formData, 'batch');
        const year = text(formData, 'admissionYear');
        if (year) input.admissionYear = year;
      }
      return updateUser(input) as Promise<ActionResult<unknown>>;
    },
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Profile updated." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" htmlFor={`user-name-${user.id}`} required error={error?.fieldErrors?.fullName}>
          <TextInput id={`user-name-${user.id}`} name="fullName" defaultValue={user.fullName} required />
        </Field>
        <Field label="Email" htmlFor={`user-email-${user.id}`} required error={error?.fieldErrors?.email}>
          <TextInput id={`user-email-${user.id}`} name="email" type="email" defaultValue={user.email} required />
        </Field>
      </div>

      {user.role !== 'admin' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Department" htmlFor={`user-dept-${user.id}`} required>
            <Select id={`user-dept-${user.id}`} name="departmentId" defaultValue={user.departmentId ?? ''} required>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} — {department.name}
                </option>
              ))}
            </Select>
          </Field>
          {user.role === 'faculty' ? (
            <>
              <Field label="Employee number" htmlFor={`user-employee-${user.id}`} required error={error?.fieldErrors?.employeeNo}>
                <TextInput id={`user-employee-${user.id}`} name="employeeNo" defaultValue={user.employeeNo ?? ''} required />
              </Field>
              <Field label="Designation" htmlFor={`user-designation-${user.id}`}>
                <TextInput
                  id={`user-designation-${user.id}`}
                  name="designation"
                  defaultValue={user.designation ?? ''}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Roll number" htmlFor={`user-roll-${user.id}`} required error={error?.fieldErrors?.rollNo}>
                <TextInput id={`user-roll-${user.id}`} name="rollNo" defaultValue={user.rollNo ?? ''} required />
              </Field>
              <Field label="Admission year" htmlFor={`user-admission-${user.id}`} required error={error?.fieldErrors?.admissionYear}>
                <TextInput
                  id={`user-admission-${user.id}`}
                  name="admissionYear"
                  inputMode="numeric"
                  defaultValue={user.admissionYear ?? ''}
                  required
                />
              </Field>
              <Field label="Program" htmlFor={`user-program-${user.id}`} required error={error?.fieldErrors?.program}>
                <TextInput id={`user-program-${user.id}`} name="program" defaultValue={user.program ?? ''} required />
              </Field>
              <Field label="Batch" htmlFor={`user-batch-${user.id}`}>
                <TextInput id={`user-batch-${user.id}`} name="batch" defaultValue={user.batch ?? ''} />
              </Field>
            </>
          )}
        </div>
      ) : null}

      <div>
        <SubmitButton size="sm">Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function UserActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async () => setUserActiveAction({ userId, isActive: !isActive }) as Promise<ActionResult<unknown>>,
    null,
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <SubmitButton
        variant="ghost"
        size="sm"
        className={isActive ? 'text-danger' : 'text-success'}
        confirm={
          isActive
            ? 'Deactivate this account? The person will be signed out and unable to sign in again.'
            : undefined
        }
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      resetUserPassword({
        userId,
        newPassword: text(formData, 'newPassword'),
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <FormMessage state={state} success="Password reset. Existing sessions were revoked." />
      <Field
        label="New temporary password"
        htmlFor={`reset-${userId}`}
        required
        hint="At least 12 characters. Share it through a secure channel."
        error={error?.fieldErrors?.newPassword}
      >
        <TextInput
          id={`reset-${userId}`}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </Field>
      <div>
        <SubmitButton size="sm" variant="secondary" confirm="Reset this password and revoke existing sessions?">
          Reset password
        </SubmitButton>
      </div>
    </form>
  );
}
