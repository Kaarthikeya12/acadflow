import 'server-only';
import { AppError } from '@/lib/db/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for custom route handlers (§8.7). Server Actions enforce
 * same-origin themselves; this covers POST /api/submissions.
 */
export function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const baseUrl = process.env.APP_BASE_URL;

  if (site && site !== 'same-origin' && site !== 'none') {
    throw new AppError('FORBIDDEN', 'Cross-site requests are not allowed.');
  }

  if (!origin) return; // Non-browser client without Origin; authorization still applies.

  let expectedOrigin: string | null = null;
  try {
    expectedOrigin = baseUrl ? new URL(baseUrl).origin : new URL(request.url).origin;
  } catch {
    expectedOrigin = null;
  }

  if (!expectedOrigin || origin !== expectedOrigin) {
    throw new AppError('FORBIDDEN', 'Cross-site requests are not allowed.');
  }
}

export function contentLengthOf(request: Request): number | null {
  const header = request.headers.get('content-length');
  if (!header) return null;
  const parsed = Number.parseInt(header, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
