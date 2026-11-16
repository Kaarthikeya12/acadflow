import { requirePageRole } from '@/lib/authz/guards';
import { listDepartments } from '@/lib/data/admin';
import {
  DepartmentActiveToggle,
  DepartmentCreateForm,
  DepartmentEditForm,
} from '@/components/admin/master-data-forms';
import { FilterBar, SearchFilter } from '@/components/filters';
import { Disclosure } from '@/components/form';
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
import { one, pageParam, pageSizeParam, paginationParams, type SearchParams } from '@/components/query';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Departments' };

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('admin');
  const params = await searchParams;
  const q = one(params.q);
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 20);

  const result = await listDepartments(viewer, { page, pageSize, q });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Academic setup"
        title="Departments"
        description="The academic units that own courses, faculty and student profiles. Deactivating keeps every record intact."
        actions={
          <ButtonLink href="/admin/courses" variant="secondary" size="sm">
            View courses
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader title="Add a department" description="Codes are unique and stored in upper case." />
        <div className="p-5">
          <DepartmentCreateForm />
        </div>
      </Card>

      <FilterBar action="/admin/departments" resetHref="/admin/departments">
        <div className="flex flex-col gap-1">
          <label htmlFor="dept-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Search
          </label>
          <SearchFilter id="dept-search" defaultValue={q} placeholder="Code or name" />
        </div>
      </FilterBar>

      {result.items.length === 0 ? (
        <EmptyState
          title="No departments found"
          description={q ? 'Try a different search term.' : 'Add the first department to start building the catalogue.'}
        />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Department</Th>
                <Th align="right">Courses</Th>
                <Th align="right">Faculty</Th>
                <Th align="right">Students</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((department) => (
                <tr key={department.id} className="align-top hover:bg-surface/70">
                  <Td className="font-mono text-xs font-medium">{department.code}</Td>
                  <Td>
                    <p className="font-medium">{department.name}</p>
                    <div className="mt-2">
                      <Disclosure summary="Edit details" tone="ghost">
                        <DepartmentEditForm department={department} />
                      </Disclosure>
                    </div>
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {department.courseCount}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {department.facultyCount}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {department.studentCount}
                  </Td>
                  <Td>
                    <StatusBadge status={department.isActive ? 'active' : 'inactive'} />
                  </Td>
                  <Td align="right">
                    <DepartmentActiveToggle id={department.id} isActive={department.isActive} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/admin/departments"
            searchParams={paginationParams(params, ['q'])}
          />
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        <Badge tone="neutral">Note</Badge> Departments are never hard-deleted. Deactivate a
        department when it should stop appearing in new setup forms.
      </p>
    </div>
  );
}
