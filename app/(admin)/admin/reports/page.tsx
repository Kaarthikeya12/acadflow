import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import {
  getAdminAttendanceDeficitReport,
  getAdminEnrollmentReport,
  getAdminFinalGradeReport,
  getAdminSubmissionStatusReport,
  listAdminOfferings,
  listAdminTerms,
  listCourseOptionsForAdmin,
  listDepartmentOptions,
} from '@/lib/data/admin';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  Tabs,
  Td,
  Th,
} from '@/components/ui';
import { formatDecimal, formatPercent } from '@/components/format';
import { one, pageParam, pageSizeParam, paginationParams, type SearchParams } from '@/components/query';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reports' };

type Tab = 'attendance' | 'enrollment' | 'submissions' | 'finals';
const TABS: Tab[] = ['attendance', 'enrollment', 'submissions', 'finals'];

function tabOf(value: string | undefined): Tab {
  return value && TABS.includes(value as Tab) ? (value as Tab) : 'attendance';
}

function validThreshold(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^\d{1,3}(\.\d{1,2})?$/.test(value) ? value : undefined;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('admin');
  const params = await searchParams;
  const tab = tabOf(one(params.tab));
  const q = one(params.q);
  const offeringId = one(params.offeringId);
  const termId = one(params.termId);
  const courseId = one(params.courseId);
  const departmentId = one(params.departmentId);
  const thresholdPercent = validThreshold(one(params.threshold));
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 20);

  const [departments, courses, terms, offeringPage] = await Promise.all([
    listDepartmentOptions(viewer),
    listCourseOptionsForAdmin(viewer),
    listAdminTerms(viewer),
    listAdminOfferings(viewer, { pageSize: 100 }),
  ]);

  const tabs = [
    { href: '/admin/reports?tab=attendance', label: 'Attendance deficit', active: tab === 'attendance' },
    { href: '/admin/reports?tab=enrollment', label: 'Enrollment', active: tab === 'enrollment' },
    { href: '/admin/reports?tab=submissions', label: 'Submissions', active: tab === 'submissions' },
    { href: '/admin/reports?tab=finals', label: 'Final grades', active: tab === 'finals' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Oversight"
        title="Institution reports"
        description="SQL-backed reporting for attendance, enrollment, evaluation status and published final grades. No calculated value is invented in the interface."
      />

      <Tabs tabs={tabs} />

      {tab === 'attendance' ? (
        <AttendanceReport
          offeringId={offeringId}
          q={q}
          thresholdPercent={thresholdPercent}
          offerings={offeringPage.items}
          load={getAdminAttendanceDeficitReport(viewer, { offeringId, thresholdPercent, q })}
        />
      ) : null}

      {tab === 'enrollment' ? (
        <EnrollmentReport
          result={getAdminEnrollmentReport(viewer, {
            page,
            pageSize,
            q,
            termId,
            courseId,
            departmentId,
          })}
          departments={departments}
          courses={courses}
          terms={terms}
          params={params}
          q={q}
          termId={termId}
          courseId={courseId}
          departmentId={departmentId}
        />
      ) : null}

      {tab === 'submissions' ? (
        <SubmissionReport
          result={getAdminSubmissionStatusReport(viewer, { page, pageSize, offeringId })}
          offerings={offeringPage.items}
          params={params}
          offeringId={offeringId}
        />
      ) : null}

      {tab === 'finals' ? (
        <FinalGradeReportView
          offeringId={offeringId}
          offerings={offeringPage.items}
          report={offeringId ? getAdminFinalGradeReport(viewer, offeringId) : Promise.resolve(null)}
        />
      ) : null}
    </div>
  );
}

type OfferingOption = Awaited<ReturnType<typeof listAdminOfferings>>['items'][number];

