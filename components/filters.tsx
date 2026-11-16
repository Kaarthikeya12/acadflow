import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClasses, inputClasses, selectClasses } from './ui';

export function FilterBar({
  action,
  children,
  resetHref,
  className,
}: {
  action: string;
  children: ReactNode;
  resetHref: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      method="get"
      className={
        'flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-3 ' +
        (className ?? '')
      }
    >
      {children}
      <button type="submit" className={buttonClasses('secondary', 'sm')}>
        Apply filters
      </button>
      <Link href={resetHref} className={buttonClasses('ghost', 'sm')}>
        Reset
      </Link>
    </form>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={'flex min-w-0 flex-col gap-1 ' + (className ?? '')}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function SearchFilter({
  defaultValue,
  placeholder = 'Search…',
  id = 'filter-q',
}: {
  defaultValue?: string;
  placeholder?: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      name="q"
      type="search"
      defaultValue={defaultValue ?? ''}
      placeholder={placeholder}
      className={inputClasses + ' h-9 w-52'}
    />
  );
}

export function SelectFilter({
  name,
  id,
  defaultValue,
  children,
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      id={id ?? `filter-${name}`}
      name={name}
      defaultValue={defaultValue ?? ''}
      className={selectClasses + ' h-9 ' + (className ?? 'min-w-[10rem]')}
    >
      {children}
    </select>
  );
}
