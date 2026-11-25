#!/usr/bin/env bash
# Back up the Crewww PostgreSQL database from the running Compose stack.
# Usage: ./scripts/backup-postgres.sh [output-dir]
# Policy: 7 daily (configurable), 4 weekly, 2 monthly.
set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
SERVICE="${DB_SERVICE:-db}"
DATABASE="${POSTGRES_DB:-crewww}"
DB_USER="${POSTGRES_USER:-crewww}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${KEEP_MONTHLY:-2}"

DAILY="$OUTPUT_DIR/daily"
WEEKLY="$OUTPUT_DIR/weekly"
MONTHLY="$OUTPUT_DIR/monthly"
mkdir -p "$DAILY" "$WEEKLY" "$MONTHLY"

STAMP="$(date +%Y%m%d_%H%M%S)"
NAME="crewww_${STAMP}.dump"
PATH_FILE="$DAILY/$NAME"

echo "Dumping $DATABASE from service '$SERVICE' -> $PATH_FILE"
docker compose exec -T "$SERVICE" pg_dump -U "$DB_USER" -d "$DATABASE" \
  --format=custom --compress=9 > "$PATH_FILE"

if [ ! -s "$PATH_FILE" ]; then
  echo "Backup failed or produced an empty file" >&2
  exit 1
fi

# Verify the archive can be read before treating the run as successful.
docker compose exec -T "$SERVICE" pg_restore --list < "$PATH_FILE" > /dev/null
echo "Backup OK: $(du -h "$PATH_FILE" | cut -f1)"

if [ "$(date +%u)" = "7" ]; then cp "$PATH_FILE" "$WEEKLY/$NAME"; fi
if [ "$(date +%d)" = "01" ]; then cp "$PATH_FILE" "$MONTHLY/$NAME"; fi

prune() {
  local folder="$1" keep="$2"
  [ "$keep" -gt 0 ] || return 0
  ls -1t "$folder"/*.dump 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
    echo "Pruning $old"
    rm -f "$old"
  done
}

prune "$DAILY" "$KEEP_DAILY"
prune "$WEEKLY" "$KEEP_WEEKLY"
prune "$MONTHLY" "$KEEP_MONTHLY"
