import Link from 'next/link';
import { Brand } from '@/components/brand';
import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line px-4 py-4 sm:px-8">
        <Brand />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <p className="font-mono text-xs text-muted">404</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em]">
            We couldn’t find that page
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The link may be out of date, or the record may have been removed. Your session is
            still active.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/">Back to home</ButtonLink>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-sm font-medium hover:border-ink"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <div className="accent-rule" aria-hidden />
    </main>
  );
}
