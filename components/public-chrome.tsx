import Link from 'next/link';
import { Brand } from './brand';
import { ButtonLink, cn } from './ui';
import type { Role } from '@/types/contracts';

export function PublicHeader({
  signedInRole,
}: {
  signedInRole?: Role | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted md:flex" aria-label="Landing">
          <Link href="#roles" className="transition-colors hover:text-ink">
            Who it’s for
          </Link>
          <Link href="#workflows" className="transition-colors hover:text-ink">
            Workflows
          </Link>
          <Link href="#principles" className="transition-colors hover:text-ink">
            Principles
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {signedInRole ? (
            <ButtonLink href={`/${signedInRole}/dashboard`} size="sm">
              Open dashboard
            </ButtonLink>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-md px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface sm:inline-flex"
              >
                Sign in
              </Link>
              <ButtonLink href="/signup" size="sm" variant="primary">
                Create account
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t border-line bg-paper', className)}>
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Brand />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            A focused academic workspace for departments, faculty and students — built around
            real institutional data.
          </p>
        </div>
        <div>
          <p className="eyebrow">Product</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <li>
              <Link href="#roles" className="hover:text-ink">
                Role workspaces
              </Link>
            </li>
            <li>
              <Link href="#workflows" className="hover:text-ink">
                Academic workflows
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-ink">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-ink">
                Student sign-up
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Institution</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <li>Accounts are managed by your institution.</li>
            <li>Deadlines use the institutional timezone.</li>
            <li>Grade changes are audited automatically.</li>
          </ul>
        </div>
      </div>
      <div className="accent-rule" aria-hidden />
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-muted sm:px-6 lg:px-8">
        <span>© {new Date().getFullYear()} AcadFlow. Academic operations system.</span>
        <span>Built for real semesters, not spreadsheets.</span>
      </div>
    </footer>
  );
}
