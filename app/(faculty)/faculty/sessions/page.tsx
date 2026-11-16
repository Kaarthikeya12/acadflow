import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { listMyOfferings, listOfferingSessions } from '@/lib/data/faculty';
import { FilterBar, SelectFilter } from '@/components/filters';
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
  buttonClasses,
} from '@/components/ui';
import { formatDateTime, formatRelative, isPast } from '@/components/format';
import { one, type SearchParams } from '@/components/query';
import type { OfferingDTO, SessionDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Class sessions' };

type SessionWithOffering = SessionDTO & { offering: OfferingDTO };

export default async function FacultySessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('faculty');
  const params = await searchParams;
  const offeringId = one(params.offeringId);
  const statusRaw = one(params.status);
  const status =
    statusRaw === 'scheduled' || statusRaw === 'completed' || statusRaw === 'cancelled'
      ? statusRaw
      : undefined;

  const offerings = await listMyOfferings(viewer, { pageSize: 100 });
  const selectedOfferings = offeringId
    ? offerings.items.filter((offering) => offering.id === offeringId)
    : offerings.items;

  const groups = await Promise.all(
    selectedOfferings.map(async (offering) => ({
      offering,
      sessions: await listOfferingSessions(viewer, offering.id),
    })),
  );

  const sessions: SessionWithOffering[] = groups
    .flatMap((group) => group.sessions.map((session) => ({ ...session, offering: group.offering })))
    .filter((session) => (status ? session.status === status : true))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const upcoming = sessions.filter(
    (session) => session.status === 'scheduled' && !isPast(session.startsAt),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Teaching"
        title="Class sessions"
        description="Every session across your offerings. Open a session to record attendance or adjust its details."
        actions={
          <ButtonLink href="/faculty/offerings" variant="secondary" size="sm">
            My offerings
          </ButtonLink>
        }
      />

      <FilterBar action="/faculty/sessions" resetHref="/faculty/sessions">
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
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Status</label>
          <SelectFilter name="status" defaultValue={statusRaw}>
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </SelectFilter>
        </div>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">All sessions</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{sessions.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Upcoming</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{upcoming.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Awaiting attendance</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
            {sessions.filter((session) => session.attendanceMarkedCount === 0 && session.status !== 'cancelled').length}
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions found"
          description={
            offeringId || statusRaw
              ? 'No sessions match these filters.'
              : 'Open an offering workspace to schedule the first class session.'
          }
          action={
            <ButtonLink href="/faculty/offerings" size="sm" variant="secondary">
              Choose an offering
            </ButtonLink>
          }
        />
      ) : (
        <TableShell>
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
              <tr key={session.id} className="align-top hover:bg-surface/70">
                <Td>
                  <p className="font-medium">{session.topic}</p>
                  <p className="text-xs text-muted">{formatRelative(session.startsAt)}</p>
                </Td>
                <Td className="text-xs">
                  <Link
                    href={`/faculty/offerings/${session.offering.id}`}
                    className="font-medium hover:underline"
                  >
                    {session.offering.courseCode}
                  </Link>
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
                    href={`/faculty/offerings/${session.offering.id}?tab=attendance&sessionId=${session.id}`}
                    className={buttonClasses('secondary', 'sm')}
                  >
                    Attendance
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
