import { applyMigrations } from './lib/migrate-core';

const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('MIGRATION_DATABASE_URL (or DATABASE_URL) must be set.');
  process.exit(1);
}

try {
  const results = await applyMigrations(connectionString);
  const newlyApplied = results.filter((result) => result.applied);
  for (const result of results) {
    console.log(`${result.applied ? 'applied ' : 'skipped '} ${result.version}`);
  }
  console.log(
    `\nMigrations complete: ${newlyApplied.length} applied, ${results.length - newlyApplied.length} already current.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
