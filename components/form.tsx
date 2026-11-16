'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionResult } from '@/types/contracts';
import {
  Alert,
  buttonClasses,
  cn,
  inputClasses,
  selectClasses,
  textareaClasses,
} from './ui';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | string[];
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error.join(' ') : error;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-1 text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {hint && !message ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
      {message ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(inputClasses, className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(textareaClasses, className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn(selectClasses, className)}>
      {children}
    </select>
  );
}

export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  variant = 'primary',
  size = 'md',
  className,
  confirm,
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  confirm?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
      className={buttonClasses(variant, size, className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({
  state,
  success = 'Saved.',
}: {
  state: ActionResult<unknown> | null;
  success?: string;
}) {
  if (!state) return null;
  if (state.ok) {
    return (
      <Alert tone="success" className="animate-none">
        {success}
      </Alert>
    );
  }
  return (
    <Alert tone="danger" title="That didn’t work">
      <p>{state.error.message}</p>
      <p className="mt-1 font-mono text-[10px] text-danger/70">Ref {state.error.requestId}</p>
    </Alert>
  );
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  tone = 'secondary',
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: 'secondary' | 'ghost';
}) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary
        className={cn(
          'inline-flex select-none items-center gap-1.5 rounded-md font-medium transition-colors',
          tone === 'secondary'
            ? 'h-9 border border-line-strong bg-paper px-3 text-xs text-ink hover:border-ink'
            : 'h-8 px-2 text-xs text-muted hover:bg-surface hover:text-ink',
        )}
      >
        <span
          className="disclosure-chevron inline-block text-[13px] leading-none transition-transform"
          aria-hidden
        >
          +
        </span>
        {summary}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
