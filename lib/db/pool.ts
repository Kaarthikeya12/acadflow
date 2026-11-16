import 'server-only';
import { Pool, type QueryResultRow } from 'pg';

type PoolGlobal = typeof globalThis & { __acadflowPool?: Pool };

export function getPool(): Pool {
  const globalForPool = globalThis as PoolGlobal;
  if (!globalForPool.__acadflowPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured. See .env.example.');
    }
    globalForPool.__acadflowPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      allowExitOnIdle: false,
      application_name: 'acadflow',
    });
  }
  return globalForPool.__acadflowPool;
}

/** Parameterized read query. Never build SQL with string interpolation. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

export async function closePool(): Promise<void> {
  const globalForPool = globalThis as PoolGlobal;
  if (globalForPool.__acadflowPool) {
    await globalForPool.__acadflowPool.end();
    delete globalForPool.__acadflowPool;
  }
}
