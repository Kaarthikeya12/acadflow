const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return LOCAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function assertDestructiveDatabaseAccess(url: string, label: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${label} refuses to run with NODE_ENV=production.`);
  }
  if (!isLocalDatabaseUrl(url) && process.env.ALLOW_REMOTE_DB_RESET !== 'true') {
    throw new Error(
      `${label} refuses to run against a non-local database (${new URL(url).hostname}). ` +
        'Set ALLOW_REMOTE_DB_RESET=true only if this is intentional.',
    );
  }
}
