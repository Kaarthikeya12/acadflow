'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui';
import { buttonClasses } from '@/components/ui';

export function SubmissionUploadForm({
  assignmentId,
  maxBytes,
  allowedExtensions,
  canSubmit,
  blockedReason,
  hasSubmission,
}: {
  assignmentId: string;
  maxBytes: number;
  allowedExtensions: string[];
  canSubmit: boolean;
  blockedReason?: string;
  hasSubmission: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const accept = allowedExtensions
    .map((extension) => (extension.startsWith('.') ? extension : `.${extension}`))
    .join(',');

  if (!canSubmit) {
    return (
      <Alert tone="neutral" title="Uploads closed">
        {blockedReason ?? 'This assignment is not accepting submissions right now.'}
      </Alert>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Choose a file to upload.');
      return;
    }
    if (file.size > maxBytes) {
      setError(`That file is too large. The limit is ${Math.floor(maxBytes / 1024)} KB.`);
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: data,
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { submissionId: string; submittedAt: string; isLate: boolean } }
        | { error?: { message?: string; requestId?: string } }
        | null;

      if (!response.ok) {
        const message =
          payload && 'error' in payload && payload.error?.message
            ? payload.error.message
            : 'The upload could not be completed.';
        const requestId =
          payload && 'error' in payload && payload.error?.requestId
            ? ` (ref ${payload.error.requestId})`
            : '';
        setError(`${message}${requestId}`);
        return;
      }

      setSuccess(
        payload && 'data' in payload && payload.data?.isLate
          ? 'File uploaded and marked late.'
          : 'File uploaded. Your submission is now on record.',
      );
      formRef.current?.reset();
      router.refresh();
    } catch {
      setError('The connection dropped before the upload finished. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      {error ? (
        <Alert tone="danger" title="Upload failed">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert tone="success" title="Uploaded">
          {success}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="submission-file" className="text-[13px] font-medium text-ink">
          Submission file
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        </label>
        <input
          id="submission-file"
          name="file"
          type="file"
          required
          accept={accept || undefined}
          className="block w-full cursor-pointer rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-paper hover:border-line-strong focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
        <p className="text-xs leading-relaxed text-muted">
          One file, up to {Math.floor(maxBytes / 1024)} KB.
          {allowedExtensions.length > 0
            ? ` Accepted types: ${allowedExtensions.join(', ')}.`
            : ''}
        </p>
      </div>

      <input type="hidden" name="assignmentId" value={assignmentId} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'sm')}>
          {pending ? 'Uploading…' : hasSubmission ? 'Replace file' : 'Upload submission'}
        </button>
        <p className="text-xs text-muted">
          {hasSubmission
            ? 'Uploading replaces your current file; the previous file is retained in the audit record.'
            : 'Your file is stored privately and is only visible to you and your faculty.'}
        </p>
      </div>
    </form>
  );
}
