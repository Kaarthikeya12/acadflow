import Link from 'next/link';
import { cn } from './ui';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-ink',
        className,
      )}
      aria-hidden
    >
      <span className="absolute -left-1 top-[9px] h-[3px] w-10 rotate-[-24deg] bg-accent-yellow" />
      <span className="absolute -left-1 top-[15px] h-[3px] w-10 rotate-[-24deg] bg-accent-orange" />
      <span className="absolute -left-1 top-[21px] h-[3px] w-10 rotate-[-24deg] bg-accent-red" />
    </span>
  );
}

export function Brand({
  href = '/',
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn('group inline-flex items-center gap-2.5 text-ink', className)}
      aria-label="AcadFlow home"
    >
      <BrandMark />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.05rem] font-semibold tracking-[-0.045em]">
            AcadFlow
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            Academic operations
          </span>
        </span>
      ) : null}
    </Link>
  );
}
