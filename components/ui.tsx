import Link from 'next/link';
import type { ReactNode } from 'react';

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-paper border border-ink hover:bg-[#2a2a2a] active:bg-black disabled:hover:bg-ink',
  secondary:
    'bg-paper text-ink border border-line-strong hover:border-ink hover:bg-surface disabled:hover:bg-paper',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-surface',
  danger:
    'bg-paper text-danger border border-danger/40 hover:border-danger hover:bg-danger/[0.06]',
  accent:
    'bg-accent-yellow text-ink border border-[#e6b320] hover:bg-[#ffd34f] active:bg-[#f2bd1e]',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex select-none items-center justify-center rounded-md font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed disabled:opacity-55',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  target?: string;
  rel?: string;
  prefetch?: boolean;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export const inputClasses =
  'h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-line-strong focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:bg-surface aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10';

export const textareaClasses =
  'min-h-28 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-line-strong focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:bg-surface aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10';

export const selectClasses =
  'h-10 w-full appearance-none rounded-md border border-line bg-paper bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%20stroke%3D%27%236b6b6b%27%20stroke-width%3D%271.5%27%3E%3Cpath%20d%3D%27M6%208l4%204%204-4%27/%3E%3C/svg%3E")] bg-[length:18px_18px] bg-[right_0.65rem_center] bg-no-repeat px-3 pr-9 text-sm text-ink transition-colors hover:border-line-strong focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:bg-surface';

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag className={cn('rounded-lg border border-line bg-paper', className)}>{children}</Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[0.95rem] font-semibold tracking-[-0.01em]">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[1.75rem]">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold tracking-[-0.015em]">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em] tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group rounded-lg border border-line bg-paper p-5 transition-colors hover:border-ink"
      >
        {body}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted group-hover:text-ink">
          View <span aria-hidden>→</span>
        </span>
      </Link>
    );
  }

  return <div className="rounded-lg border border-line bg-paper p-5">{body}</div>;
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'ink';

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-surface text-muted',
  success: 'border-success/25 bg-success/[0.07] text-success',
  warning: 'border-warning/25 bg-warning/[0.07] text-warning',
  danger: 'border-danger/25 bg-danger/[0.06] text-danger',
  info: 'border-info/25 bg-info/[0.06] text-info',
  accent: 'border-[#e6b320]/40 bg-accent-yellow/20 text-[#7a5600]',
  ink: 'border-ink bg-ink text-paper',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  active: 'success',
  published: 'success',
  present: 'success',
  completed: 'info',
  released: 'success',
  graded: 'info',
  scheduled: 'info',
  draft: 'neutral',
  pending: 'warning',
  upcoming: 'warning',
  late: 'warning',
  excused: 'info',
  absent: 'danger',
  dropped: 'danger',
  closed: 'neutral',
  archived: 'neutral',
  cancelled: 'danger',
  inactive: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status.toLowerCase()] ?? 'neutral';
  const label = status.charAt(0).toUpperCase() + status.slice(1).replaceAll('_', ' ');
  return <Badge tone={tone}>{label}</Badge>;
}

export function Alert({
  tone = 'neutral',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-md border px-4 py-3 text-sm', TONES[tone], className)}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn('leading-relaxed', title && 'mt-1')}>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
      )}
    >
      <div className="mb-3 flex items-center gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-accent-yellow" />
        <span className="h-1.5 w-6 rounded-full bg-line-strong" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent-orange" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function TableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-line bg-paper', className)}>
      <table className="w-full min-w-[42rem] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = 'left',
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-line bg-surface px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = 'left',
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-b border-line/70 px-4 py-3 align-middle last:border-b-0',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  searchParams = {},
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-3 text-xs text-muted">
        {total} {total === 1 ? 'record' : 'records'}
      </p>
    );
  }

  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== '' && key !== 'page') params.set(key, value);
    }
    params.set('page', String(target));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-xs text-muted">
        Page {page} of {totalPages} · {total} records
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <ButtonLink href={pageHref(page - 1)} variant="secondary" size="sm">
            ← Previous
          </ButtonLink>
        ) : (
          <span className={buttonClasses('secondary', 'sm', 'pointer-events-none opacity-40')}>
            ← Previous
          </span>
        )}
        {page < totalPages ? (
          <ButtonLink href={pageHref(page + 1)} variant="secondary" size="sm">
            Next →
          </ButtonLink>
        ) : (
          <span className={buttonClasses('secondary', 'sm', 'pointer-events-none opacity-40')}>
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}

export function Tabs({
  tabs,
}: {
  tabs: Array<{ href: string; label: string; active: boolean; count?: number }>;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line pb-px" aria-label="Sections">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={cn(
            'relative whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            tab.active
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:border-line-strong hover:text-ink',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' ? (
            <span className="ml-1.5 rounded-full bg-surface-strong px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function KeyValue({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded bg-line/70', className)}
    />
  );
}

export function DotTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-orange" aria-hidden />
      {children}
    </span>
  );
}
