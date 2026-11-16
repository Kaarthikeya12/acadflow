import { LoginForm } from '@/components/auth/login-form';
import { one } from '@/components/query';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <LoginForm
      showDemo={process.env.NODE_ENV !== 'production'}
      created={one(params.created) === '1'}
    />
  );
}
