import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageRole } from '@/lib/authz/guards';
import {
  getStudentAssignment,
  getStudentSubmissionForAssignment,
} from '@/lib/data/student';
import { loadUploadPolicy } from '@/lib/files/upload-policy';
import { SubmissionUploadForm } from '@/components/student/upload-form';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  KeyValue,
  PageHeader,
  StatusBadge,
} from '@/components/ui';
import { formatDateTime, formatDecimal, formatRelative, isPast } from '@/components/format';
import { DownloadIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assignment' };

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const viewer = await requirePageRole('student');
  const { assignmentId } = await params;
  const assignment = await getStudentAssignment(viewer, assignmentId).catch(() => null);
  if (!assignment) notFound();

  const submission = assignment.submissionId
    ? await getStudentSubmissionForAssignment(viewer, assignment.id)
    : null;
  const uploadPolicy = await loadUploadPolicy().catch(() => null);

  const overdue = !assignment.submissionId && isPast(assignment.dueAt);
  const alreadySubmitted = assignment.submissionId !== null;
  const blockReason = !uploadPolicy
    ? 'Uploads are unavailable until the institution configures its upload policy.'
    : assignment.status !== 'published'
      ? 'This assignment is closed and no longer accepts submissions.'
      : alreadySubmitted && !assignment.allowResubmission
        ? 'You have already submitted this assignment. Resubmission is not allowed.'
        : null;
  const canSubmit = blockReason === null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${assignment.courseCode} · ${assignment.courseTitle}`}
        title={assignment.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={assignment.status} />
            {overdue ? <Badge tone="danger">Overdue</Badge> : null}
            {assignment.isLate ? <Badge tone="warning">Submitted late</Badge> : null}
            <span>
              Due {formatDateTime(assignment.dueAt)} · {formatRelative(assignment.dueAt)}
            </span>
          </span>
        }
        actions={
          <>
            <ButtonLink href="/student/assignments" variant="secondary" size="sm">
              All assignments
            </ButtonLink>
            <ButtonLink
              href={`/student/assignments?courseCode=${encodeURIComponent(assignment.courseCode)}`}
              size="sm"
              variant="ghost"
            >
              Coursework
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Instructions" description="What your faculty expects for this piece of work." />
            <div className="p-5">
              {assignment.instructions.trim() ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                  {assignment.instructions}
                </p>
              ) : (
                <p className="text-sm text-muted">No additional instructions were provided.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={alreadySubmitted ? 'Your submission' : 'Submit your work'}
              description={
                alreadySubmitted
                  ? 'The file and timestamps on record for this assignment.'
                  : 'Upload one file. The server validates its type and size before storing it.'
              }
              action={alreadySubmitted ? <Badge tone="success">On record</Badge> : null}
            />
            <div className="flex flex-col gap-4 p-5">
              {alreadySubmitted ? (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <KeyValue label="Submitted at" value={formatDateTime(assignment.submittedAt)} />
                  <KeyValue
                    label="Timing"
                    value={assignment.isLate ? <Badge tone="warning">Late</Badge> : <Badge tone="success">On time</Badge>}
                  />
                  <KeyValue
                    label="Grade status"
                    value={
                      assignment.gradeStatus === 'released'
                        ? 'Marks released'
                        : assignment.gradeStatus === 'graded'
                          ? 'Graded, awaiting release'
                          : 'Awaiting marks'
                    }
                  />
                  <KeyValue
                    label="File"
                    value={
                      submission?.fileId ? (
                        <a
                          href={`/api/files/${submission.fileId}`}
                          className="inline-flex items-center gap-1 text-info hover:underline"
                        >
                          <DownloadIcon size={14} />
                          {submission.originalFilename ?? 'Download'}
                        </a>
                      ) : (
                        '—'
                      )
                    }
                  />
                </dl>
              ) : (
                <p className="text-sm text-muted">
                  Nothing has been submitted yet. {overdue ? 'The due date has passed; uploads are recorded as late.' : 'Upload before the due date to avoid a late flag.'}
                </p>
              )}

              {assignment.gradeStatus === 'released' ? (
                <div className="rounded-md border border-success/25 bg-success/[0.05] p-4">
                  <p className="eyebrow text-success">Released result</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums">
                    {formatDecimal(assignment.marksAwarded)}{' '}
                    <span className="text-base font-normal text-muted">/ {assignment.maxMarks}</span>
                  </p>
                  {assignment.feedback ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                      {assignment.feedback}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted">No written feedback was attached.</p>
                  )}
                </div>
              ) : null}

              {uploadPolicy ? (
                <SubmissionUploadForm
                  assignmentId={assignment.id}
                  maxBytes={uploadPolicy.maxBytes}
                  allowedExtensions={uploadPolicy.allowedExtensions}
                  canSubmit={canSubmit}
                  blockedReason={blockReason ?? undefined}
                  hasSubmission={alreadySubmitted}
                />
              ) : (
                <Alert tone="warning" title="Uploads are not configured">
                  The institution has not configured an upload policy yet, so file submission is
                  unavailable. {alreadySubmitted ? 'Your existing submission remains on record.' : 'Contact academic operations if a deadline is approaching.'}
                </Alert>
              )}

              {uploadPolicy && blockReason ? (
                <p className="text-xs text-muted">
                  {blockReason} Contact your faculty if you believe this is an error.
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Assessment details" />
            <dl className="divide-y divide-line">
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm text-muted">Course</dt>
                <dd className="text-right text-sm font-medium">
                  {assignment.courseCode}
                  <span className="block text-xs font-normal text-muted">{assignment.courseTitle}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm text-muted">Maximum marks</dt>
                <dd className="font-display text-lg font-semibold tabular-nums">{assignment.maxMarks}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm text-muted">Due</dt>
                <dd className="text-right text-sm font-medium">{formatDateTime(assignment.dueAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm text-muted">Resubmission</dt>
                <dd className="text-sm font-medium">{assignment.allowResubmission ? 'Allowed' : 'Not allowed'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm text-muted">Status</dt>
                <dd>
                  <StatusBadge status={assignment.status} />
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Need help?" />
            <div className="flex flex-col gap-3 p-5 text-sm leading-relaxed text-muted">
              <p>
                Submission problems are handled by your faculty or academic operations. Your file is
                private: only you and the faculty teaching this offering can open it.
              </p>
              <Link href="/student/courses" className="text-xs font-medium text-info hover:underline">
                Back to my courses →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
