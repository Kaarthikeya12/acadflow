import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { listMyOfferings, listOfferingAssignments } from '@/lib/data/faculty';
import {
  AssignmentEditForm,
  CloseAssignmentButton,
  PublishAssignmentButton,
} from '@/components/faculty/assignment-forms';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import { Disclosure } from '@/components/form';
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
import { formatDateTime, formatRelative } from '@/components/format';
import { one, type SearchParams } from '@/components/query';
import type { AssignmentDTO, OfferingDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assignments' };

type AssignmentWithOffering = AssignmentDTO & { offering: OfferingDTO };
const STATUSES: Array<AssignmentDTO['status']> = ['draft', 'published', 'closed'];

export default async function FacultyAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('faculty');
  const params = await searchParams;
  const offeringId = one(params.offeringId);
  const q = one(params.q)?.toLowerCase();
  const statusRaw = one(params.status);
  const status =
    statusRaw && STATUSES.includes(statusRaw as AssignmentDTO['status'])
      ? (statusRaw as AssignmentDTO['status'])
      : undefined;

  const offerings = await listMyOfferings(viewer, { pageSize: 100 });
  const selectedOfferings = offeringId
    ? offerings.items.filter((offering) => offering.id === offeringId)
    : offerings.items;

  const groups = await Promise.all(
    selectedOfferings.map(async (offering) => ({
      offering,
      assignments: await listOfferingAssignments(viewer, offering.id),
    })),
  );

  const assignments: AssignmentWithOffering[] = groups
    .flatMap((group) => group.assignments.map((assignment) => ({ ...assignment, offering: group.offering })))
    .filter((assignment) => (status ? assignment.status === status : true))
    .filter((assignment) =>
      q
        ? assignment.title.toLowerCase().includes(q) ||
          assignment.courseCode.toLowerCase().includes(q) ||
          assignment.offering.courseTitle.toLowerCase().includes(q)
        : true,
    )
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());

  const pendingGrading = assignments.reduce(
    (sum, assignment) => sum + Math.max(assignment.submissionCount - assignment.gradedCount, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Assessment"
        title="Assignments"
        description="Every assignment across your offerings, with drafts, due dates and grading progress."
        actions={
          <ButtonLink href="/faculty/offerings" variant="secondary" size="sm">
            My offerings
          </ButtonLink>
        }
      />

      <FilterBar action="/faculty/assignments" resetHref="/faculty/assignments">
        <div className="flex flex-col gap-1">
          <label htmlFor="assignment-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Search
          </label>
          <SearchFilter id="assignment-search" defaultValue={one(params.q)} placeholder="Title or course" />
        </div>
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
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </SelectFilter>
        </div>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Assignments shown</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{assignments.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Drafts</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
            {assignments.filter((assignment) => assignment.status === 'draft').length}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Awaiting grading</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{pendingGrading}</p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description={
            offeringId || q || status
              ? 'No assignments match these filters.'
              : 'Create an assignment inside an offering workspace. Drafts are created there first.'
          }
          action={
            <ButtonLink href="/faculty/offerings" size="sm" variant="secondary">
              Open an offering
            </ButtonLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-lg border border-line bg-paper">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[0.95rem] font-semibold tracking-[-0.01em]">{assignment.title}</h3>
                    <StatusBadge status={assignment.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    <Link
                      href={`/faculty/offerings/${assignment.offering.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {assignment.offering.courseCode}
                    </Link>{' '}
                    · {assignment.offering.termLabel} {assignment.offering.academicYear}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p>Due {formatDateTime(assignment.dueAt)}</p>
                  <p>{formatRelative(assignment.dueAt)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex flex-wrap gap-5 text-xs text-muted">
                  <span>
                    <span className="font-semibold text-ink tabular-nums">{assignment.submissionCount}</span>{' '}
                    submitted
                  </span>
                  <span>
                    <span className="font-semibold text-ink tabular-nums">{assignment.gradedCount}</span>{' '}
                    graded
                  </span>
                  <span>{assignment.maxMarks} marks</span>
                  <span>Late penalty {assignment.latePenaltyPercent}%</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/faculty/submissions?assignmentId=${assignment.id}`}
                    className={buttonClasses('secondary', 'sm')}
                  >
                    Submissions
                  </Link>
                  <Link
                    href={`/faculty/offerings/${assignment.offering.id}?tab=assignments`}
                    className={buttonClasses('ghost', 'sm')}
                  >
                    Offering
                  </Link>
                  {assignment.status === 'draft' ? <PublishAssignmentButton assignmentId={assignment.id} /> : null}
                  {assignment.status === 'published' ? <CloseAssignmentButton assignmentId={assignment.id} /> : null}
                  <Disclosure summary="Edit" tone="ghost">
                    <div className="w-[min(78vw,48rem)]">
                      <AssignmentEditForm assignment={assignment} />
                    </div>
                  </Disclosure>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
