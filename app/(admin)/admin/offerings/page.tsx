import Link from 'next/link';
import { requirePageRole } from '@/lib/authz/guards';
import {
  listAdminOfferings,
  listAdminTerms,
  listCourseOptionsForAdmin,
  listFacultyOptions,
} from '@/lib/data/admin';
import {
  OfferingCreateForm,
  OfferingEditForm,
  OfferingStatusForm,
  OfferingStatusNote,
} from '@/components/admin/offering-forms';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import { Disclosure } from '@/components/form';
import {
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
import { one, pageParam, pageSizeParam, paginationParams, type SearchParams } from '@/components/query';
import type { OfferingDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Course offerings' };

const STATUSES: Array<OfferingDTO['status']> = ['draft', 'active', 'closed', 'archived'];

export default async function AdminOfferingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('admin');
  const params = await searchParams;
  const q = one(params.q);
  const courseId = one(params.courseId);
  const termId = one(params.termId);
  const facultyUserId = one(params.facultyUserId);
  const statusRaw = one(params.status);
  const status = statusRaw && STATUSES.includes(statusRaw as OfferingDTO['status'])
    ? (statusRaw as OfferingDTO['status'])
    : undefined;
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 20);

  const [courses, terms, faculty, result] = await Promise.all([
    listCourseOptionsForAdmin(viewer),
    listAdminTerms(viewer),
    listFacultyOptions(viewer),
    listAdminOfferings(viewer, { page, pageSize, q, courseId, termId, facultyUserId, status }),
  ]);

  const canCreate = courses.length > 0 && terms.length > 0 && faculty.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Course offerings"
        description="A course offered in a term, taught by exactly one faculty member and populated by enrollments."
      />

      <Card>
        <CardHeader
          title="Open a course offering"
          description="New offerings start as drafts so rosters and sessions can be prepared first."
        />
        <div className="p-5">
          {canCreate ? (
            <OfferingCreateForm courses={courses} terms={terms} faculty={faculty} />
          ) : (
            <EmptyState
              compact
              title="Setup is incomplete"
              description={
                courses.length === 0
                  ? 'Add at least one active course before creating an offering.'
                  : terms.length === 0
                    ? 'Add an academic term before creating an offering.'
                    : 'Provision at least one active faculty member before creating an offering.'
              }
            />
          )}
        </div>
      </Card>

      <FilterBar action="/admin/offerings" resetHref="/admin/offerings">
        <div className="flex flex-col gap-1">
          <label htmlFor="offering-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Search
          </label>
          <SearchFilter id="offering-search" defaultValue={q} placeholder="Course or faculty" />
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
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Faculty</label>
          <SelectFilter name="facultyUserId" defaultValue={facultyUserId}>
            <option value="">All faculty</option>
            {faculty.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
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
          title="No offerings found"
          description={q || courseId || termId || facultyUserId || statusRaw ? 'Adjust the filters and try again.' : 'Open the first offering above.'}
        />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Term</Th>
                <Th>Faculty</Th>
                <Th>Section</Th>
                <Th align="right">Roster</Th>
                <Th>Status</Th>
                <Th align="right">Manage</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((offering) => (
                <tr key={offering.id} className="align-top hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{offering.courseCode}</p>
                    <p className="max-w-xs text-xs text-muted">{offering.courseTitle}</p>
                    <Link
                      href={`/admin/enrollments?offeringId=${offering.id}`}
                      className="mt-1 inline-block text-[11px] font-medium text-info hover:underline"
                    >
                      View roster →
                    </Link>
                  </Td>
                  <Td className="text-xs text-muted">
                    {offering.termLabel}
                    <span className="block">{offering.academicYear}</span>
                  </Td>
                  <Td className="text-xs">{offering.facultyName}</Td>
                  <Td className="font-mono text-xs">{offering.sectionCode}</Td>
                  <Td align="right" className="tabular-nums">
                    {offering.enrolledCount}
                    {offering.capacity ? ` / ${offering.capacity}` : ''}
                  </Td>
                  <Td>
                    <StatusBadge status={offering.status} />
                    <div className="mt-2">
                      <Disclosure summary="Change status" tone="ghost">
                        <OfferingStatusForm offering={offering} />
                        <div className="mt-2">
                          <OfferingStatusNote />
                        </div>
                      </Disclosure>
                    </div>
                  </Td>
                  <Td align="right">
                    <Disclosure summary="Edit" tone="ghost">
                      <OfferingEditForm offering={offering} faculty={faculty} />
                    </Disclosure>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/admin/offerings"
            searchParams={paginationParams(params, ['q', 'courseId', 'termId', 'facultyUserId', 'status'])}
          />
        </div>
      )}
    </div>
  );
}
