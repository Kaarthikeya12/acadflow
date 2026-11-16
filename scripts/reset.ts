import { Pool } from 'pg';
import { closePool } from '@/lib/db/pool';
import { formatSeedCounts, runSeed } from '../db/seeds/seed';
import { assertDestructiveDatabaseAccess } from './lib/db-guards';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL must be set.');
  process.exit(1);
}

try {
  assertDestructiveDatabaseAccess(connectionString, 'db:reset');

  const pool = new Pool({ connectionString });
  try {
    await pool.query(
      `TRUNCATE TABLE
         grade_change_log,
         final_grade,
         grade_policy,
         submission,
         stored_file,
         assignment,
         attendance,
         class_session,
         enrollment,
         course_offering,
         academic_term,
         course,
         student_profile,
         faculty_profile,
         department,
         app_user,
         app_setting
       RESTART IDENTITY CASCADE`,
    );
    console.log('Truncated application tables.');
  } finally {
    await pool.end();
  }

  const result = await runSeed();
  if (result.skipped) {
    console.log('Seed skipped.');
  } else {
    console.log(
      result.counts
        ? `Reset complete: ${formatSeedCounts(result.counts)}.`
        : 'Reset complete.',
    );
    console.log('Demo password for every seeded account: AcadFlow#2026');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closePool();
}
