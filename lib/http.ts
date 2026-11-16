import 'server-only';
import { NextResponse } from 'next/server';
import type { ActionErrorCode } from '@/types/contracts';
import { AppError, DEFAULT_ERROR_MESSAGES, ERROR_HTTP_STATUS, mapPgError } from '@/lib/db/errors';
import { logServerError, newRequestId } from '@/lib/log';

export function jsonError(error: unknown, requestId: string = newRequestId()): NextResponse {
  const appError =
    error instanceof AppError ? error : error instanceof Response ? null : mapPgError(error, requestId);

  if (!appError) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: DEFAULT_ERROR_MESSAGES.BAD_REQUEST, requestId } },
      { status: 400 },
    );
  }

  if (appError.code === 'INTERNAL') {
    logServerError(requestId, 'Route handler failure', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        fieldErrors: appError.fieldErrors,
        requestId,
      },
    },
    { status: ERROR_HTTP_STATUS[appError.code] },
  );
}

export function jsonData<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function statusForCode(code: ActionErrorCode): number {
  return ERROR_HTTP_STATUS[code];
}
