import 'server-only';

type Bucket = { failures: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

/**
 * Single-process login limiter (§8.7). Multi-instance deployments need a shared
 * store; that limitation is documented in README.
 */
const buckets = new Map<string, Bucket>();

export function loginRateKey(email: string, ip: string): string {
  return `${email.toLowerCase()}::${ip}`;
}

export function isRateLimited(key: string, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return false;
  if (bucket.resetAt <= now) {
    buckets.delete(key);
    return false;
  }
  return bucket.failures >= MAX_FAILURES;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { failures: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.failures += 1;
}

export function clearLoginFailures(key: string): void {
  buckets.delete(key);
}

export function resetRateLimiterForTests(): void {
  buckets.clear();
}
