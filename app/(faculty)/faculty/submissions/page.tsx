import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { getAssignmentSubmissions, listMyOfferings, listOfferingAssignments } from '@/lib/data/faculty';
import { GradeSubmissionForm, ReleaseGradeButton } from '@/components/faculty/grading-forms';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import { Disclosure } from '@/components/form';
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDateTime, formatRelative } from '@/components/format';
import { one, type SearchParams } from '@/components/query';
import { DownloadIcon } from '@/components/icons';
import type { AssignmentDTO, OfferingDTO, SubmissionDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Submissions' };

type AssignmentWithOffering = AssignmentDTO & { offering: OfferingDTO };
type SubmissionRow = SubmissionDTO & { assignment: AssignmentWithOffering };

function gradeStatusOf(value: string | undefined): SubmissionDTO['gradeStatus'] | undefined {
  return value === 'pending' || value === 'graded' || value === 'released' ? value : undefined;
}

export default async function FacultySubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('faculty');
  const params = await searchParams;
  const offeringId = one(params.offeringId);
  const assignmentId = one(params.assignmentId);
  const q = one(params.q);
  const gradeStatus = gradeStatusOf(one(params.gradeStatus));

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
    .filter((assignment) => (assignmentId ? assignment.id === assignmentId : true))
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());

  const submissionGroups = await Promise.all(
    assignments.map(async (assignment) => ({
      assignment,
      submissions: await getAssignmentSubmissions(viewer, assignment.id, { q, gradeStatus }),
    })),
  );

  const rows: SubmissionRow[] = submissionGroups
    .flatMap((group) =>
      group.submissions.map((submission) => ({ ...submission, assignment: group.assignment })),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const pending = rows.filter((row) => row.gradeStatus === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Assessment"
        title="Submissions"
        description="Review student work, enter marks and release results. Every grade change is written to the audit trail."
        actions={
          <ButtonLink href="/faculty/assignments" variant="secondary" size="sm">
            Assignments
          </ButtonLink>
        }
      />

      <FilterBar action="/faculty/submissions" resetHref="/faculty/submissions">
        <div className="flex flex-col gap-1">
          <label htmlFor="submission-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Student
          </label>
          <SearchFilter id="submission-search" defaultValue={q} placeholder="Name or roll number" />
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
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Assignment</label>
          <SelectFilter name="assignmentId" defaultValue={assignmentId}>
            <option value="">All assignments</option>
            {groups
              .flatMap((group) => group.assignments)
              .map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.courseCode} — {assignment.title}
                </option>
              ))}
          </SelectFilter>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Grade status</label>
          <SelectFilter name="gradeStatus" defaultValue={gradeStatus}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="graded">Graded</option>
            <option value="released">Released</option>
          </SelectFilter>
        </div>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Submissions shown</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Pending marks</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{pending}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Released</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
            {rows.filter((row) => row.gradeStatus === 'released').length}
          </p>
        </div>
      </div>

      {assignmentId && assignments.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            compact
            title="Assignment not found"
            description="That assignment does not belong to one of your offerings."
          />
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No submissions match"
          description={
            q || assignmentId || gradeStatus || offeringId
              ? 'Adjust the filters and try again.'
              : 'Students have not submitted work yet, or all assignments are still drafts.'
          }
          action={
            <ButtonLink href="/faculty/assignments" size="sm" variant="secondary">
              Review assignments
            </ButtonLink>
          }
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Assignment</Th>
              <Th>Submitted</Th>
              <Th>File</Th>
              <Th>Marks</Th>
              <Th>Status</Th>
              <Th align="right">Grade</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((submission) => (
              <tr key={submission.id} className="align-top hover:bg-surface/70">
                <Td>
                  <p className="font-medium">{submission.studentName}</p>
                  <p className="font-mono text-[11px] text-muted">{submission.rollNo}</p>
                </Td>
                <Td className="text-xs">
                  <Link
                    href={`/faculty/offerings/${submission.assignment.offering.id}?tab=submissions&assignmentId=${submission.assignmentId}`}
                    className="font-medium hover:underline"
                  >
                    {submission.assignment.title}
                  </Link>
                  <p className="mt-0.5 text-muted">
                    {submission.assignment.courseCode} · max {submission.assignment.maxMarks}
                  </p>
                </Td>
                <Td className="text-xs">
                  {formatDateTime(submission.submittedAt)}
                  <span className="mt-0.5 block text-muted">{formatRelative(submission.submittedAt)}</span>
                  {submission.isLate ? (
                    <span className="mt-1 block">
                      <Badge tone="warning">Late</Badge>
                    </span>
                  ) : null}
                </Td>
                <Td>
                  {submission.fileId ? (
                    <a
                      href={`/api/files/${submission.fileId}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
                    >
                      <DownloadIcon size={14} />
                      {submission.originalFilename ?? 'Download'}
                    </a>
                  ) : (
                    <span className="text-xs text-muted">No file</span>
                  )}
                </Td>
                <Td className="tabular-nums text-xs">
                  {submission.marksAwarded ?? '—'}
                  <span className="text-muted"> / {submission.assignment.maxMarks}</span>
                </Td>
                <Td>
                  <StatusBadge status={submission.gradeStatus} />
                  {submission.feedback ? (
                    <p className="mt-1 max-w-[14rem] text-[11px] leading-relaxed text-muted">
                      {submission.feedback}
                    </p>
                  ) : null}
                </Td>
                <Td align="right">
                  <div className="flex flex-col items-end gap-2">
                    <Disclosure summary={submission.gradeStatus === 'pending' ? 'Grade' : 'Update marks'}>
                      <div className="w-[min(80vw,46rem)]">
                        <GradeSubmissionForm
                          submission={submission}
                          maxMarks={submission.assignment.maxMarks}
                        />
                      </div>
                    </Disclosure>
                    {submission.gradeStatus === 'graded' && submission.marksAwarded !== null ? (
                      <ReleaseGradeButton submissionId={submission.id} />
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
