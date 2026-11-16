import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import {
  listAdminEnrollments,
  listAdminOfferings,
  listStudentOptions,
} from '@/lib/data/admin';
import { EnrollmentCreateForm, EnrollmentStatusForm } from '@/components/admin/enrollment-forms';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pagination,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDate } from '@/components/format';
import { one, pageParam, pageSizeParam, paginationParams, type SearchParams } from '@/components/query';
import type { EnrollmentDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Enrollments' };

const STATUSES: Array<EnrollmentDTO['status']> = ['active', 'dropped', 'completed'];

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('admin');
  const params = await searchParams;
  const q = one(params.q);
  const offeringId = one(params.offeringId);
  const statusRaw = one(params.status);
  const status = statusRaw && STATUSES.includes(statusRaw as EnrollmentDTO['status'])
    ? (statusRaw as EnrollmentDTO['status'])
    : undefined;
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 20);

  const [offeringPage, students, result] = await Promise.all([
    listAdminOfferings(viewer, { pageSize: 100 }),
    listStudentOptions(viewer),
    listAdminEnrollments(viewer, { page, pageSize, q, offeringId, status }),
  ]);

  const offeringMap = new Map(offeringPage.items.map((offering) => [offering.id, offering]));
  const selectedOffering = offeringId ? offeringMap.get(offeringId) : undefined;
  const activeOfferings = offeringPage.items.filter((offering) => offering.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Enrollments"
        description="Rosters are generated from enrollment records. A student may hold only one row per offering."
        actions={
          selectedOffering ? (
            <ButtonLink href="/admin/enrollments" variant="secondary" size="sm">
              Clear offering filter
            </ButtonLink>
          ) : null
        }
      />

      {selectedOffering ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line band-muted px-5 py-3">
          <div>
            <p className="text-sm font-semibold">
              {selectedOffering.courseCode} · Section {selectedOffering.sectionCode}
            </p>
            <p className="text-xs text-muted">
              {selectedOffering.courseTitle} · {selectedOffering.termLabel} {selectedOffering.academicYear} ·{' '}
              {selectedOffering.facultyName}
            </p>
          </div>
          <Badge tone="ink">{selectedOffering.enrolledCount} active</Badge>
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Enroll a student"
          description="Only active offerings accept new enrollments. Dropped students can be reactivated."
        />
        <div className="p-5">
          {activeOfferings.length === 0 || students.length === 0 ? (
            <EmptyState
              compact
              title="Nothing to enroll yet"
              description={
                activeOfferings.length === 0
                  ? 'Activate a course offering before adding students.'
                  : 'Provision at least one active student account first.'
              }
            />
          ) : (
            <EnrollmentCreateForm
              offerings={activeOfferings}
              students={students}
            />
          )}
        </div>
      </Card>

      <FilterBar action="/admin/enrollments" resetHref="/admin/enrollments">
        <div className="flex flex-col gap-1">
          <label htmlFor="enrollment-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Search
          </label>
          <SearchFilter id="enrollment-search" defaultValue={q} placeholder="Student name or roll number" />
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
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Status</label>
          <SelectFilter name="status" defaultValue={statusRaw}>
            <option value="">All</option>
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
          title="No enrollments found"
          description={
            q || offeringId || statusRaw
              ? 'Adjust the filters and try again.'
              : 'Enroll the first student above. Rosters drive attendance and submissions.'
          }
        />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Roll number</Th>
                <Th>Offering</Th>
                <Th>Enrolled</Th>
                <Th>Status</Th>
                <Th align="right">Change status</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((enrollment) => {
                const offering = offeringMap.get(enrollment.offeringId);
                return (
                  <tr key={enrollment.id} className="hover:bg-surface/70">
                    <Td className="font-medium">{enrollment.studentName}</Td>
                    <Td className="font-mono text-xs">{enrollment.rollNo}</Td>
                    <Td className="text-xs">
                      {offering ? (
                        <Link
                          href={`/admin/enrollments?offeringId=${offering.id}`}
                          className="font-medium hover:underline"
                        >
                          {offering.courseCode}
                        </Link>
                      ) : (
                        '—'
                      )}
                      {offering ? <p className="text-muted">{offering.termLabel}</p> : null}
                    </Td>
                    <Td className="text-xs text-muted">{formatDate(enrollment.enrolledAt)}</Td>
                    <Td>
                      <StatusBadge status={enrollment.status} />
                    </Td>
                    <Td align="right">
                      <EnrollmentStatusForm enrollment={enrollment} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/admin/enrollments"
            searchParams={paginationParams(params, ['q', 'offeringId', 'status'])}
          />
        </div>
      )}
    </div>
  );
}
