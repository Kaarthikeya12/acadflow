import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { listStudentCourses } from '@/lib/data/student';
import {
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
import { formatDate } from '@/components/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My courses' };

export default async function StudentCoursesPage() {
  const viewer = await requirePageRole('student');
  const courses = await listStudentCourses(viewer);

  const active = courses.filter((course) => course.status === 'active');
  const past = courses.filter((course) => course.status !== 'active');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="My semester"
        title="My courses"
        description="Every offering you are enrolled in, with the faculty member and term on record."
        actions={
          <ButtonLink href="/student/schedule" variant="secondary" size="sm">
            Class schedule
          </ButtonLink>
        }
      />

      <section aria-labelledby="active-courses">
        <h2 id="active-courses" className="mb-3 text-base font-semibold tracking-[-0.015em]">
          Active courses
        </h2>
        {active.length === 0 ? (
          <EmptyState
            title="No active courses"
            description="You are not currently enrolled in an active offering. Contact academic operations if this looks wrong."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((course) => (
              <Card key={course.enrollmentId} className="flex flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium text-muted">{course.courseCode}</p>
                    <h3 className="mt-1 text-[0.95rem] font-semibold leading-snug tracking-[-0.01em]">
                      {course.courseTitle}
                    </h3>
                  </div>
                  <StatusBadge status={course.status} />
                </div>
                <dl className="flex flex-1 flex-col gap-3 px-5 py-4 text-sm">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Faculty
                    </dt>
                    <dd className="mt-0.5 font-medium">{course.facultyName}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Term
                    </dt>
                    <dd className="mt-0.5">
                      {course.termLabel} · {course.academicYear}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Enrolled
                    </dt>
                    <dd className="mt-0.5 text-muted">{formatDate(course.enrolledAt)}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-line px-5 py-3">
                  <Link
                    href={`/student/assignments?courseCode=${encodeURIComponent(course.courseCode)}`}
                    className="text-xs font-medium text-info hover:underline"
                  >
                    Coursework →
                  </Link>
                  <Link href="/student/attendance" className="text-xs font-medium text-info hover:underline">
                    Attendance →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="past-courses" className="mt-2">
        <h2 id="past-courses" className="mb-3 text-base font-semibold tracking-[-0.015em]">
          Past enrollments
        </h2>
        {past.length === 0 ? (
          <EmptyState
            compact
            title="No past enrollments"
            description="Completed or dropped enrollments will be listed here."
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Term</Th>
                <Th>Faculty</Th>
                <Th>Status</Th>
                <Th>Enrolled</Th>
              </tr>
            </thead>
            <tbody>
              {past.map((course) => (
                <tr key={course.enrollmentId} className="hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{course.courseCode}</p>
                    <p className="text-xs text-muted">{course.courseTitle}</p>
                  </Td>
                  <Td className="text-xs text-muted">
                    {course.termLabel}
                    <span className="block">{course.academicYear}</span>
                  </Td>
                  <Td className="text-xs">{course.facultyName}</Td>
                  <Td>
                    <StatusBadge status={course.status} />
                  </Td>
                  <Td className="text-xs text-muted">{formatDate(course.enrolledAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </section>
    </div>
  );
}
