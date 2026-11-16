import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { getFacultyDashboard } from '@/lib/data/faculty';
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDateTime, formatRelative, pluralize } from '@/components/format';
import { CalendarIcon, ClipboardIcon, FileIcon, GridIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Faculty dashboard' };

export default async function FacultyDashboardPage() {
  const viewer = await requirePageRole('faculty');
  const data = await getFacultyDashboard(viewer);

  const activeOfferings = data.offerings.filter((offering) => offering.status === 'active');
  const nextSession = data.upcomingSessions[0];
  const firstName = viewer.fullName.split(' ')[0];

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="Teaching overview"
        title={`${firstName}, here is your teaching week.`}
        description="Your live offerings, the next class sessions and everything still waiting to be graded."
        actions={
          <>
            <ButtonLink href="/faculty/offerings" variant="secondary" size="sm">
              My offerings
            </ButtonLink>
            <ButtonLink href="/faculty/attendance" size="sm">
              Mark attendance
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Teaching counts" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My offerings"
          value={data.offerings.length}
          hint={`${activeOfferings.length} currently active`}
          href="/faculty/offerings"
        />
        <StatCard
          label="Upcoming sessions"
          value={data.upcomingSessions.length}
          hint="Scheduled from now onward"
          href="/faculty/sessions"
        />
        <StatCard
          label="Pending submissions"
          value={data.pendingSubmissions}
          hint="Awaiting marks"
          href="/faculty/submissions?gradeStatus=pending"
        />
        <StatCard
          label="Graded this week"
          value={data.recentGraded}
          hint="Last seven days"
          href="/faculty/submissions"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Upcoming class sessions"
            description="The next sessions across every offering you teach."
            action={
              <Link href="/faculty/sessions" className="text-xs font-medium text-muted hover:text-ink">
                All sessions →
              </Link>
            }
          />
          {data.upcomingSessions.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                title="No sessions scheduled"
                description="Open an offering and schedule the next class session."
                action={
                  <ButtonLink href="/faculty/offerings" size="sm" variant="secondary">
                    Choose an offering
                  </ButtonLink>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.upcomingSessions.map((session) => {
                const offering = data.offerings.find((item) => item.id === session.offeringId);
                return (
                  <li key={session.id}>
                    <Link
                      href={`/faculty/offerings/${session.offeringId}?tab=attendance&sessionId=${session.id}`}
                      className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface"
                    >
                      <div className="flex min-w-0 gap-3">
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-surface">
                          <CalendarIcon size={16} className="text-muted" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{session.topic}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {offering ? `${offering.courseCode} · Section ${offering.sectionCode}` : 'Offering'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{formatDateTime(session.startsAt)}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {formatRelative(session.startsAt)} · {session.attendanceMarkedCount}/
                          {session.rosterCount} marked
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden">
            <div className="band-muted border-b border-line px-5 py-4">
              <p className="eyebrow">Next up</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em]">
                {nextSession ? nextSession.topic : 'Nothing scheduled'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {nextSession
                  ? `${formatDateTime(nextSession.startsAt)} · ${formatRelative(nextSession.startsAt)}`
                  : 'Schedule a session from any offering workspace.'}
              </p>
            </div>
            {nextSession ? (
              <div className="flex flex-wrap gap-2 p-5">
                <ButtonLink
                  href={`/faculty/offerings/${nextSession.offeringId}?tab=attendance&sessionId=${nextSession.id}`}
                  size="sm"
                >
                  Open session
                </ButtonLink>
                <ButtonLink
                  href={`/faculty/offerings/${nextSession.offeringId}`}
                  size="sm"
                  variant="secondary"
                >
                  Offering overview
                </ButtonLink>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState compact title="No next session" description="Add a session to your nearest offering." />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Queues" description="Where attention is needed right now." />
            <dl className="divide-y divide-line">
              <Link
                href="/faculty/submissions?gradeStatus=pending"
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <FileIcon size={16} className="text-muted" />
                  <div>
                    <dt className="text-sm font-medium">Submissions to grade</dt>
                    <dd className="text-xs text-muted">Not yet marked</dd>
                  </div>
                </div>
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {data.pendingSubmissions}
                </span>
              </Link>
              <Link
                href="/faculty/attendance"
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <ClipboardIcon size={16} className="text-muted" />
                  <div>
                    <dt className="text-sm font-medium">Attendance registers</dt>
                    <dd className="text-xs text-muted">Mark or review sessions</dd>
                  </div>
                </div>
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {data.upcomingSessions.length}
                </span>
              </Link>
              <Link
                href="/faculty/gradebook"
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <GridIcon size={16} className="text-muted" />
                  <div>
                    <dt className="text-sm font-medium">Final gradebooks</dt>
                    <dd className="text-xs text-muted">Compute and publish results</dd>
                  </div>
                </div>
                <Badge tone="neutral">{pluralize(data.offerings.length, 'offering')}</Badge>
              </Link>
            </dl>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="My offerings"
          description="Courses you are teaching this cycle."
          action={
            <Link href="/faculty/offerings" className="text-xs font-medium text-muted hover:text-ink">
              View all →
            </Link>
          }
        />
        {data.offerings.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No offerings assigned"
              description="An administrator assigns faculty to each offering. Contact academic operations if something is missing."
            />
          </div>
        ) : (
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Term</Th>
                <Th>Section</Th>
                <Th>Status</Th>
                <Th align="right">Roster</Th>
                <Th align="right">Workspace</Th>
              </tr>
            </thead>
            <tbody>
              {data.offerings.slice(0, 6).map((offering) => (
                <tr key={offering.id} className="hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{offering.courseCode}</p>
                    <p className="max-w-xs text-xs text-muted">{offering.courseTitle}</p>
                  </Td>
                  <Td className="text-xs text-muted">
                    {offering.termLabel}
                    <span className="block">{offering.academicYear}</span>
                  </Td>
                  <Td className="font-mono text-xs">{offering.sectionCode}</Td>
                  <Td>
                    <StatusBadge status={offering.status} />
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {offering.enrolledCount}
                    {offering.capacity ? ` / ${offering.capacity}` : ''}
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/faculty/offerings/${offering.id}`}
                      className="text-xs font-medium text-info hover:underline"
                    >
                      Open →
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
