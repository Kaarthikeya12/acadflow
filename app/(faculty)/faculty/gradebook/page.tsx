import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import {
  getFacultyGradeChanges,
  getOfferingFinalGrades,
  listMyOfferings,
} from '@/lib/data/faculty';
import { FinalGradeActions } from '@/components/faculty/grading-forms';
import { FilterBar, SelectFilter } from '@/components/filters';
import {
  Alert,
  Badge,
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
import { formatDateTime, formatPercent } from '@/components/format';
import { one, type SearchParams } from '@/components/query';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gradebook' };

export default async function FacultyGradebookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('faculty');
  const params = await searchParams;
  const offeringId = one(params.offeringId);

  const offerings = await listMyOfferings(viewer, { pageSize: 100 });
  const selectedOffering = offeringId
    ? offerings.items.find((offering) => offering.id === offeringId)
    : undefined;

  const [finalGrades, changes] = selectedOffering
    ? await Promise.all([
        getOfferingFinalGrades(viewer, selectedOffering.id),
        getFacultyGradeChanges(viewer, { offeringId: selectedOffering.id, pageSize: 10 }),
      ])
    : [null, null];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Assessment"
        title="Gradebook"
        description="Compute final grades from the active policy, publish results, and inspect every mark change."
        actions={
          <ButtonLink href="/faculty/submissions" variant="secondary" size="sm">
            Submissions
          </ButtonLink>
        }
      />

      <FilterBar action="/faculty/gradebook" resetHref="/faculty/gradebook">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Offering</label>
          <SelectFilter name="offeringId" defaultValue={offeringId}>
            <option value="">Choose an offering</option>
            {offerings.items.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.courseCode} · {offering.termLabel} {offering.academicYear}
              </option>
            ))}
          </SelectFilter>
        </div>
      </FilterBar>

      {!selectedOffering ? (
        offerings.items.length === 0 ? (
          <EmptyState
            title="No offerings assigned"
            description="A gradebook appears once an administrator assigns you to an offering."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {offerings.items.map((offering) => (
              <Link
                key={offering.id}
                href={`/faculty/gradebook?offeringId=${offering.id}`}
                className="group rounded-lg border border-line bg-paper p-5 transition-colors hover:border-ink"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg font-semibold tracking-[-0.02em]">
                    {offering.courseCode}
                  </p>
                  <StatusBadge status={offering.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{offering.courseTitle}</p>
                <p className="mt-3 text-xs text-muted">
                  {offering.termLabel} · {offering.academicYear} · Section {offering.sectionCode}
                </p>
                <p className="mt-3 text-xs font-medium text-muted group-hover:text-ink">
                  Open gradebook →
                </p>
              </Link>
            ))}
          </div>
        )
      ) : (
        <>
          {!selectedOffering ? null : (
            <Card>
              <CardHeader
                title={`${selectedOffering.courseCode} — ${selectedOffering.courseTitle}`}
                description={`${selectedOffering.termLabel} · ${selectedOffering.academicYear} · Section ${selectedOffering.sectionCode}`}
                action={<StatusBadge status={selectedOffering.status} />}
              />
            </Card>
          )}

          {finalGrades ? (
            finalGrades.policy ? (
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
                    offeringId={selectedOffering.id}
                    policyConfigured={finalGrades.policyConfigured}
                    hasRows={finalGrades.rows.length > 0}
                  />
                </div>
              </Card>
            ) : (
              <Alert tone="warning" title="No active grade policy">
                Final grades cannot be computed for this term until an administrator configures an
                active grade policy.
              </Alert>
            )
          ) : null}

          <Card>
            <CardHeader
              title="Final grades"
              description="Computed values stay draft until you publish them to students."
            />
            {!finalGrades || finalGrades.rows.length === 0 ? (
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
                      <Td className="font-medium">{row.studentName}</Td>
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
              description="Every initial mark and every later change, captured by the database audit trigger."
            />
            {!changes || changes.items.length === 0 ? (
              <div className="p-5">
                <EmptyState compact title="No grade changes yet" description="Entries appear once submissions are graded." />
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
            Publishing final grades makes them visible on each student’s grades page. Re-computing
            afterwards updates stored drafts without silently publishing them again.
          </p>
        </>
      )}
    </div>
  );
}
