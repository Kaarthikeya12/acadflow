import { requirePageRole } from '@/lib/authz/guards';
import { getStudentAttendance } from '@/lib/data/student';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDateTime, formatPercent } from '@/components/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My attendance' };

export default async function StudentAttendancePage() {
  const viewer = await requirePageRole('student');
  const { summaries, history } = await getStudentAttendance(viewer);
  const policyConfigured = summaries.some((summary) => summary.policyConfigured);

  const totals = summaries.reduce(
    (accumulator, summary) => ({
      present: accumulator.present + summary.present,
      absent: accumulator.absent + summary.absent,
      excused: accumulator.excused + summary.excused,
      unmarked: accumulator.unmarked + summary.unmarked,
    }),
    { present: 0, absent: 0, excused: 0, unmarked: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Coursework"
        title="My attendance"
        description="Session-wise attendance recorded by your faculty, with totals by course."
        actions={
          <ButtonLink href="/student/schedule" variant="secondary" size="sm">
            Class schedule
          </ButtonLink>
        }
      />

      {!policyConfigured && summaries.length > 0 ? (
        <Alert tone="warning" title="Attendance policy is not configured">
          Your attendance counts are live. Percentages stay blank until the institution records its
          excused, unmarked and denominator policy.
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Present</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{totals.present}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Absent</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{totals.absent}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Excused</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{totals.excused}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Unmarked</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{totals.unmarked}</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Attendance by course"
          description={
            policyConfigured
              ? 'Percentages follow the institution attendance policy.'
              : 'Counts are live; percentages require a configured policy.'
          }
        />
        {summaries.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              title="No attendance recorded"
              description="Attendance summaries appear once faculty mark sessions for your courses."
            />
          </div>
        ) : (
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Course</Th>
                <Th align="right">Sessions</Th>
                <Th align="right">Present</Th>
                <Th align="right">Absent</Th>
                <Th align="right">Excused</Th>
                <Th align="right">Unmarked</Th>
                <Th align="right">Attendance</Th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.offeringId} className="hover:bg-surface/70">
                  <Td className="font-mono text-xs font-medium">{summary.courseCode}</Td>
                  <Td align="right" className="tabular-nums">{summary.sessionsCounted}</Td>
                  <Td align="right" className="tabular-nums">{summary.present}</Td>
                  <Td align="right" className="tabular-nums">{summary.absent}</Td>
                  <Td align="right" className="tabular-nums">{summary.excused}</Td>
                  <Td align="right" className="tabular-nums">{summary.unmarked}</Td>
                  <Td align="right" className="font-medium tabular-nums">
                    {summary.policyConfigured ? formatPercent(summary.attendancePercent) : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Session history"
          description="Every attendance record attached to you, newest first."
          action={<Badge tone="neutral">Read-only</Badge>}
        />
        {history.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              title="No session records"
              description="Your attendance history appears after the first session is marked."
            />
          </div>
        ) : (
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Course</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.sessionId} className="hover:bg-surface/70">
                  <Td className="font-medium">{record.topic}</Td>
                  <Td className="font-mono text-xs">{record.courseCode}</Td>
                  <Td className="text-xs text-muted">{formatDateTime(record.startsAt)}</Td>
                  <Td>
                    {record.status ? <StatusBadge status={record.status} /> : <Badge tone="neutral">Unmarked</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <p className="text-xs leading-relaxed text-muted">
        Attendance is recorded by faculty and cannot be edited from your account. If something looks
        wrong, raise it with the faculty member teaching the course.
      </p>
    </div>
  );
}
