import { closePool } from '@/lib/db/pool';
import { formatSeedCounts, runSeed } from '../db/seeds/seed';

try {
  const result = await runSeed();
  if (result.skipped) {
    console.log('Seed skipped: the database already contains users. Use `npm run db:reset` for a clean reseed.');
  } else {
    console.log(
      result.counts ? `Seed complete: ${formatSeedCounts(result.counts)}.` : 'Seed complete.',
    );
    console.log('Demo password for every seeded account: AcadFlow#2026');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closePool();
}
