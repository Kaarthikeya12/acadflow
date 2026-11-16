-- Migration bookkeeping. Created idempotently so the runner can also bootstrap it.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now(),
  checksum   text NOT NULL
);
