import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import {
  getAssignmentSubmissions,
  getFacultyGradeChanges,
  getOfferingAttendance,
  getOfferingFinalGrades,
  getOfferingRosterForFaculty,
  getOfferingWorkspace,
  getSessionForFaculty,
  listOfferingSessions,
} from '@/lib/data/faculty';
import type { SessionUser, SubmissionDTO } from '@/types/contracts';
import { AssignmentCreateForm, AssignmentEditForm, CloseAssignmentButton, PublishAssignmentButton } from '@/components/faculty/assignment-forms';
import { AttendanceForm } from '@/components/faculty/attendance-form';
import { CancelSessionButton, SessionCreateForm, SessionEditForm } from '@/components/faculty/session-forms';
import { FinalGradeActions, GradeSubmissionForm, ReleaseGradeButton } from '@/components/faculty/grading-forms';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import { Disclosure } from '@/components/form';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  KeyValue,
  PageHeader,
  StatCard,
  StatusBadge,
  TableShell,
  Tabs,
  Td,
  Th,
  buttonClasses,
} from '@/components/ui';
import { formatDateTime, formatPercent, formatRelative } from '@/components/format';
import { one, type SearchParams } from '@/components/query';
import { DownloadIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type Tab = 'overview' | 'students' | 'sessions' | 'attendance' | 'assignments' | 'submissions' | 'gradebook';
const TABS: Tab[] = ['overview', 'students', 'sessions', 'attendance', 'assignments', 'submissions', 'gradebook'];

function tabOf(value: string | undefined): Tab {
  return value && TABS.includes(value as Tab) ? (value as Tab) : 'overview';
}

function gradeStatusOf(value: string | undefined): SubmissionDTO['gradeStatus'] | undefined {
  return value === 'pending' || value === 'graded' || value === 'released' ? value : undefined;
}

export const metadata = { title: 'Offering workspace' };

export default async function FacultyOfferingWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ offeringId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('faculty');
  const { offeringId } = await params;
  const query = await searchParams;
  const tab = tabOf(one(query.tab));
  const sessionId = one(query.sessionId);
  const assignmentId = one(query.assignmentId);
  const q = one(query.q);
  const gradeStatus = gradeStatusOf(one(query.gradeStatus));

  const workspace = await getOfferingWorkspace(viewer, offeringId);
  const { offering } = workspace;

  const base = `/faculty/offerings/${offering.id}`;
  const tabs = [
    { href: base, label: 'Overview', active: tab === 'overview' },
    { href: `${base}?tab=students`, label: 'Students', active: tab === 'students', count: workspace.rosterCount },
    { href: `${base}?tab=sessions`, label: 'Sessions', active: tab === 'sessions' },
    { href: `${base}?tab=attendance`, label: 'Attendance', active: tab === 'attendance' },
    { href: `${base}?tab=assignments`, label: 'Assignments', active: tab === 'assignments', count: workspace.assignments.length },
    {
      href: `${base}?tab=submissions`,
      label: 'Submissions',
      active: tab === 'submissions',
      count: workspace.pendingSubmissions,
    },
    { href: `${base}?tab=gradebook`, label: 'Gradebook', active: tab === 'gradebook' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${offering.termLabel} · ${offering.academicYear}`}
        title={`${offering.courseCode} — ${offering.courseTitle}`}
        description={
          <>
            Section <span className="font-mono">{offering.sectionCode}</span> · {offering.enrolledCount}
            {offering.capacity ? ` / ${offering.capacity}` : ''} students enrolled ·{' '}
            <StatusBadge status={offering.status} />
          </>
        }
        actions={
          <>
            <ButtonLink href="/faculty/offerings" variant="secondary" size="sm">
              All offerings
            </ButtonLink>
            <ButtonLink href={`${base}?tab=attendance`} size="sm">
              Mark attendance
            </ButtonLink>
          </>
        }
      />

      <Tabs tabs={tabs} />

      {tab === 'overview' ? <OverviewTab viewer={viewer} offeringId={offering.id} /> : null}
      {tab === 'students' ? <StudentsTab viewer={viewer} offeringId={offering.id} /> : null}
      {tab === 'sessions' ? <SessionsTab viewer={viewer} offeringId={offering.id} /> : null}
      {tab === 'attendance' ? (
        <AttendanceTab viewer={viewer} offeringId={offering.id} sessionId={sessionId} />
      ) : null}
      {tab === 'assignments' ? <AssignmentsTab viewer={viewer} offeringId={offering.id} /> : null}
      {tab === 'submissions' ? (
        <SubmissionsTab
          viewer={viewer}
          offeringId={offering.id}
          assignmentId={assignmentId}
          q={q}
          gradeStatus={gradeStatus}
        />
      ) : null}
      {tab === 'gradebook' ? <GradebookTab viewer={viewer} offeringId={offering.id} /> : null}
    </div>
  );
}

async function OverviewTab({ viewer, offeringId }: { viewer: SessionUser; offeringId: string }) {
  const workspace = await getOfferingWorkspace(viewer, offeringId);
  const base = `/faculty/offerings/${offeringId}`;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Workspace counts" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={workspace.rosterCount} hint="Actively enrolled" href={`${base}?tab=students`} />
        <StatCard label="Assignments" value={workspace.assignments.length} hint="All statuses" href={`${base}?tab=assignments`} />
        <StatCard
          label="Pending grading"
          value={workspace.pendingSubmissions}
          hint="Submissions not yet marked"
          href={`${base}?tab=submissions&gradeStatus=pending`}
        />
        <StatCard
          label="Upcoming sessions"
          value={workspace.nextSessions.length}
          hint="Scheduled from now onward"
          href={`${base}?tab=sessions`}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Next class sessions"
            description="Sessions already on the calendar."
            action={
              <Link href={`${base}?tab=sessions`} className="text-xs font-medium text-muted hover:text-ink">
                Manage →
              </Link>
            }
          />
          {workspace.nextSessions.length === 0 ? (
            <div className="p-5">
              <EmptyState compact title="No upcoming sessions" description="Schedule the next class from the sessions tab." />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {workspace.nextSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={`${base}?tab=attendance&sessionId=${session.id}`}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-surface"
                  >
                    <div>
                      <p className="text-sm font-medium">{session.topic}</p>
                      <p className="text-xs text-muted">{formatDateTime(session.startsAt)}</p>
                    </div>
                    <span className="text-right text-[11px] text-muted">
                      {formatRelative(session.startsAt)}
                      <span className="block">
                        {session.attendanceMarkedCount}/{session.rosterCount} marked
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Assessment"
            description="Assignments and their evaluation progress."
            action={
              <Link href={`${base}?tab=assignments`} className="text-xs font-medium text-muted hover:text-ink">
                Manage →
              </Link>
            }
          />
          {workspace.assignments.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                title="No assignments yet"
                description="Create a draft, add instructions, then publish it to students."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {workspace.assignments.slice(0, 5).map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    href={`${base}?tab=submissions&assignmentId=${assignment.id}`}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{assignment.title}</p>
                      <p className="text-xs text-muted">
                        Due {formatDateTime(assignment.dueAt)} · {assignment.submissionCount} submitted
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={assignment.status} />
                      <span className="text-[11px] text-muted">
                        {assignment.gradedCount}/{assignment.submissionCount} graded
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Offering facts" description="The identity of this section as stored in the institution record." />
        <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-paper p-4">
            <KeyValue label="Course" value={`${workspace.offering.courseCode}`} />
          </div>
          <div className="bg-paper p-4">
            <KeyValue label="Term" value={`${workspace.offering.termLabel} · ${workspace.offering.academicYear}`} />
          </div>
          <div className="bg-paper p-4">
            <KeyValue label="Section" value={workspace.offering.sectionCode} />
          </div>
          <div className="bg-paper p-4">
            <KeyValue label="Status" value={<StatusBadge status={workspace.offering.status} />} />
          </div>
        </dl>
      </Card>
    </div>
  );
}

async function StudentsTab({ viewer, offeringId }: { viewer: SessionUser; offeringId: string }) {
  const roster = await getOfferingRosterForFaculty(viewer, offeringId);

  if (roster.length === 0) {
    return (
      <EmptyState
        title="No active students"
        description="An administrator adds students to this offering through enrollment management."
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Enrolled students"
        description="Active enrollments only. Status changes are handled by an administrator."
      />
      <TableShell className="rounded-none border-0">
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Roll number</Th>
            <Th>Status</Th>
            <Th>Enrolled</Th>
          </tr>
        </thead>
        <tbody>
          {roster.map((student) => (
            <tr key={student.id} className="hover:bg-surface/70">
              <Td className="font-medium">{student.studentName}</Td>
              <Td className="font-mono text-xs">{student.rollNo}</Td>
              <Td>
                <StatusBadge status={student.status} />
              </Td>
              <Td className="text-xs text-muted">{formatDateTime(student.enrolledAt)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Card>
  );
}

async function SessionsTab({ viewer, offeringId }: { viewer: SessionUser; offeringId: string }) {
  const sessions = await listOfferingSessions(viewer, offeringId);
  const base = `/faculty/offerings/${offeringId}`;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Schedule a class session"
          description="Sessions anchor attendance. Times are saved in the institution timezone."
          action={
            <Disclosure summary="New session">
              <div className="w-[min(72vw,44rem)]">
                <SessionCreateForm offeringId={offeringId} />
              </div>
            </Disclosure>
          }
        />
        <div className="p-5">
          <p className="text-sm text-muted">
            Use <span className="font-medium text-ink">New session</span> to add a class. Each saved
            session can later be marked, edited or cancelled without losing attendance already recorded.
          </p>
        </div>
      </Card>

      {sessions.length === 0 ? (
        <EmptyState
          title="No class sessions"
          description="Schedule the first session so attendance can be recorded."
        />
      ) : (
        <Card>
          <CardHeader title="All sessions" description="Newest first." />
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Starts</Th>
                <Th>Status</Th>
                <Th align="right">Marked</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="align-top hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{session.topic}</p>
                    {session.endsAt ? (
                      <p className="text-xs text-muted">Ends {formatDateTime(session.endsAt)}</p>
                    ) : null}
                  </Td>
                  <Td className="text-xs">
                    {formatDateTime(session.startsAt)}
                    <span className="block text-muted">{formatRelative(session.startsAt)}</span>
                  </Td>
                  <Td>
                    <StatusBadge status={session.status} />
                  </Td>
                  <Td align="right" className="tabular-nums text-xs">
                    {session.attendanceMarkedCount}/{session.rosterCount}
                  </Td>
                  <Td align="right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        href={`${base}?tab=attendance&sessionId=${session.id}`}
                        className={buttonClasses('secondary', 'sm')}
                      >
                        Attendance
                      </Link>
                      <Disclosure summary="Edit" tone="ghost">
                        <div className="w-[min(80vw,46rem)]">
                          <SessionEditForm session={session} />
                          {session.status !== 'cancelled' ? (
                            <div className="mt-2">
                              <CancelSessionButton sessionId={session.id} />
                            </div>
                          ) : null}
                        </div>
                      </Disclosure>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}
    </div>
  );
}

async function AttendanceTab({
  viewer,
  offeringId,
  sessionId,
}: {
  viewer: SessionUser;
  offeringId: string;
  sessionId?: string;
}) {
  const attendance = await getOfferingAttendance(viewer, offeringId);
  const policyConfigured = attendance.some((row) => row.policyConfigured);
  const base = `/faculty/offerings/${offeringId}`;
  const selected = sessionId ? await getSessionForFaculty(viewer, sessionId).catch(() => null) : null;

  return (
    <div className="flex flex-col gap-5">
      {!policyConfigured ? (
        <Alert tone="warning" title="Attendance policy is not configured">
          Raw counts remain accurate, but percentages stay blank until the institution records its
          excused, unmarked and denominator policy.
        </Alert>
      ) : null}

      {selected ? (
        <Card>
          <CardHeader
            title="Mark attendance"
            description="Saving writes one attendance row per marked student in a single transaction."
            action={
              <Link href={`${base}?tab=attendance`} className="text-xs font-medium text-muted hover:text-ink">
                Choose another session →
              </Link>
            }
          />
          <div className="p-5">
            <AttendanceForm session={selected.session} roster={selected.roster} />
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Choose a session to mark"
            description="Open any scheduled, completed or cancelled session to enter attendance."
          />
          <SessionPicker viewer={viewer} offeringId={offeringId} />
        </Card>
      )}

      <Card>
        <CardHeader
          title="Attendance by student"
          description={
            policyConfigured
              ? 'Percentages follow the institution attendance policy.'
              : 'Counts are live; percentages require a configured policy.'
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
    </div>
  );
}

async function SessionPicker({ viewer, offeringId }: { viewer: SessionUser; offeringId: string }) {
  const sessions = await listOfferingSessions(viewer, offeringId);
  if (sessions.length === 0) {
    return (
      <div className="p-5">
        <EmptyState compact title="No sessions yet" description="Schedule a session first, then mark attendance." />
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={`/faculty/offerings/${offeringId}?tab=attendance&sessionId=${session.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface"
          >
            <div>
              <p className="text-sm font-medium">{session.topic}</p>
              <p className="text-xs text-muted">{formatDateTime(session.startsAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted">
                {session.attendanceMarkedCount}/{session.rosterCount} marked
              </span>
              <StatusBadge status={session.status} />
              <span className="text-xs font-medium text-info">Open →</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function AssignmentsTab({ viewer, offeringId }: { viewer: SessionUser; offeringId: string }) {
  const assignments = await getOfferingWorkspace(viewer, offeringId).then((workspace) => workspace.assignments);
  const base = `/faculty/offerings/${offeringId}`;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Create an assignment"
          description="New assignments are drafts until you publish them to the roster."
          action={
            <Disclosure summary="New assignment">
              <div className="w-[min(74vw,48rem)]">
                <AssignmentCreateForm offeringId={offeringId} />
              </div>
            </Disclosure>
          }
        />
        <div className="p-5">
          <p className="text-sm text-muted">
            Drafts are invisible to students. Publishing makes the assignment available; closing it
            stops further submissions while preserving existing work.
          </p>
        </div>
      </Card>

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments"
          description="Create a draft assignment, add clear instructions and a due date, then publish it."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader
                title={assignment.title}
                description={`Due ${formatDateTime(assignment.dueAt)} · ${assignment.maxMarks} marks · late penalty ${assignment.latePenaltyPercent}%`}
                action={<StatusBadge status={assignment.status} />}
              />
              <div className="flex flex-col gap-4 p-5">
                {assignment.instructions ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                    {assignment.instructions}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
                  <div className="flex flex-wrap gap-5 text-xs text-muted">
                    <span>
                      <span className="font-semibold text-ink tabular-nums">{assignment.submissionCount}</span>{' '}
                      submitted
                    </span>
                    <span>
                      <span className="font-semibold text-ink tabular-nums">{assignment.gradedCount}</span>{' '}
                      graded
                    </span>
                    <span>{assignment.allowResubmission ? 'Resubmission allowed' : 'Single submission'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`${base}?tab=submissions&assignmentId=${assignment.id}`}
                      className={buttonClasses('secondary', 'sm')}
                    >
                      Review submissions
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

async function SubmissionsTab({
  viewer,
  offeringId,
  assignmentId,
  q,
  gradeStatus,
}: {
  viewer: SessionUser;
  offeringId: string;
  assignmentId?: string;
  q?: string;
  gradeStatus?: SubmissionDTO['gradeStatus'];
}) {
  const assignments = await getOfferingWorkspace(viewer, offeringId).then((workspace) => workspace.assignments);
  const selectedAssignments = assignmentId
    ? assignments.filter((assignment) => assignment.id === assignmentId)
    : assignments;

  const groups = await Promise.all(
    selectedAssignments.map(async (assignment) => ({
      assignment,
      submissions: await getAssignmentSubmissions(viewer, assignment.id, { q, gradeStatus }),
    })),
  );

  const total = groups.reduce((sum, group) => sum + group.submissions.length, 0);
  const base = `/faculty/offerings/${offeringId}`;

  return (
    <div className="flex flex-col gap-5">
      <FilterBar action={base} resetHref={`${base}?tab=submissions`}>
        <input type="hidden" name="tab" value="submissions" />
        <div className="flex flex-col gap-1">
          <label htmlFor="submission-student" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Student
          </label>
          <SearchFilter id="submission-student" defaultValue={q} placeholder="Name or roll number" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Assignment</label>
          <SelectFilter name="assignmentId" defaultValue={assignmentId}>
            <option value="">All assignments</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
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

      {assignmentId && selectedAssignments.length === 0 ? (
        <Alert tone="danger" title="Assignment not found">
          That assignment does not belong to this offering.
        </Alert>
      ) : null}

      {total === 0 ? (
        <EmptyState
          title="No submissions match"
          description={
            assignments.length === 0
              ? 'Publish an assignment first so students can submit work.'
              : q || assignmentId || gradeStatus
                ? 'Adjust the filters or choose another assignment.'
                : 'Students have not submitted anything yet.'
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            {total} {total === 1 ? 'submission' : 'submissions'} shown
          </p>
          {groups.map(({ assignment, submissions }) =>
            submissions.length === 0 ? null : (
              <Card key={assignment.id}>
                <CardHeader
                  title={assignment.title}
                  description={`${assignment.courseCode} · max ${assignment.maxMarks} marks · due ${formatDateTime(assignment.dueAt)}`}
                  action={<StatusBadge status={assignment.status} />}
                />
                <TableShell className="rounded-none border-0">
                  <thead>
                    <tr>
                      <Th>Student</Th>
                      <Th>Submitted</Th>
                      <Th>File</Th>
                      <Th>Marks</Th>
                      <Th>Status</Th>
                      <Th align="right">Grade</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="align-top hover:bg-surface/70">
                        <Td>
                          <p className="font-medium">{submission.studentName}</p>
                          <p className="font-mono text-[11px] text-muted">{submission.rollNo}</p>
                        </Td>
                        <Td className="text-xs">
                          {formatDateTime(submission.submittedAt)}
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
                          {submission.feedback ? (
                            <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted">
                              Feedback: {submission.feedback}
                            </p>
                          ) : null}
                        </Td>
                        <Td className="tabular-nums text-xs">
                          {submission.marksAwarded ?? '—'}
                          <span className="text-muted"> / {assignment.maxMarks}</span>
                        </Td>
                        <Td>
                          <StatusBadge status={submission.gradeStatus} />
                        </Td>
                        <Td align="right">
                          <div className="flex flex-col items-end gap-2">
                            <Disclosure summary={submission.gradeStatus === 'pending' ? 'Grade' : 'Update marks'}>
                              <div className="w-[min(80vw,46rem)]">
                                <GradeSubmissionForm submission={submission} maxMarks={assignment.maxMarks} />
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
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}

async function GradebookTab({ viewer, offeringId }: { viewer: SessionUser; offeringId: string }) {
  const [finalGrades, changes] = await Promise.all([
    getOfferingFinalGrades(viewer, offeringId),
    getFacultyGradeChanges(viewer, { offeringId, pageSize: 8 }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      {finalGrades.policy ? (
        <Card>
          <CardHeader
            title={`Policy: ${finalGrades.policy.name} v${finalGrades.policy.version}`}
            description={
              finalGrades.policyConfigured
                ? 'The active policy is complete, so final grades can be computed and published.'
                : 'The policy exists but is incomplete. Computation fails closed until every required value is configured.'
            }
            action={<StatusBadge status={finalGrades.policyConfigured ? 'active' : 'inactive'} />}
          />
          <div className="flex flex-col gap-4 p-5">
            <dl className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Attendance weight', finalGrades.policy.attendanceWeight ? `${finalGrades.policy.attendanceWeight}%` : '—'],
                ['Coursework weight', finalGrades.policy.courseworkWeight ? `${finalGrades.policy.courseworkWeight}%` : '—'],
                ['Pass percent', finalGrades.policy.passPercent ? `${finalGrades.policy.passPercent}%` : '—'],
                ['Round to', finalGrades.policy.roundingDecimals === null ? '—' : `${finalGrades.policy.roundingDecimals} dp`],
                ['Drop lowest', finalGrades.policy.dropLowestCount === null ? '—' : String(finalGrades.policy.dropLowestCount)],
                ['Late penalty', finalGrades.policy.latePenaltyMode ?? '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
                  <dd className="mt-1 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <FinalGradeActions
              offeringId={offeringId}
              policyConfigured={finalGrades.policyConfigured}
              hasRows={finalGrades.rows.length > 0}
            />
          </div>
        </Card>
      ) : (
        <Alert tone="warning" title="No active grade policy">
          Final grades cannot be computed for this term until an administrator configures an active
          grade policy. Attendance and coursework columns stay blank.
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Final grades"
          description="Computed values stay draft until you publish them to students."
        />
        {finalGrades.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState compact title="No students in the gradebook" description="Active or completed enrollments appear here." />
          </div>
        ) : (
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Student</Th>
                <Th align="right">Attendance</Th>
                <Th align="right">Coursework</Th>
                <Th align="right">Final</Th>
                <Th>Letter</Th>
                <Th>Status</Th>
                <Th>Published</Th>
              </tr>
            </thead>
            <tbody>
              {finalGrades.rows.map((row) => (
                <tr key={row.enrollmentId} className="hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{row.studentName}</p>
                    <p className="text-[11px] text-muted">{row.courseCode}</p>
                  </Td>
                  <Td align="right" className="tabular-nums">{formatPercent(row.attendancePercent)}</Td>
                  <Td align="right" className="tabular-nums">{formatPercent(row.courseworkPercent)}</Td>
                  <Td align="right" className="font-medium tabular-nums">{formatPercent(row.finalPercent)}</Td>
                  <Td className="font-mono text-xs">{row.letterGrade ?? '—'}</Td>
                  <Td>
                    {row.finalPercent === null ? (
                      <Badge tone="neutral">Not computed</Badge>
                    ) : (
                      <StatusBadge status={row.status} />
                    )}
                  </Td>
                  <Td className="text-xs text-muted">
                    {row.publishedAt ? formatDateTime(row.publishedAt) : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Recent grade changes"
          description="Written by the database audit trigger each time marks are entered or changed."
        />
        {changes.items.length === 0 ? (
          <div className="p-5">
            <EmptyState compact title="No grade changes yet" description="Entries appear here the first time a submission is graded." />
          </div>
        ) : (
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Changed</Th>
                <Th>Student</Th>
                <Th>Assignment</Th>
                <Th align="right">Old</Th>
                <Th align="right">New</Th>
                <Th>Type</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {changes.items.map((change) => (
                <tr key={change.id} className="align-top hover:bg-surface/70">
                  <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(change.changedAt)}</Td>
                  <Td className="text-sm font-medium">{change.studentName}</Td>
                  <Td className="max-w-xs text-xs text-muted">{change.assignmentTitle}</Td>
                  <Td align="right" className="tabular-nums text-muted">{change.oldMarks ?? '—'}</Td>
                  <Td align="right" className="font-medium tabular-nums">{change.newMarks}</Td>
                  <Td>
                    <Badge tone={change.changeType === 'initial' ? 'info' : 'warning'}>
                      {change.changeType === 'initial' ? 'Initial' : 'Update'}
                    </Badge>
                  </Td>
                  <Td className="max-w-[14rem] text-xs text-muted">{change.reason ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <p className="text-xs leading-relaxed text-muted">
        Final percent is computed from the active policy, never from interface defaults. Publishing
        makes computed grades visible to students and cannot be undone from this screen.
      </p>
    </div>
  );
}
