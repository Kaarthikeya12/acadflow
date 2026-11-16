import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import { listMyOfferings } from '@/lib/data/faculty';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { one, pageParam, pageSizeParam, paginationParams, type SearchParams } from '@/components/query';
import type { OfferingDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My offerings' };

const STATUSES: Array<OfferingDTO['status']> = ['draft', 'active', 'closed', 'archived'];

export default async function FacultyOfferingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('faculty');
  const params = await searchParams;
  const q = one(params.q);
  const statusRaw = one(params.status);
  const status =
    statusRaw && STATUSES.includes(statusRaw as OfferingDTO['status'])
      ? (statusRaw as OfferingDTO['status'])
      : undefined;
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 20);

  const result = await listMyOfferings(viewer, { page, pageSize, q, status });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Teaching"
        title="My offerings"
        description="Every course offering you are assigned to, with its term, section and live roster size."
      />

      <FilterBar action="/faculty/offerings" resetHref="/faculty/offerings">
        <div className="flex flex-col gap-1">
          <label htmlFor="offering-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Search
          </label>
          <SearchFilter id="offering-search" defaultValue={q} placeholder="Course code or title" />
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

      {result.items.length === 0 ? (
        <EmptyState
          title="No offerings found"
          description={
            q || statusRaw
              ? 'Adjust the filters and try again.'
              : 'You have not been assigned to an offering yet. An administrator manages faculty assignments.'
          }
        />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Term</Th>
                <Th>Section</Th>
                <Th>Status</Th>
                <Th align="right">Roster</Th>
                <Th align="right">Manage</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((offering) => (
                <tr key={offering.id} className="align-top hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{offering.courseCode}</p>
                    <p className="max-w-xs text-xs text-muted">{offering.courseTitle}</p>
                  </Td>
                  <Td className="text-xs text-muted">
                    {offering.termLabel}
                    <span className="block">{offering.academicYear}</span>
                  </Td>
                  <Td className="font-mono text-xs">{offering.sectionCode}</Td>
                  <Td>
                    <StatusBadge status={offering.status} />
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {offering.enrolledCount}
                    {offering.capacity ? ` / ${offering.capacity}` : ''}
                  </Td>
                  <Td align="right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <ButtonLink
                        href={`/faculty/offerings/${offering.id}`}
                        size="sm"
                        variant="secondary"
                      >
                        Workspace
                      </ButtonLink>
                      <ButtonLink
                        href={`/faculty/offerings/${offering.id}?tab=attendance`}
                        size="sm"
                        variant="ghost"
                      >
                        Attendance
                      </ButtonLink>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/faculty/offerings"
            searchParams={paginationParams(params, ['q', 'status'])}
          />
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Need a different section or teaching assignment? Offerings are created and staffed by an
        administrator in{' '}
        <Link href="/faculty/dashboard" className="font-medium text-info hover:underline">
          academic operations
        </Link>
        .
      </p>
    </div>
  );
}
