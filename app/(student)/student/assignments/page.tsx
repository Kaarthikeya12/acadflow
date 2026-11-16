import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { listAssignmentsForStudent } from '@/lib/data/student';
import { FilterBar, SelectFilter } from '@/components/filters';
import {
  Badge,
  ButtonLink,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDateTime, formatRelative, isPast } from '@/components/format';
import { one, type SearchParams } from '@/components/query';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My assignments' };

type Filter = 'all' | 'todo' | 'submitted' | 'graded';
const FILTERS: Filter[] = ['all', 'todo', 'submitted', 'graded'];

export default async function StudentAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('student');
  const params = await searchParams;
  const courseCode = one(params.courseCode);
  const filterRaw = one(params.filter);
  const filter: Filter = filterRaw && FILTERS.includes(filterRaw as Filter) ? (filterRaw as Filter) : 'all';

  const assignments = await listAssignmentsForStudent(viewer);
  const courses = Array.from(
    new Map(assignments.map((assignment) => [assignment.courseCode, assignment.courseTitle])).entries(),
  ).sort(([a], [b]) => a.localeCompare(b));

  const filtered = assignments
    .filter((assignment) => (courseCode ? assignment.courseCode === courseCode : true))
    .filter((assignment) => {
      if (filter === 'todo') return assignment.submissionId === null;
      if (filter === 'submitted') return assignment.submissionId !== null && assignment.gradeStatus !== 'released';
      if (filter === 'graded') return assignment.gradeStatus === 'released';
      return true;
    });

  const todo = assignments.filter((assignment) => assignment.submissionId === null).length;
  const released = assignments.filter((assignment) => assignment.gradeStatus === 'released').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Coursework"
        title="Assignments"
        description="Published work from all your active courses, newest due date first."
        actions={
          <ButtonLink href="/student/courses" variant="secondary" size="sm">
            My courses
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Published</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{assignments.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Not submitted</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{todo}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Marks released</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{released}</p>
        </div>
      </div>

      <FilterBar action="/student/assignments" resetHref="/student/assignments">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Course</label>
          <SelectFilter name="courseCode" defaultValue={courseCode}>
            <option value="">All courses</option>
            {courses.map(([code, title]) => (
              <option key={code} value={code}>
                {code} — {title}
              </option>
            ))}
          </SelectFilter>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Status</label>
          <SelectFilter name="filter" defaultValue={filterRaw}>
            <option value="all">All</option>
            <option value="todo">Not submitted</option>
            <option value="submitted">Submitted, awaiting marks</option>
            <option value="graded">Marks released</option>
          </SelectFilter>
        </div>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description={
            assignments.length === 0
              ? 'Published assignments from your courses will appear here.'
              : 'Adjust the filters and try again.'
          }
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Assignment</Th>
              <Th>Due</Th>
              <Th>Status</Th>
              <Th>Submission</Th>
              <Th align="right">Marks</Th>
              <Th align="right">Open</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((assignment) => {
              const overdue = assignment.submissionId === null && isPast(assignment.dueAt);
              return (
                <tr key={assignment.id} className="align-top hover:bg-surface/70">
                  <Td>
                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className="font-medium hover:underline"
                    >
                      {assignment.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {assignment.courseCode} · {assignment.courseTitle}
                    </p>
                  </Td>
                  <Td className="text-xs">
                    {formatDateTime(assignment.dueAt)}
                    <span className={`mt-0.5 block ${overdue ? 'font-medium text-danger' : 'text-muted'}`}>
                      {overdue ? 'Overdue' : formatRelative(assignment.dueAt)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={assignment.status} />
                      {assignment.gradeStatus ? (
                        <Badge tone={assignment.gradeStatus === 'released' ? 'success' : 'neutral'}>
                          {assignment.gradeStatus === 'released'
                            ? 'Marks released'
                            : assignment.gradeStatus === 'graded'
                              ? 'Graded'
                              : 'Awaiting marks'}
                        </Badge>
                      ) : null}
                    </div>
                  </Td>
                  <Td className="text-xs">
                    {assignment.submittedAt ? (
                      <>
                        {formatDateTime(assignment.submittedAt)}
                        {assignment.isLate ? (
                          <span className="mt-1 block">
                            <Badge tone="warning">Late</Badge>
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted">Not submitted</span>
                    )}
                  </Td>
                  <Td align="right" className="tabular-nums text-xs">
                    {assignment.gradeStatus === 'released' && assignment.marksAwarded !== null ? (
                      <>
                        <span className="font-medium">{assignment.marksAwarded}</span>
                        <span className="text-muted"> / {assignment.maxMarks}</span>
                      </>
                    ) : (
                      <span className="text-muted">— / {assignment.maxMarks}</span>
                    )}
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className="text-xs font-medium text-info hover:underline"
                    >
                      View →
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
