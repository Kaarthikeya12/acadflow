import { requirePageRole } from '@/lib/authz/guards';
import { listDepartmentOptions, listUsers } from '@/lib/data/admin';
import {
  ResetPasswordForm,
  UserActiveToggle,
  UserCreateForm,
  UserEditForm,
} from '@/components/admin/user-forms';
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
import type { Role } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Faculty & students' };

const ROLES: Role[] = ['admin', 'faculty', 'student'];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requirePageRole('admin');
  const params = await searchParams;
  const q = one(params.q);
  const roleRaw = one(params.role);
  const role = roleRaw && ROLES.includes(roleRaw as Role) ? (roleRaw as Role) : undefined;
  const departmentId = one(params.departmentId);
  const activeRaw = one(params.isActive);
  const isActive = activeRaw === 'true' ? true : activeRaw === 'false' ? false : undefined;
  const page = pageParam(params);
  const pageSize = pageSizeParam(params, 20);

  const [departments, result] = await Promise.all([
    listDepartmentOptions(viewer),
    listUsers(viewer, { page, pageSize, q, role, departmentId, isActive }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="People"
        title="Faculty & students"
        description="Provision accounts, keep profiles current and deactivate access without deleting history."
      />

      <Card>
        <CardHeader
          title="Provision an account"
          description="Create a faculty, student or administrator account and share the temporary password securely."
        />
        <div className="p-5">
          <UserCreateForm departments={departments} />
        </div>
      </Card>

      <FilterBar action="/admin/users" resetHref="/admin/users">
        <div className="flex flex-col gap-1">
          <label htmlFor="user-search" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Search
          </label>
          <SearchFilter id="user-search" defaultValue={q} placeholder="Name, email, roll or employee no." />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Role</label>
          <SelectFilter name="role" defaultValue={roleRaw}>
            <option value="">All roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Administrators</option>
          </SelectFilter>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Department</label>
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
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Status</label>
          <SelectFilter name="isActive" defaultValue={activeRaw}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectFilter>
        </div>
      </FilterBar>

      {result.items.length === 0 ? (
        <EmptyState
          title="No accounts found"
          description={q || role || departmentId || activeRaw ? 'Adjust the filters and try again.' : 'Provision the first account above.'}
        />
      ) : (
        <div>
          <TableShell>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Role</Th>
                <Th>Department</Th>
                <Th>Identifier</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((user) => (
                <tr key={user.id} className="align-top hover:bg-surface/70">
                  <Td>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Disclosure summary="Edit profile" tone="ghost">
                        <UserEditForm user={user} departments={departments} />
                      </Disclosure>
                      <Disclosure summary="Reset password" tone="ghost">
                        <ResetPasswordForm userId={user.id} />
                      </Disclosure>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={user.role === 'admin' ? 'ink' : user.role === 'faculty' ? 'accent' : 'info'}>
                      {user.role === 'admin' ? 'Administrator' : user.role === 'faculty' ? 'Faculty' : 'Student'}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-muted">{user.departmentName ?? '—'}</Td>
                  <Td className="font-mono text-xs">
                    {user.employeeNo ?? user.rollNo ?? '—'}
                    {user.program ? <p className="mt-0.5 font-sans text-[11px] text-muted">{user.program}</p> : null}
                  </Td>
                  <Td>
                    <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                  </Td>
                  <Td align="right">
                    <UserActiveToggle userId={user.id} isActive={user.isActive} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/admin/users"
            searchParams={paginationParams(params, ['q', 'role', 'departmentId', 'isActive'])}
          />
        </div>
      )}
    </div>
  );
}
