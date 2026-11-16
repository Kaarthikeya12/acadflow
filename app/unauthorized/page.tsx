import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/session';
import { roleHomePath } from '@/lib/auth/role-home';
import { Brand } from '@/components/brand';
import { ButtonLink } from '@/components/ui';
import { ShieldIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Not authorized' };
export const dynamic = 'force-dynamic';

export default async function UnauthorizedPage() {
  const user = await getSessionUser();
  const home = user ? roleHomePath(user.role) : '/login';

  return (
    <main id="main" className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line px-4 py-4 sm:px-8">
        <Brand />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-surface">
            <ShieldIcon size={22} />
          </span>
          <p className="eyebrow mt-6">403 · Access denied</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em]">
            This page isn’t part of your workspace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {user
              ? `You’re signed in as ${user.fullName} (${user.role}). This page belongs to a different role or a course you aren’t assigned to.`
              : 'Your account does not have permission to open this page.'}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={home}>Go to your dashboard</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Back to home
            </ButtonLink>
          </div>

          <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            If you believe this is a mistake, contact your academic office. Hiding a link is not
            how AcadFlow protects data — the server checks every request.
          </p>
          <Link href="/login" className="mt-3 inline-block text-xs font-medium text-ink underline">
            Sign in with a different account
          </Link>
        </div>
      </div>
      <div className="accent-rule" aria-hidden />
    </main>
  );
}
