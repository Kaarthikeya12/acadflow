import { requirePageRole } from '@/lib/authz/guards';
import { listCourses, listDepartmentOptions } from '@/lib/data/admin';
import {
  CourseActiveToggle,
  CourseCreateForm,
  CourseEditForm,
} from '@/components/admin/master-data-forms';
import { FilterBar, SearchFilter, SelectFilter } from '@/components/filters';
import { Disclosure } from '@/components/form';
import {
  Badge,
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
export const metadata = { title: 'Courses' };

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('admin');
  const params = await searchParams;
  const q = one(params.q);
  const departmentId = one(params.departmentId);
  const activeRaw = one(params.isActive);
  const isActive = activeRaw === 'true' ? true : activeRaw === 'false' ? false : undefined;
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 20);

  const [departments, result] = await Promise.all([
    listDepartmentOptions(viewer),
    listCourses(viewer, { page, pageSize, q, departmentId, isActive }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Academic setup"
        title="Course catalogue"
        description="Every course belongs to one department and carries the credits used later by offerings."
      />

      <Card>
        <CardHeader title="Add a course" description="Course codes must be unique across the institution." />
        <div className="p-5">
          {departments.length === 0 ? (
            <EmptyState compact title="Add a department first" description="Courses need an owning department." />
          ) : (
            <CourseCreateForm departments={departments} />
          )}
        </div>
      </Card>

      <FilterBar action="/admin/courses" resetHref="/admin/courses">
        <div className="flex flex-col gap-1">
          <label htmlFor="course-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Search
          </label>
          <SearchFilter id="course-search" defaultValue={q} placeholder="Code or title" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Department
          </label>
          <SelectFilter name="departmentId" defaultValue={departmentId}>
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} — {department.name}
              </option>
            ))}
          </SelectFilter>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Status
          </label>
          <SelectFilter name="isActive" defaultValue={activeRaw}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectFilter>
        </div>
      </FilterBar>

      {result.items.length === 0 ? (
        <EmptyState
          title="No courses found"
          description={q || departmentId || activeRaw ? 'Adjust the filters and try again.' : 'Add the first course to the catalogue.'}
        />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Course</Th>
                <Th>Department</Th>
                <Th align="right">Credits</Th>
                <Th align="right">Offerings</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((course) => (
                <tr key={course.id} className="align-top hover:bg-surface/70">
                  <Td className="font-mono text-xs font-medium">{course.code}</Td>
                  <Td>
                    <p className="font-medium">{course.title}</p>
                    {course.description ? (
                      <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted">
                        {course.description}
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <Disclosure summary="Edit course" tone="ghost">
                        <CourseEditForm course={course} departments={departments} />
                      </Disclosure>
                    </div>
                  </Td>
                  <Td className="text-xs text-muted">{course.departmentName}</Td>
                  <Td align="right" className="tabular-nums">
                    {course.credits}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {course.offeringCount}
                  </Td>
                  <Td>
                    <StatusBadge status={course.isActive ? 'active' : 'inactive'} />
                  </Td>
                  <Td align="right">
                    <CourseActiveToggle id={course.id} isActive={course.isActive} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/admin/courses"
            searchParams={paginationParams(params, ['q', 'departmentId', 'isActive'])}
          />
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        <Badge tone="neutral">Note</Badge> Deactivated courses stay attached to historical
        offerings and enrolled students.
      </p>
    </div>
  );
}
