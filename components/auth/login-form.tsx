'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { ActionResult } from '@/types/contracts';
import { loginAction } from '@/lib/actions/auth';
import { Field, FormMessage, SubmitButton, TextInput } from '@/components/form';
import { Alert } from '@/components/ui';
import { ArrowRightIcon } from '@/components/icons';

export function LoginForm({
  showDemo = false,
  created = false,
}: {
  showDemo?: boolean;
  created?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<ActionResult<unknown> | null, FormData>(
    async (_previous, formData) => loginAction(formData),
    null,
  );

  const error = state && !state.ok ? state.error : null;

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight tracking-[-0.04em]">
        Sign in to AcadFlow
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Use the institution account issued to you. Your role decides which workspace opens.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {created ? (
          <Alert tone="success" title="Account created">
            Your student account is ready. Sign in to continue.
          </Alert>
        ) : null}
        <FormMessage state={state} success="Signed in. Redirecting…" />
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-4" noValidate>
        <Field
          label="Email address"
          htmlFor="email"
          required
          error={error?.fieldErrors?.email}
        >
          <TextInput
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="you@institution.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error?.fieldErrors?.email)}
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" required error={error?.fieldErrors?.password}>
          <div className="relative">
            <TextInput
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error?.fieldErrors?.password)}
              className="pr-16"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted transition-colors hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        <SubmitButton className="mt-1 w-full" size="lg" pendingLabel="Signing in…">
          Sign in <ArrowRightIcon size={16} />
        </SubmitButton>
      </form>

      <div className="mt-5 flex items-start gap-2 rounded-md bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted">
        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-orange" aria-hidden />
        <p>
          New student?{' '}
          <Link href="/signup" className="font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
            Create a student account
          </Link>
          . Faculty and administrator accounts are provisioned by your institution.
        </p>
      </div>

      {showDemo ? (
        <details className="disclosure mt-6 border-t border-line pt-5">
          <summary className="text-xs font-medium text-muted transition-colors hover:text-ink">
            Development demo accounts
          </summary>
          <div className="mt-3 overflow-hidden rounded-md border border-line">
            {[
              ['Administrator', 'admin@acadflow.test'],
              ['Faculty', 'faculty1@acadflow.test'],
              ['Student', 'student1@acadflow.test'],
            ].map(([role, account]) => (
              <div
                key={role}
                className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-xs last:border-b-0"
              >
                <span className="text-muted">{role}</span>
                <code className="font-mono text-[11px] text-ink">{account}</code>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 bg-surface px-3 py-2 text-xs">
              <span className="text-muted">Password</span>
              <code className="font-mono text-[11px] text-ink">AcadFlow#2026</code>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
