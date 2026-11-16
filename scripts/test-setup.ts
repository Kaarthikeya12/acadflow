import { Client } from 'pg';
import { applyMigrations } from './lib/migrate-core';
import { assertDestructiveDatabaseAccess } from './lib/db-guards';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  console.error('TEST_DATABASE_URL must be set for `npm run test:db`.');
  process.exit(1);
}

if (connectionString === process.env.DATABASE_URL) {
  console.error('TEST_DATABASE_URL must be a different database from DATABASE_URL.');
  process.exit(1);
}

try {
  assertDestructiveDatabaseAccess(connectionString, 'db:test:setup');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }

  const results = await applyMigrations(connectionString);
  console.log(`Test database reset: ${results.length} migrations applied from empty.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
