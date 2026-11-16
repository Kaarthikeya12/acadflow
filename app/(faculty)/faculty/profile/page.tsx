import { requirePageRole } from '@/lib/authz/guards';
import { getFacultyProfile } from '@/lib/data/faculty';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  KeyValue,
  PageHeader,
} from '@/components/ui';
import { formatDateTime } from '@/components/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My profile' };

export default async function FacultyProfilePage() {
  const viewer = await requirePageRole('faculty');
  const profile = await getFacultyProfile(viewer);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Your faculty record and account details as held by the institution."
        actions={
          <ButtonLink href="/faculty/offerings" variant="secondary" size="sm">
            My offerings
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Faculty record"
            description="Institution-managed appointment and department details."
            action={<Badge tone="info">Read-only</Badge>}
          />
          <dl className="grid gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-2">
            <KeyValue label="Full name" value={profile.fullName} />
            <KeyValue
              label="Employee number"
              value={<span className="font-mono">{profile.employeeNo}</span>}
            />
            <KeyValue label="Designation" value={profile.designation ?? '—'} />
            <KeyValue
              label="Department"
              value={
                <span>
                  <span className="font-mono text-xs">{profile.departmentCode}</span>
                  <span className="block text-xs font-normal text-muted">{profile.departmentName}</span>
                </span>
              }
            />
            <KeyValue label="Active offerings" value={profile.activeOfferings} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Account" description="How you sign in to AcadFlow." />
          <dl className="flex flex-col gap-5 px-5 py-5">
            <KeyValue label="Email" value={profile.email} />
            <KeyValue
              label="Status"
              value={
                <Badge tone={profile.isActive ? 'success' : 'danger'}>
                  {profile.isActive ? 'Active' : 'Deactivated'}
                </Badge>
              }
            />
            <KeyValue
              label="Last sign-in"
              value={profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : 'Not recorded yet'}
            />
          </dl>
        </Card>
      </div>

      <Alert tone="neutral" title="Need a change?">
        Name, employee number, designation and department are part of your official appointment record,
        so they cannot be edited here. Contact academic operations if something is incorrect. If you have
        forgotten your password, ask them to reset it for you.
      </Alert>
    </div>
  );
}
