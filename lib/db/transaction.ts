import 'server-only';
import type { PoolClient } from 'pg';
import { AppError, isRetryablePgError, mapPgError } from './errors';
import { getPool } from './pool';

export type TxContext = {
  actorUserId: string;
  requestId: string;
  /** Optional audited reason for a marks change. Never authored by the client directly. */
  changeReason?: string;
};

export type TransactionOptions = {
  isolation?: 'read committed' | 'repeatable read' | 'serializable';
  /** Only for seeding historical timestamps. Application code never sets this. */
  importMode?: boolean;
};

async function beginAndSetContext(
  client: PoolClient,
  ctx: TxContext,
  options: TransactionOptions,
): Promise<void> {
  const isolation = options.isolation ?? 'read committed';
  await client.query(`BEGIN ISOLATION LEVEL ${isolation.toUpperCase()}`);
  await client.query(
    `SELECT set_config('app.actor_user_id', $1, true),
            set_config('app.request_id', $2, true),
            set_config('app.change_reason', $3, true),
            set_config('app.import_mode', $4, true)`,
    [ctx.actorUserId, ctx.requestId, ctx.changeReason ?? '', options.importMode ? 'on' : ''],
  );
}

/**
 * The only supported way to run a multi-statement mutation (§13.2).
 * Sets the transaction-local actor so the audit trigger can attribute a change.
 */
export async function withTransaction<T>(
  ctx: TxContext,
  fn: (client: PoolClient) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  if (!ctx.actorUserId) {
    throw new AppError('INTERNAL', 'Actor context is required for a database mutation.');
  }

  let attempt = 0;
  // One retry for serialization/deadlock failures with short jitter (§13.4).
  for (;;) {
    const client = await getPool().connect();
    try {
      await beginAndSetContext(client, ctx, options);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* the transaction is already aborted */
      }
      if (attempt === 0 && isRetryablePgError(error)) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 50));
        continue;
      }
      throw mapPgError(error, ctx.requestId);
    } finally {
      client.release();
    }
  }
}

/** Uses a transaction-scoped advisory lock, e.g. for "one current term". */
export async function withAdvisoryLock<T>(
  client: PoolClient,
  lockKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
  return fn();
}
