import { requirePageRole } from '@/lib/authz/guards';
import { getStudentProfile } from '@/lib/data/student';
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

export default async function StudentProfilePage() {
  const viewer = await requirePageRole('student');
  const profile = await getStudentProfile(viewer);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="The academic record AcadFlow holds for you. These details are maintained by academic operations."
        actions={
          <ButtonLink href="/student/courses" variant="secondary" size="sm">
            My courses
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Student record"
            description="Institution-managed identity and enrolment details."
            action={<Badge tone="info">Read-only</Badge>}
          />
          <dl className="grid gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-2">
            <KeyValue label="Full name" value={profile.fullName} />
            <KeyValue label="Roll number" value={<span className="font-mono">{profile.rollNo}</span>} />
            <KeyValue label="Program" value={profile.program} />
            <KeyValue label="Batch" value={profile.batch ?? '—'} />
            <KeyValue label="Admission year" value={profile.admissionYear} />
            <KeyValue
              label="Department"
              value={
                <span>
                  <span className="font-mono text-xs">{profile.departmentCode}</span>
                  <span className="block text-xs font-normal text-muted">{profile.departmentName}</span>
                </span>
              }
            />
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
        Name, roll number, program, batch and department are part of your official record, so they cannot
        be edited here. Contact academic operations with your roll number if something is incorrect. If you
        have forgotten your password, ask them to reset it for you.
      </Alert>
    </div>
  );
}
