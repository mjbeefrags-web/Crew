-- Runs once on a fresh PostgreSQL volume (docker-entrypoint-initdb.d).
-- Extensions used by the application and operational tooling.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Keep the database deterministic regardless of the image default.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
  EXECUTE format(
    'ALTER DATABASE %I SET log_min_duration_statement = %L',
    current_database(),
    '250'
  );
END
$$;