async function AttendanceReport({
  offeringId,
  q,
  thresholdPercent,
  offerings,
  load,
}: {
  offeringId?: string;
  q?: string;
  thresholdPercent?: string;
  offerings: OfferingOption[];
  load: ReturnType<typeof getAdminAttendanceDeficitReport>;
}) {
  const rows = await load;
  const policyConfigured = rows.some((row) => row.policyConfigured);

  return (
    <div className="flex flex-col gap-4">
      <FilterBar action="/admin/reports" resetHref="/admin/reports?tab=attendance">
        <input type="hidden" name="tab" value="attendance" />
        <div className="flex flex-col gap-1">
          <label htmlFor="attendance-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Student
          </label>
          <SearchFilter id="attendance-search" defaultValue={q} placeholder="Name or roll number" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Offering</label>
          <SelectFilter name="offeringId" defaultValue={offeringId}>
            <option value="">All offerings</option>
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.courseCode} · {offering.termLabel} {offering.academicYear}
              </option>
            ))}
          </SelectFilter>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="attendance-threshold" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Deficit below (%)
          </label>
          <input
            id="attendance-threshold"
            name="threshold"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={thresholdPercent ?? ''}
            placeholder="e.g. 75"
            className="h-9 w-28 rounded-md border border-line bg-paper px-3 text-sm focus:border-ink focus:outline-none"
          />
        </div>
      </FilterBar>

      {!policyConfigured ? (
        <Alert tone="warning" title="Attendance policy is not configured">
          Percentages stay blank until the institution records its excused, unmarked and
          denominator policy. Counts below are still live.
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No attendance rows"
          description="Attendance appears once sessions exist and students are enrolled in the relevant offerings."
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Course</Th>
              <Th align="right">Sessions</Th>
              <Th align="right">Present</Th>
              <Th align="right">Absent</Th>
              <Th align="right">Excused</Th>
              <Th align="right">Unmarked</Th>
              <Th align="right">Attendance</Th>
              <Th>Deficit</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.offeringId}-${row.enrollmentId}`} className="hover:bg-surface/70">
                <Td>
                  <p className="font-medium">{row.studentName}</p>
                  <p className="font-mono text-[11px] text-muted">{row.rollNo}</p>
                </Td>
                <Td className="text-xs">{row.courseCode}</Td>
                <Td align="right" className="tabular-nums">{row.sessionsCounted}</Td>
                <Td align="right" className="tabular-nums">{row.present}</Td>
                <Td align="right" className="tabular-nums">{row.absent}</Td>
                <Td align="right" className="tabular-nums">{row.excused}</Td>
                <Td align="right" className="tabular-nums">{row.unmarked}</Td>
                <Td align="right" className="font-medium tabular-nums">
                  {formatPercent(row.attendancePercent)}
                </Td>
                <Td>
                  {row.deficit === null ? (
                    <Badge tone="neutral">No threshold</Badge>
                  ) : row.deficit ? (
                    <Badge tone="danger">Below threshold</Badge>
                  ) : (
                    <Badge tone="success">On track</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

type DepartmentOption = { id: string; code: string; name: string };
type CourseOption = { id: string; code: string; title: string; departmentId: string };
type TermOption = { id: string; academicYear: string; label: string; isCurrent: boolean };

async function EnrollmentReport({
  result,
  departments,
  courses,
  terms,
  params,
  q,
  termId,
  courseId,
  departmentId,
}: {
  result: ReturnType<typeof getAdminEnrollmentReport>;
  departments: DepartmentOption[];
  courses: CourseOption[];
  terms: TermOption[];
  params: SearchParams;
  q?: string;
  termId?: string;
  courseId?: string;
  departmentId?: string;
}) {
  const data = await result;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar action="/admin/reports" resetHref="/admin/reports?tab=enrollment">
        <input type="hidden" name="tab" value="enrollment" />
        <div className="flex flex-col gap-1">
          <label htmlFor="enrollment-report-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Course
          </label>
          <SearchFilter id="enrollment-report-search" defaultValue={q} placeholder="Code or title" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Term</label>
          <SelectFilter name="termId" defaultValue={termId}>
            <option value="">All terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academicYear} · {term.label}
              </option>
            ))}
          </SelectFilter>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Course</label>
          <SelectFilter name="courseId" defaultValue={courseId}>
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.title}
              </option>
            ))}
          </SelectFilter>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Department</label>
          <SelectFilter name="departmentId" defaultValue={departmentId}>
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code}
              </option>
            ))}
          </SelectFilter>
        </div>
      </FilterBar>

      {data.items.length === 0 ? (
        <EmptyState title="No enrollment data" description="Offerings appear here once they exist." />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Term</Th>
                <Th align="right">Active</Th>
                <Th align="right">Dropped</Th>
                <Th align="right">Completed</Th>
                <Th align="right">Total rows</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.offeringId} className="hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{row.courseCode}</p>
                    <p className="text-xs text-muted">{row.courseTitle}</p>
                  </Td>
                  <Td className="text-xs text-muted">
                    {row.termLabel}
                    <span className="block">{row.academicYear}</span>
                  </Td>
                  <Td align="right" className="tabular-nums">{row.active}</Td>
                  <Td align="right" className="tabular-nums">{row.dropped}</Td>
                  <Td align="right" className="tabular-nums">{row.completed}</Td>
                  <Td align="right" className="tabular-nums">{row.total}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            basePath="/admin/reports"
            searchParams={{ ...paginationParams(params, ['tab', 'q', 'termId', 'courseId', 'departmentId']), tab: 'enrollment' }}
          />
        </div>
      )}
    </div>
  );
}

async function SubmissionReport({
  result,
  offerings,
  params,
  offeringId,
}: {
  result: ReturnType<typeof getAdminSubmissionStatusReport>;
  offerings: OfferingOption[];
  params: SearchParams;
  offeringId?: string;
}) {
  const data = await result;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar action="/admin/reports" resetHref="/admin/reports?tab=submissions">
        <input type="hidden" name="tab" value="submissions" />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Offering</label>
          <SelectFilter name="offeringId" defaultValue={offeringId}>
            <option value="">All offerings</option>
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.courseCode} · {offering.termLabel} {offering.academicYear}
              </option>
            ))}
          </SelectFilter>
        </div>
      </FilterBar>

      {data.items.length === 0 ? (
        <EmptyState title="No assignments yet" description="Submission status appears once faculty publish assignments." />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Assignment</Th>
                <Th align="right">Submitted</Th>
                <Th align="right">Late</Th>
                <Th align="right">Graded</Th>
                <Th align="right">Missing</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.assignmentId} className="hover:bg-surface/70">
                  <Td className="text-xs font-medium">{row.courseCode}</Td>
                  <Td>
                    <Link
                      href={`/admin/reports?tab=submissions&offeringId=${row.offeringId}`}
                      className="font-medium hover:underline"
                    >
                      {row.assignmentTitle}
                    </Link>
                  </Td>
                  <Td align="right" className="tabular-nums">{row.submitted}</Td>
                  <Td align="right" className="tabular-nums">{row.late}</Td>
                  <Td align="right" className="tabular-nums">{row.graded}</Td>
                  <Td align="right" className="tabular-nums">{row.missing}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            basePath="/admin/reports"
            searchParams={paginationParams(params, ['tab', 'offeringId'])}
          />
        </div>
      )}
    </div>
  );
}

async function FinalGradeReportView({
  offeringId,
  offerings,
  report,
}: {
  offeringId?: string;
  offerings: OfferingOption[];
  report: ReturnType<typeof getAdminFinalGradeReport> | Promise<null>;
}) {
  const data = await report;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar action="/admin/reports" resetHref="/admin/reports?tab=finals">
        <input type="hidden" name="tab" value="finals" />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Offering</label>
          <SelectFilter name="offeringId" defaultValue={offeringId}>
            <option value="">Choose an offering</option>
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.courseCode} · {offering.termLabel} {offering.academicYear}
              </option>
            ))}
          </SelectFilter>
        </div>
      </FilterBar>

      {!offeringId ? (
        <EmptyState
          title="Choose an offering"
          description="Final-grade rows are scoped to one offering so the policy and roster stay coherent."
        />
      ) : !data ? (
        <EmptyState title="Offering not found" description="The selected offering no longer exists." />
      ) : (
        <>
          {data.policy ? (
            <Card>
              <CardHeader
                title={`Policy: ${data.policy.name} v${data.policy.version}`}
                description={
                  data.policyConfigured
                    ? 'The active policy is complete, so final-grade rows can be computed.'
                    : 'The policy exists but is incomplete. Computation fails closed until every required value is configured.'
                }
                action={<StatusBadge status={data.policyConfigured ? 'active' : 'inactive'} />}
              />
              <dl className="grid gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['Attendance weight', data.policy.attendanceWeight ? `${data.policy.attendanceWeight}%` : '—'],
                  ['Coursework weight', data.policy.courseworkWeight ? `${data.policy.courseworkWeight}%` : '—'],
                  ['Pass percent', data.policy.passPercent ? `${data.policy.passPercent}%` : '—'],
                  ['Round to', data.policy.roundingDecimals === null ? '—' : `${data.policy.roundingDecimals} dp`],
                  ['Drop lowest', data.policy.dropLowestCount === null ? '—' : String(data.policy.dropLowestCount)],
                  ['Late penalty', data.policy.latePenaltyMode ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-paper p-4">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
                    <dd className="mt-1 text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : (
            <Alert tone="warning" title="No active grade policy">
              Final grades cannot be computed for this term until an active policy is configured.
            </Alert>
          )}

          {data.rows.length === 0 ? (
            <EmptyState title="No eligible students" description="Active or completed enrollments appear here." />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Course</Th>
                  <Th align="right">Attendance</Th>
                  <Th align="right">Coursework</Th>
                  <Th align="right">Final</Th>
                  <Th>Letter</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.enrollmentId} className="hover:bg-surface/70">
                    <Td className="font-medium">{row.studentName}</Td>
                    <Td className="text-xs">{row.courseCode}</Td>
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
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}

          <p className="text-xs text-muted">
            Weights shown as {formatDecimal(data.policy?.attendanceWeight)}% attendance and{' '}
            {formatDecimal(data.policy?.courseworkWeight)}% coursework. Values are stored as decimals,
            never floats.
          </p>
        </>
      )}
    </div>
  );
}
