'use client';

import { useActionState } from 'react';
import type { ActionResult, EnrollmentDTO, OfferingDTO } from '@/types/contracts';
import { enrollStudent, setEnrollmentStatus } from '@/lib/actions/admin';
import { canTransitionEnrollment } from '@/lib/authz/transitions';
import { Field, FormMessage, Select, SubmitButton } from '@/components/form';

type OfferingOption = Pick<OfferingDTO, 'id' | 'courseCode' | 'courseTitle' | 'termLabel' | 'academicYear' | 'status'>;
type StudentOption = { id: string; fullName: string; email: string; rollNo: string | null };

function errorOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.error : null;
}

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

const ENROLLMENT_STATUSES: Array<EnrollmentDTO['status']> = ['active', 'dropped', 'completed'];

export function EnrollmentCreateForm({
  offerings,
  students,
}: {
  offerings: OfferingOption[];
  students: StudentOption[];
}) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      enrollStudent({
        offeringId: value(formData, 'offeringId'),
        studentUserId: value(formData, 'studentUserId'),
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const error = errorOf(state);
  const activeOfferings = offerings.filter((offering) => offering.status === 'active');

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} success="Student enrolled. Reactivated rows keep their history." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Offering" htmlFor="enroll-offering" required error={error?.fieldErrors?.offeringId}>
          <Select id="enroll-offering" name="offeringId" required>
            {activeOfferings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.courseCode} · {offering.termLabel} {offering.academicYear}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Student" htmlFor="enroll-student" required error={error?.fieldErrors?.studentUserId}>
          <Select id="enroll-student" name="studentUserId" required>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.rollNo ? `${student.rollNo} — ` : ''}
                {student.fullName}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Enroll student</SubmitButton>
      </div>
    </form>
  );
}

export function EnrollmentStatusForm({ enrollment }: { enrollment: EnrollmentDTO }) {
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) =>
      setEnrollmentStatus({
        enrollmentId: enrollment.id,
        status: value(formData, 'status') as EnrollmentDTO['status'],
      }) as Promise<ActionResult<unknown>>,
    null,
  );
  const allowed = ENROLLMENT_STATUSES.filter((status) =>
    canTransitionEnrollment(enrollment.status, status),
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-1.5">
      <select
        name="status"
        defaultValue={enrollment.status}
        aria-label={`Status for ${enrollment.studentName}`}
        className="h-8 rounded-md border border-line bg-paper px-2 text-xs text-ink focus:border-ink focus:outline-none"
      >
        {allowed.map((status) => (
          <option key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>
      <SubmitButton size="sm" variant="ghost" confirm="Change this enrollment status?">
        Save
      </SubmitButton>
      {state && !state.ok ? <span className="text-[10px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}
