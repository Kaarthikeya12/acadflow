import Link from 'next/link';
import { getAdminDashboard } from '@/lib/data/admin';
import { requirePageRole } from '@/lib/authz/guards';
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
import { formatDate } from '@/components/format';
import { ArrowRightIcon, BuildingIcon, CalendarIcon, UsersIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin dashboard' };

export default async function AdminDashboardPage() {
  const viewer = await requirePageRole('admin');
  const data = await getAdminDashboard(viewer);

  const quickActions = [
    { label: 'Add a department', href: '/admin/departments', icon: BuildingIcon },
    { label: 'Create a course', href: '/admin/courses', icon: BuildingIcon },
    { label: 'Provision a user', href: '/admin/users', icon: UsersIcon },
    { label: 'Open a term', href: '/admin/terms', icon: CalendarIcon },
  ];

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="Institution overview"
        title={`Good to see you, ${viewer.fullName.split(' ')[0]}.`}
        description="Live counts, the current academic term and the latest offerings — all read from PostgreSQL."
        actions={
          <>
            <ButtonLink href="/admin/offerings" variant="secondary" size="sm">
              Course offerings
            </ButtonLink>
            <ButtonLink href="/admin/users" size="sm">
              Provision a user
            </ButtonLink>
          </>
        }
      />

      <section aria-labelledby="counts-heading">
        <h2 id="counts-heading" className="sr-only">
          Institution counts
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Active students"
            value={data.counts.students}
            hint="Accounts that can sign in"
            href="/admin/users?role=student&isActive=true"
          />
          <StatCard
            label="Faculty"
            value={data.counts.faculty}
            hint="Teaching accounts"
            href="/admin/users?role=faculty&isActive=true"
          />
          <StatCard
            label="Departments"
            value={data.counts.departments}
            hint="Active academic units"
            href="/admin/departments"
          />
          <StatCard
            label="Courses"
            value={data.counts.courses}
            hint="Active catalogue entries"
            href="/admin/courses"
          />
          <StatCard
            label="Active offerings"
            value={data.counts.activeOfferings}
            hint="Sections open this cycle"
            href="/admin/offerings?status=active"
          />
          <StatCard
            label="Active enrollments"
            value={data.counts.activeEnrollments}
            hint="Students on live rosters"
            href="/admin/enrollments?status=active"
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Recent course offerings"
            description="The newest sections created in the institution."
            action={
              <Link href="/admin/offerings" className="text-xs font-medium text-muted hover:text-ink">
                View all →
              </Link>
            }
          />
          {data.recentOfferings.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                title="No offerings yet"
                description="Create an offering once a course, term and faculty member are in place."
                action={
                  <ButtonLink href="/admin/offerings" size="sm">
                    Create an offering
                  </ButtonLink>
                }
              />
            </div>
          ) : (
            <TableShell className="rounded-none border-0">
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Term</Th>
                  <Th>Faculty</Th>
                  <Th>Status</Th>
                  <Th align="right">Roster</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentOfferings.map((offering) => (
                  <tr key={offering.id} className="hover:bg-surface/70">
                    <Td>
                      <Link
                        href={`/admin/enrollments?offeringId=${offering.id}`}
                        className="font-medium hover:underline"
                      >
                        {offering.courseCode}
                      </Link>
                      <p className="text-xs text-muted">{offering.courseTitle}</p>
                    </Td>
                    <Td className="text-xs text-muted">
                      {offering.termLabel}
                      <span className="block">{offering.academicYear}</span>
                    </Td>
                    <Td className="text-xs">{offering.facultyName}</Td>
                    <Td>
                      <StatusBadge status={offering.status} />
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {offering.enrolledCount}
                      {offering.capacity ? ` / ${offering.capacity}` : ''}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title="Current term"
              description="Drives the term label on new offerings."
              action={
                <Link href="/admin/terms" className="text-xs font-medium text-muted hover:text-ink">
                  Manage →
                </Link>
              }
            />
            <div className="p-5">
              {data.currentTerm ? (
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="success">Current</Badge>
                    <span className="text-xs text-muted">{data.currentTerm.academicYear}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                    {data.currentTerm.label}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(data.currentTerm.startsOn)} — {formatDate(data.currentTerm.endsOn)}
                  </p>
                </div>
              ) : (
                <EmptyState
                  compact
                  title="No current term"
                  description="Set one term as current so the institution has a shared reference point."
                  action={
                    <ButtonLink href="/admin/terms" size="sm" variant="secondary">
                      Choose a term
                    </ButtonLink>
                  }
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Needs attention" description="Operational queues across the institution." />
            <dl className="divide-y divide-line">
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <dt className="text-sm font-medium">Upcoming sessions</dt>
                  <dd className="text-xs text-muted">Scheduled from now onward</dd>
                </div>
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {data.upcomingSessions}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <dt className="text-sm font-medium">Pending evaluations</dt>
                  <dd className="text-xs text-muted">Submissions awaiting marks</dd>
                </div>
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {data.pendingEvaluations}
                </span>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Quick actions" description="Jump straight into a setup task." />
        <div className="grid gap-px overflow-hidden rounded-b-lg bg-line sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center justify-between gap-3 bg-paper px-5 py-4 transition-colors hover:bg-surface"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <Icon size={16} className="text-muted group-hover:text-ink" />
                  {action.label}
                </span>
                <ArrowRightIcon size={15} className="text-muted group-hover:text-ink" />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
