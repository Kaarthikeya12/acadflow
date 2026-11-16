import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { roleHomePath } from '@/lib/auth/role-home';
import { Brand, BrandMark } from '@/components/brand';
import { ArrowRightIcon, CheckIcon, ShieldIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user) redirect(roleHomePath(user.role));

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[46%_54%]">
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col">
        <div className="dot-field absolute inset-0 opacity-[0.12]" aria-hidden />
        <div
          className="absolute -right-24 top-24 h-72 w-72 rounded-full border border-paper/10"
          aria-hidden
        />
        <div
          className="absolute -right-10 top-40 h-48 w-48 rounded-full border border-paper/[0.07]"
          aria-hidden
        />

        <div className="relative flex h-20 items-center gap-2.5 px-10">
          <BrandMark />
          <div className="leading-none">
            <p className="font-display text-base font-semibold tracking-[-0.04em]">AcadFlow</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-paper/45">
              Academic operations
            </p>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-10 xl:px-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">
            One academic workspace
          </p>
          <h2 className="mt-4 max-w-md text-balance font-display text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.045em] xl:text-[3rem]">
            The semester,
            <br />
            in one calm place.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/60">
            Academic setup, teaching, attendance and grading connected by the same institutional
            data.
          </p>

          <ul className="mt-10 max-w-sm divide-y divide-paper/10 border-y border-paper/10">
            {[
              ['Admin', 'Departments, offerings and enrollment'],
              ['Faculty', 'Sessions, assignments and gradebook'],
              ['Student', 'Timetable, submissions and results'],
            ].map(([role, description]) => (
              <li key={role} className="flex items-center gap-3 py-3.5">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-paper/20 text-paper/70">
                  <CheckIcon size={13} />
                </span>
                <span className="w-16 text-[11px] font-semibold uppercase tracking-[0.12em] text-paper/50">
                  {role}
                </span>
                <span className="text-[13px] text-paper/75">{description}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 inline-flex max-w-sm items-start gap-2.5 rounded-lg border border-paper/15 bg-paper/[0.04] p-3.5">
            <ShieldIcon size={16} className="mt-0.5 shrink-0 text-accent-yellow" />
            <p className="text-[12px] leading-relaxed text-paper/60">
              Access is verified on the server for every page and action. Grade changes are
              permanently audited.
            </p>
          </div>
        </div>

        <div className="relative px-10 pb-8 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-paper/50 transition-colors hover:text-paper"
          >
            Back to acadflow.com <ArrowRightIcon size={13} />
          </Link>
        </div>
        <div className="accent-rule" aria-hidden />
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-8 lg:justify-end lg:border-b-0">
          <Brand className="lg:hidden" />
          <Link
            href="/"
            className="hidden text-xs font-medium text-muted transition-colors hover:text-ink lg:inline-flex"
          >
            ← Back to home
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-8">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
        <footer className="px-4 py-5 text-center text-[11px] text-muted sm:px-8">
          Institution-provisioned access · Session expires after 8 hours of inactivity
        </footer>
      </div>
    </div>
  );
}
