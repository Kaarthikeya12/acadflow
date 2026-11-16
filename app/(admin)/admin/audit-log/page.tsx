import { requirePageRole } from '@/lib/authz/guards';
import { getAdminGradeChanges, listAdminOfferings } from '@/lib/data/admin';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import {
  Badge,
  EmptyState,
  PageHeader,
  Pagination,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDateTime } from '@/components/format';
import { one, pageParam, pageSizeParam, paginationParams, type SearchParams } from '@/components/query';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Grade audit log' };

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('admin');
  const params = await searchParams;
  const q = one(params.courseCode);
  const offeringId = one(params.offeringId);
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 25);

  const [offeringPage, result] = await Promise.all([
    listAdminOfferings(viewer, { pageSize: 100 }),
    getAdminGradeChanges(viewer, { page, pageSize, offeringId, courseCode: q }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Oversight"
        title="Grade audit log"
        description="An immutable record of every initial mark and every later change, written by the database trigger in the same transaction as the grade."
        actions={<Badge tone="warning">Read-only</Badge>}
      />

      <FilterBar action="/admin/audit-log" resetHref="/admin/audit-log">
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-course" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Course code
          </label>
          <SearchFilter id="audit-course" defaultValue={q} placeholder="e.g. CS301" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Offering</label>
          <SelectFilter name="offeringId" defaultValue={offeringId}>
            <option value="">All offerings</option>
            {offeringPage.items.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.courseCode} · {offering.termLabel} {offering.academicYear}
              </option>
            ))}
          </SelectFilter>
        </div>
      </FilterBar>

      {result.items.length === 0 ? (
        <EmptyState
          title="No grade changes recorded"
          description={
            q || offeringId
              ? 'No audit entries match these filters.'
              : 'Entries appear here the first time a submission is graded.'
          }
        />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Changed at</Th>
                <Th>Student</Th>
                <Th>Course / assignment</Th>
                <Th align="right">Old marks</Th>
                <Th align="right">New marks</Th>
                <Th>Type</Th>
                <Th>Changed by</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((entry) => (
                <tr key={entry.id} className="align-top hover:bg-surface/70">
                  <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(entry.changedAt)}</Td>
                  <Td className="font-medium">{entry.studentName}</Td>
                  <Td className="text-xs">
                    <span className="font-mono font-medium">{entry.courseCode}</span>
                    <p className="mt-0.5 max-w-xs text-muted">{entry.assignmentTitle}</p>
                  </Td>
                  <Td align="right" className="tabular-nums text-muted">
                    {entry.oldMarks ?? '—'}
                  </Td>
                  <Td align="right" className="font-medium tabular-nums">
                    {entry.newMarks}
                  </Td>
                  <Td>
                    <Badge tone={entry.changeType === 'initial' ? 'info' : 'warning'}>
                      {entry.changeType === 'initial' ? 'Initial' : 'Update'}
                    </Badge>
                  </Td>
                  <Td className="text-xs">{entry.changedByName}</Td>
                  <Td className="max-w-[16rem] text-xs text-muted">{entry.reason ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/admin/audit-log"
            searchParams={paginationParams(params, ['courseCode', 'offeringId'])}
          />
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Audit entries cannot be edited or deleted from the application. This screen deliberately
        offers no destructive actions.
      </p>
    </div>
  );
}
