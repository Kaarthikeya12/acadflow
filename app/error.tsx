'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest in the console; internal details never reach the UI.
    console.error('AcadFlow error boundary:', error.digest ?? error.message);
  }, [error]);

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md">
        <p className="eyebrow">Something interrupted the request</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em]">
          That screen couldn’t load
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The database or server returned an unexpected response. Nothing was saved. You can
          retry, or return to your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-[#2a2a2a]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-line-strong px-4 text-sm font-medium hover:border-ink"
          >
            Back to home
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-6 font-mono text-[10px] text-muted">Reference {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
