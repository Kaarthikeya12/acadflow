'use client';

import { useActionState, useRef } from 'react';
import type { ActionResult, AttendanceRowDTO, SessionDTO } from '@/types/contracts';
import { saveAttendance } from '@/lib/actions/faculty';
import { FormMessage, SubmitButton } from '@/components/form';
import { Badge, TableShell, Td, Th, buttonClasses } from '@/components/ui';
import { formatDateTime } from '@/components/format';

type Status = 'present' | 'absent' | 'excused';

const OPTIONS: Array<{ value: Status; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
];

export function AttendanceForm({
  session,
  roster,
}: {
  session: SessionDTO;
  roster: AttendanceRowDTO[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => {
      const entries = roster
        .map((row) => {
          const status = formData.get(`status-${row.enrollmentId}`);
          if (typeof status !== 'string' || !status) return null;
          return { enrollmentId: row.enrollmentId, status: status as Status };
        })
        .filter((entry): entry is { enrollmentId: string; status: Status } => entry !== null);

      if (entries.length === 0) {
        return {
          ok: false as const,
          error: {
            code: 'VALIDATION_ERROR' as const,
            message: 'Mark at least one student before saving.',
            requestId: 'client',
          },
        };
      }
      return saveAttendance({ sessionId: session.id, entries }) as Promise<ActionResult<unknown>>;
    },
    null,
  );

  const markAllPresent = () => {
    const radios = formRef.current?.querySelectorAll<HTMLInputElement>(
      'input[type="radio"][value="present"]',
    );
    radios?.forEach((radio) => {
      radio.checked = true;
    });
  };

  const marked = roster.filter((row) => row.status !== null).length;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line band-muted px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{session.topic}</p>
          <p className="text-xs text-muted">
            {formatDateTime(session.startsAt)} · {roster.length} enrolled ·{' '}
            {marked === 0 ? 'not marked yet' : `${marked} already saved`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={markAllPresent} className={buttonClasses('secondary', 'sm')}>
            Mark all present
          </button>
          <Badge tone="neutral">One transaction</Badge>
        </div>
      </div>

      <FormMessage state={state} success="Attendance saved for every marked student." />

      {roster.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          There are no actively enrolled students in this offering.
        </p>
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Roll number</Th>
              <Th>Previously saved</Th>
              <Th>Mark for this session</Th>
            </tr>
          </thead>
          <tbody>
            {roster.map((row) => (
              <tr key={row.enrollmentId} className="hover:bg-surface/60">
                <Td className="font-medium">{row.studentName}</Td>
                <Td className="font-mono text-xs">{row.rollNo}</Td>
                <Td>
                  {row.status ? (
                    <Badge
                      tone={
                        row.status === 'present' ? 'success' : row.status === 'absent' ? 'danger' : 'info'
                      }
                    >
                      {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted">Unmarked</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-3">
                    {OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium"
                      >
                        <input
                          type="radio"
                          name={`status-${row.enrollmentId}`}
                          value={option.value}
                          defaultChecked={row.status === option.value}
                          className="h-3.5 w-3.5 accent-ink"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Save attendance</SubmitButton>
        <p className="text-xs text-muted">
          Unmarked students stay unmarked. Their saved status is never overwritten by a blank choice.
        </p>
      </div>
    </form>
  );
}
