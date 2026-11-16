type LogFields = Record<string, unknown>;

const REDACTED_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'storageKey',
  'storage_key',
  'systemKey',
]);

function sanitize(fields: LogFields): LogFields {
  const output: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    output[key] = REDACTED_KEYS.has(key) ? '[redacted]' : value;
  }
  return output;
}

export function logServerError(
  requestId: string,
  message: string,
  fields: LogFields = {},
): void {
  console.error(
    JSON.stringify({
      level: 'error',
      at: new Date().toISOString(),
      requestId,
      message,
      ...sanitize(fields),
    }),
  );
}

export function logServerInfo(requestId: string, message: string, fields: LogFields = {}): void {
  console.info(
    JSON.stringify({
      level: 'info',
      at: new Date().toISOString(),
      requestId,
      message,
      ...sanitize(fields),
    }),
  );
}

export function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
