-- Role separation and least-privilege grants.
-- Production: run migrations as acadflow_owner; the app connects as acadflow_app.
-- Local development may run everything as a superuser (§4.10 allows this when the
-- README documents the split). Roles are created NOLOGIN; a DBA enables LOGIN and
-- sets a password (see README). Migrations never contain passwords.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acadflow_owner') THEN
    BEGIN
      CREATE ROLE acadflow_owner NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping acadflow_owner creation: insufficient privilege';
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acadflow_app') THEN
    BEGIN
      CREATE ROLE acadflow_app NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping acadflow_app creation: insufficient privilege';
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acadflow_test') THEN
    BEGIN
      CREATE ROLE acadflow_test NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping acadflow_test creation: insufficient privilege';
    END;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acadflow_owner') THEN
    GRANT USAGE, CREATE ON SCHEMA public TO acadflow_owner;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acadflow_app') THEN
    GRANT USAGE ON SCHEMA public TO acadflow_app;

    -- Read/write application tables, but never hard-delete academic history.
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO acadflow_app;
    REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM acadflow_app;

    -- Audit log: read-only for the application. The SECURITY DEFINER trigger owns
    -- insertion. Migration bookkeeping is not visible to the app.
    REVOKE ALL ON grade_change_log FROM acadflow_app;
    GRANT SELECT ON grade_change_log TO acadflow_app;
    REVOKE ALL ON schema_migrations FROM acadflow_app;

    -- Only the identity sequence used by an app-inserted table would need usage;
    -- grade_change_log is trigger-only, so granting usage is unnecessary.
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO acadflow_app;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acadflow_test') THEN
    GRANT USAGE ON SCHEMA public TO acadflow_test;
    GRANT SELECT, INSERT, UPDATE, TRUNCATE ON ALL TABLES IN SCHEMA public TO acadflow_test;
    REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM acadflow_test;
    REVOKE ALL ON grade_change_log FROM acadflow_test;
    GRANT SELECT ON grade_change_log TO acadflow_test;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO acadflow_test;
  END IF;
END;
$$;

-- Future objects created by the migrating role inherit the same application grants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acadflow_app') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE ON TABLES TO acadflow_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT EXECUTE ON FUNCTIONS TO acadflow_app;
  END IF;
END;
$$;
