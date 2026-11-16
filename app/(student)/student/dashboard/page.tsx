import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { getStudentDashboard } from '@/lib/data/student';
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
import {
  formatDateTime,
  formatPercent,
  formatRelative,
  pluralize,
} from '@/components/format';
import { CalendarIcon, FileIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Student dashboard' };

export default async function StudentDashboardPage() {
  const viewer = await requirePageRole('student');
  const data = await getStudentDashboard(viewer);

  const firstName = viewer.fullName.split(' ')[0];
  const nextSession = data.upcomingSessions[0];
  const policyConfigured = data.attendance.some((row) => row.policyConfigured);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="My semester"
        title={`Hello, ${firstName}.`}
        description="Your classes, coursework and results for the current term — read directly from the institution record."
        actions={
          <>
            <ButtonLink href="/student/schedule" variant="secondary" size="sm">
              Class schedule
            </ButtonLink>
            <ButtonLink href="/student/assignments" size="sm">
              Open assignments
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Semester counts" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My courses"
          value={data.courses.length}
          hint="Active enrollments"
          href="/student/courses"
        />
        <StatCard
          label="Upcoming classes"
          value={data.upcomingSessions.length}
          hint="Scheduled from now onward"
          href="/student/schedule"
        />
        <StatCard
          label="Open coursework"
          value={data.upcomingAssignments.length}
          hint="Still to submit or awaiting marks"
          href="/student/assignments"
        />
        <StatCard
          label="Published grades"
          value={data.publishedGrades.length}
          hint="Final results released to you"
          href="/student/grades"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            title="Next classes"
            description="Your nearest scheduled sessions."
            action={
              <Link href="/student/schedule" className="text-xs font-medium text-muted hover:text-ink">
                Full schedule →
              </Link>
            }
          />
          {data.upcomingSessions.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                title="No upcoming classes"
                description="Scheduled sessions appear here once faculty add them to your courses."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.upcomingSessions.map((session) => (
                <li key={session.sessionId} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-surface">
                      <CalendarIcon size={16} className="text-muted" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{session.topic}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {session.courseCode} · {session.facultyName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{formatDateTime(session.startsAt)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatRelative(session.startsAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="band-muted border-b border-line px-5 py-4">
            <p className="eyebrow">Next class</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.02em]">
              {nextSession ? nextSession.topic : 'Nothing scheduled'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {nextSession
                ? `${nextSession.courseCode} · ${formatDateTime(nextSession.startsAt)}`
                : 'Your timetable is currently clear.'}
            </p>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div>
              <p className="eyebrow">Attendance</p>
              <p className="mt-2 text-sm text-muted">
                {policyConfigured
                  ? 'Percentages follow the institution attendance policy.'
                  : 'Your attendance counts are live. Percentages appear once the institution configures its policy.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/student/attendance" size="sm" variant="secondary">
                View attendance
              </ButtonLink>
              <ButtonLink href="/student/assignments" size="sm">
                Coursework
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Coursework needing attention"
            description="Published assignments you have not submitted or that are still ungraded."
            action={
              <Link href="/student/assignments" className="text-xs font-medium text-muted hover:text-ink">
                All assignments →
              </Link>
            }
          />
          {data.upcomingAssignments.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                title="Nothing due"
                description="You are up to date on published coursework."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.upcomingAssignments.map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    href={`/student/assignments/${assignment.id}`}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 hover:bg-surface"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-surface">
                        <FileIcon size={15} className="text-muted" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{assignment.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {assignment.courseCode} · {assignment.maxMarks} marks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{formatDateTime(assignment.dueAt)}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {assignment.submissionId ? 'Submitted' : formatRelative(assignment.dueAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="My courses"
            description="Active enrollments for the current and recent terms."
            action={
              <Link href="/student/courses" className="text-xs font-medium text-muted hover:text-ink">
                View all →
              </Link>
            }
          />
          {data.courses.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                title="No active courses"
                description="An administrator enrolls you in offerings each term."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.courses.map((course) => (
                <li key={course.enrollmentId} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span className="font-mono">{course.courseCode}</span> · {course.courseTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {course.facultyName} · {course.termLabel} {course.academicYear}
                    </p>
                  </div>
                  <StatusBadge status={course.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Published final grades"
          description="Only grades released by faculty appear here."
          action={
            <Link href="/student/grades" className="text-xs font-medium text-muted hover:text-ink">
              All grades →
            </Link>
          }
        />
        {data.publishedGrades.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              title="No published grades yet"
              description="Final results appear after faculty compute and publish them."
            />
          </div>
        ) : (
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Course</Th>
                <Th align="right">Attendance</Th>
                <Th align="right">Coursework</Th>
                <Th align="right">Final</Th>
                <Th>Letter</Th>
                <Th>Published</Th>
              </tr>
            </thead>
            <tbody>
              {data.publishedGrades.map((grade) => (
                <tr key={grade.enrollmentId} className="hover:bg-surface/70">
                  <Td className="font-mono text-xs font-medium">{grade.courseCode}</Td>
                  <Td align="right" className="tabular-nums">{formatPercent(grade.attendancePercent)}</Td>
                  <Td align="right" className="tabular-nums">{formatPercent(grade.courseworkPercent)}</Td>
                  <Td align="right" className="font-medium tabular-nums">{formatPercent(grade.finalPercent)}</Td>
                  <Td className="font-mono text-xs">{grade.letterGrade ?? '—'}</Td>
                  <Td className="text-xs text-muted">
                    {grade.publishedAt ? formatDateTime(grade.publishedAt) : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
        <div className="border-t border-line px-5 py-3">
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone="neutral">{pluralize(data.courses.length, 'active course')}</Badge>
            Grades are official only after publication.
          </p>
        </div>
      </Card>
    </div>
  );
}
