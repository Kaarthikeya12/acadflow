import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { logServerError, newRequestId } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const requestId = newRequestId();
  try {
    await query('SELECT 1 AS ok');
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    logServerError(requestId, 'Health check failed', {
      cause: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
