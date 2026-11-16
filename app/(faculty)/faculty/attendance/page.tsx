import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import {
  getOfferingAttendance,
  getSessionForFaculty,
  listMyOfferings,
  listOfferingSessions,
} from '@/lib/data/faculty';
import { AttendanceForm } from '@/components/faculty/attendance-form';
import { FilterBar, SelectFilter } from '@/components/filters';
import {
  Alert,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
  buttonClasses,
} from '@/components/ui';
import { formatDateTime, formatPercent, formatRelative } from '@/components/format';
import { one, type SearchParams } from '@/components/query';
import type { OfferingDTO, SessionDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Attendance' };

type SessionWithOffering = SessionDTO & { offering: OfferingDTO };

export default async function FacultyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('faculty');
  const params = await searchParams;
  const offeringId = one(params.offeringId);
  const sessionId = one(params.sessionId);

  const offerings = await listMyOfferings(viewer, { pageSize: 100 });
  const selectedSession = sessionId
    ? await getSessionForFaculty(viewer, sessionId).catch(() => null)
    : null;

  const summaryOfferingId = offeringId ?? selectedSession?.session.offeringId;
  const sessionsForList = offeringId
    ? offerings.items.filter((offering) => offering.id === offeringId)
    : offerings.items;

  const [groups, attendance] = await Promise.all([
    Promise.all(
      sessionsForList.map(async (offering) => ({
        offering,
        sessions: await listOfferingSessions(viewer, offering.id),
      })),
    ),
    summaryOfferingId ? getOfferingAttendance(viewer, summaryOfferingId) : Promise.resolve([]),
  ]);

  const sessions: SessionWithOffering[] = groups
    .flatMap((group) => group.sessions.map((session) => ({ ...session, offering: group.offering })))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const policyConfigured = attendance.some((row) => row.policyConfigured);
  const summaryOffering = offerings.items.find((offering) => offering.id === summaryOfferingId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Teaching"
        title="Attendance"
        description="Mark a session or review attendance counts for a whole offering. Every save is one transaction."
        actions={
          <ButtonLink href="/faculty/sessions" variant="secondary" size="sm">
            All sessions
          </ButtonLink>
        }
      />

      <FilterBar action="/faculty/attendance" resetHref="/faculty/attendance">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Offering</label>
          <SelectFilter name="offeringId" defaultValue={offeringId}>
            <option value="">All offerings</option>
            {offerings.items.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.courseCode} · {offering.termLabel} {offering.academicYear}
              </option>
            ))}
          </SelectFilter>
        </div>
      </FilterBar>

      {sessionId && !selectedSession ? (
        <Alert tone="danger" title="Session not found">
          That session does not belong to one of your offerings, or it no longer exists.
        </Alert>
      ) : null}

      {selectedSession ? (
        <Card>
          <CardHeader
            title="Mark attendance"
            description="Only students you explicitly mark are changed; unmarked rows keep their previous status."
            action={
              <Link href="/faculty/attendance" className="text-xs font-medium text-muted hover:text-ink">
                Clear selection →
              </Link>
            }
          />
          <div className="p-5">
            <AttendanceForm session={selectedSession.session} roster={selectedSession.roster} />
          </div>
        </Card>
      ) : null}

      {!policyConfigured && attendance.length > 0 ? (
        <Alert tone="warning" title="Attendance policy is not configured">
          Percentages stay blank until the institution records its excused, unmarked and denominator
          policy. Raw counts are still accurate.
        </Alert>
      ) : null}

      {summaryOfferingId ? (
        <Card>
          <CardHeader
            title="Attendance by student"
            description={
              summaryOffering
                ? `${summaryOffering.courseCode} · ${summaryOffering.termLabel} ${summaryOffering.academicYear}`
                : 'Counts for the selected session’s offering.'
            }
            action={
              policyConfigured ? (
                <span className="text-xs text-muted">Policy applied</span>
              ) : (
                <span className="text-xs text-muted">Policy pending</span>
              )
            }
          />
          {attendance.length === 0 ? (
            <div className="p-5">
              <EmptyState compact title="No attendance data" description="Attendance counts appear once students are enrolled and sessions exist." />
            </div>
          ) : (
            <TableShell className="rounded-none border-0">
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th align="right">Sessions</Th>
                  <Th align="right">Present</Th>
                  <Th align="right">Absent</Th>
                  <Th align="right">Excused</Th>
                  <Th align="right">Unmarked</Th>
                  <Th align="right">Attendance</Th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.enrollmentId} className="hover:bg-surface/70">
                    <Td>
                      <p className="font-medium">{row.studentName}</p>
                      <p className="font-mono text-[11px] text-muted">{row.rollNo}</p>
                    </Td>
                    <Td align="right" className="tabular-nums">{row.sessionsTotal}</Td>
                    <Td align="right" className="tabular-nums">{row.present}</Td>
                    <Td align="right" className="tabular-nums">{row.absent}</Td>
                    <Td align="right" className="tabular-nums">{row.excused}</Td>
                    <Td align="right" className="tabular-nums">{row.unmarked}</Td>
                    <Td align="right" className="font-medium tabular-nums">
                      {formatPercent(row.attendancePercent)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Sessions"
          description="Choose a session to open its register."
        />
        {sessions.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              title="No sessions found"
              description="Schedule a session from an offering workspace to begin marking attendance."
            />
          </div>
        ) : (
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Offering</Th>
                <Th>Starts</Th>
                <Th>Status</Th>
                <Th align="right">Marked</Th>
                <Th align="right">Open</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{session.topic}</p>
                    <p className="text-xs text-muted">{formatRelative(session.startsAt)}</p>
                  </Td>
                  <Td className="text-xs">
                    {session.offering.courseCode}
                    <span className="block text-muted">Section {session.offering.sectionCode}</span>
                  </Td>
                  <Td className="text-xs">{formatDateTime(session.startsAt)}</Td>
                  <Td>
                    <StatusBadge status={session.status} />
                  </Td>
                  <Td align="right" className="tabular-nums text-xs">
                    {session.attendanceMarkedCount}/{session.rosterCount}
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/faculty/attendance?offeringId=${session.offering.id}&sessionId=${session.id}`}
                      className={buttonClasses(session.id === sessionId ? 'primary' : 'secondary', 'sm')}
                    >
                      {session.id === sessionId ? 'Open' : 'Mark'}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
