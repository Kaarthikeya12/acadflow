'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { logoutAction } from '@/lib/actions/auth';
import type { Role } from '@/types/contracts';
import { Brand, BrandMark } from './brand';
import {
  BookIcon,
  CalendarIcon,
  CapIcon,
  ChartIcon,
  ClipboardIcon,
  CloseIcon,
  FileIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  ShieldIcon,
  UsersIcon,
  BuildingIcon,
  ClockIcon,
  UserIcon,
} from './icons';
import { cn } from './ui';

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };
type NavGroup = { label: string; items: NavItem[] };

const ICONS = {
  grid: GridIcon,
  building: BuildingIcon,
  book: BookIcon,
  users: UsersIcon,
  calendar: CalendarIcon,
  clipboard: ClipboardIcon,
  chart: ChartIcon,
  shield: ShieldIcon,
  cap: CapIcon,
  clock: ClockIcon,
  file: FileIcon,
  user: UserIcon,
};

const NAV: Record<Role, NavGroup[]> = {
  admin: [
    {
      label: 'Overview',
      items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: 'grid' }],
    },
    {
      label: 'Academic setup',
      items: [
        { href: '/admin/departments', label: 'Departments', icon: 'building' },
        { href: '/admin/courses', label: 'Courses', icon: 'book' },
        { href: '/admin/terms', label: 'Academic terms', icon: 'calendar' },
        { href: '/admin/users', label: 'Faculty & students', icon: 'users' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { href: '/admin/offerings', label: 'Course offerings', icon: 'cap' },
        { href: '/admin/enrollments', label: 'Enrollments', icon: 'clipboard' },
      ],
    },
    {
      label: 'Oversight',
      items: [
        { href: '/admin/reports', label: 'Reports', icon: 'chart' },
        { href: '/admin/audit-log', label: 'Grade audit log', icon: 'shield' },
      ],
    },
  ],
  faculty: [
    {
      label: 'Overview',
      items: [{ href: '/faculty/dashboard', label: 'Dashboard', icon: 'grid' }],
    },
    {
      label: 'Teaching',
      items: [
        { href: '/faculty/offerings', label: 'My offerings', icon: 'book' },
        { href: '/faculty/sessions', label: 'Class sessions', icon: 'calendar' },
        { href: '/faculty/attendance', label: 'Attendance', icon: 'clipboard' },
      ],
    },
    {
      label: 'Assessment',
      items: [
        { href: '/faculty/assignments', label: 'Assignments', icon: 'file' },
        { href: '/faculty/submissions', label: 'Submissions', icon: 'clock' },
        { href: '/faculty/gradebook', label: 'Gradebook', icon: 'chart' },
      ],
    },
    {
      label: 'Account',
      items: [{ href: '/faculty/profile', label: 'Profile', icon: 'user' }],
    },
  ],
  student: [
    {
      label: 'My semester',
      items: [
        { href: '/student/dashboard', label: 'Dashboard', icon: 'grid' },
        { href: '/student/courses', label: 'My courses', icon: 'book' },
        { href: '/student/schedule', label: 'Class schedule', icon: 'calendar' },
      ],
    },
    {
      label: 'Coursework',
      items: [
        { href: '/student/assignments', label: 'Assignments', icon: 'file' },
        { href: '/student/attendance', label: 'Attendance', icon: 'clipboard' },
        { href: '/student/grades', label: 'Grades', icon: 'chart' },
      ],
    },
    {
      label: 'Account',
      items: [{ href: '/student/profile', label: 'Profile', icon: 'user' }],
    },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  faculty: 'Faculty',
  student: 'Student',
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
        active
          ? 'bg-ink text-paper'
          : 'text-muted hover:bg-surface hover:text-ink',
      )}
    >
      <Icon
        size={16}
        className={cn('shrink-0', active ? 'text-accent-yellow' : 'text-line-strong group-hover:text-ink')}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavBody({
  role,
  pathname,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4" aria-label="Primary">
      {NAV[role].map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AccountCard({
  viewer,
  className,
}: {
  viewer: { fullName: string; email: string; role: Role };
  className?: string;
}) {
  return (
    <div className={cn('border-t border-line p-3', className)}>
      <div className="flex items-center gap-2.5 rounded-md bg-surface px-2.5 py-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-paper">
          {viewer.fullName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-ink">{viewer.fullName}</p>
          <p className="truncate text-[10px] text-muted">{ROLE_LABEL[viewer.role]}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-paper hover:text-danger"
          >
            <LogoutIcon size={15} />
          </button>
        </form>
      </div>
      <p className="mt-2 truncate px-1 text-[10px] text-muted/80">{viewer.email}</p>
    </div>
  );
}

export function AppShell({
  viewer,
  children,
}: {
  viewer: { fullName: string; email: string; role: Role };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const currentItem = NAV[viewer.role]
    .flatMap((group) => group.items)
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[262px] shrink-0 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex h-16 items-center border-b border-line px-4">
          <Brand />
        </div>
        <div className="px-3 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-orange" aria-hidden />
            {ROLE_LABEL[viewer.role]} workspace
          </span>
        </div>
        <NavBody role={viewer.role} pathname={pathname} />
        <AccountCard viewer={viewer} />
        <div className="accent-rule" aria-hidden />
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink hover:bg-surface"
            aria-label="Open navigation"
            aria-expanded={open}
          >
            <MenuIcon size={17} />
          </button>
          <Brand compact />
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[10px] font-semibold text-paper">
            {viewer.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('')}
          </span>
        </header>

        <div className="hidden items-center justify-between border-b border-line px-8 py-2.5 lg:flex">
          <p className="text-xs text-muted">
            {ROLE_LABEL[viewer.role]} <span className="mx-1.5 text-line-strong">/</span>
            <span className="font-medium text-ink">{currentItem?.label ?? 'Workspace'}</span>
          </p>
          <p className="text-[11px] text-muted">
            Signed in as <span className="font-medium text-ink">{viewer.fullName}</span>
          </p>
        </div>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>

        <footer className="mt-auto border-t border-line px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-2">
              <BrandMark className="h-4 w-4 rounded-[4px]" />
              AcadFlow · Academic operations
            </span>
            <span>Times shown in your institution’s timezone.</span>
          </div>
        </footer>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-[290px] max-w-[86vw] flex-col border-r border-line bg-paper shadow-[8px_0_32px_rgba(17,17,17,0.12)]">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"
                aria-label="Close navigation"
              >
                <CloseIcon size={17} />
              </button>
            </div>
            <div className="px-3 pt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-orange" aria-hidden />
                {ROLE_LABEL[viewer.role]} workspace
              </span>
            </div>
            <NavBody role={viewer.role} pathname={pathname} onNavigate={() => setOpen(false)} />
            <AccountCard viewer={viewer} />
            <div className="accent-rule" aria-hidden />
          </div>
        </div>
      ) : null}
    </div>
  );
}
