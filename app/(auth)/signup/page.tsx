import { SignupForm } from '@/components/auth/signup-form';
import { listActiveDepartments } from '@/lib/db/queries/admin';

export const metadata = { title: 'Create student account' };
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const departments = await listActiveDepartments();
  return (
    <SignupForm departments={departments} defaultAdmissionYear={new Date().getFullYear()} />
  );
}
