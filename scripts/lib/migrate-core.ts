import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

export type MigrationResult = {
  version: string;
  applied: boolean;
};

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function applyMigrations(connectionString: string): Promise<MigrationResult[]> {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const client = new Client({ connectionString });
  await client.connect();
  const results: MigrationResult[] = [];

  try {
    // Bootstrap the bookkeeping table so 0001 can be recorded like any migration.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now(),
        checksum   text NOT NULL
      )
    `);

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = sha256(sql);

      const existing = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE version = $1',
        [version],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        const recorded = existing.rows[0]?.checksum;
        if (recorded !== checksum) {
          throw new Error(
            `Migration ${version} has changed after being applied ` +
              `(recorded ${recorded}, found ${checksum}). Migrations are forward-only.`,
          );
        }
        results.push({ version, applied: false });
        continue;
      }

      const noTransaction = sql.startsWith('-- migrate:no-transaction');
      if (!noTransaction) await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [version, checksum],
        );
        if (!noTransaction) await client.query('COMMIT');
        results.push({ version, applied: true });
      } catch (error) {
        if (!noTransaction) {
          try {
            await client.query('ROLLBACK');
          } catch {
            /* connection already aborted; the original error is what matters */
          }
        }
        throw new Error(
          `Migration ${version} failed: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
  } finally {
    await client.end();
  }

  return results;
}
