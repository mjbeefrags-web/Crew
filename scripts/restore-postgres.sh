#!/usr/bin/env bash
# Restore a Crewww PostgreSQL dump into the running Compose database.
# Usage: ./scripts/restore-postgres.sh backups/daily/crewww_20261125_020000.dump
# WARNING: this replaces data in the target database. Stop the API first:
#   docker compose stop api web
set -euo pipefail

DUMP="${1:?usage: restore-postgres.sh <dump-file>}"
SERVICE="${DB_SERVICE:-db}"
DATABASE="${POSTGRES_DB:-crewww}"
DB_USER="${POSTGRES_USER:-crewww}"

[ -f "$DUMP" ] || { echo "Dump not found: $DUMP" >&2; exit 1; }

echo "Restoring $DUMP into $DATABASE (service '$SERVICE')"
read -r -p "This replaces current data. Type 'restore' to continue: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "Aborted"; exit 1; }

# --clean/--if-exists makes the restore repeatable; --single-transaction keeps
# a failed restore from leaving a half-applied schema.
docker compose exec -T "$SERVICE" pg_restore \
  -U "$DB_USER" -d "$DATABASE" --clean --if-exists --single-transaction \
  < "$DUMP"

echo "Restore complete. Run migrations and a readiness check:"
echo "  docker compose run --rm migrate"
echo "  curl -fsS http://127.0.0.1:8080/api/ready"
