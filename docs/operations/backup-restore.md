# Backups and disaster recovery

## Policy

| Setting | Value | Why |
|---|---|---|
| Target RPO | **24 hours** | One verified dump per night plus the weekly/monthly copies. |
| Target RTO | **4 hours** | Restore to a fresh volume, migrate, smoke test. |
| Daily retention | 7 files | Covers a week of mistakes and bad deploys. |
| Weekly retention | 4 files | Four weeks of history. |
| Monthly retention | 2 files | Two months of audit history. |
| Storage | `./backups/` on the host, **not** inside the Compose network | Survives container/volume loss. Copy off-host for true DR. |

Backups are produced with `pg_dump --format=custom`, which is compressed,
portable across minor PostgreSQL versions, and can be inspected with
`pg_restore --list`. Every run verifies the archive can be read before it is
counted as successful.

## Running a backup

```bash
# Linux/macOS host
./scripts/backup-postgres.sh ./backups

# Windows host
./scripts/backup-postgres.ps1 -OutputDir .\backups
```

The scripts read `POSTGRES_DB` and `POSTGRES_USER` (defaults `crewww`) and
choose the `db` Compose service.

### Schedule (Linux, cron)

```cron
# Nightly at 02:15, log to syslog
15 2 * * * cd /srv/crewww && ./scripts/backup-postgres.sh ./backups >> /var/log/crewww-backup.log 2>&1
```

### Schedule (Windows, Task Scheduler)

```powershell
$action = New-ScheduledTaskAction -Execute "pwsh" `
  -Argument "-NoProfile -File D:\Projects\LocalBrand\scripts\backup-postgres.ps1 -OutputDir D:\backups\crewww"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:15am
Register-ScheduledTask -TaskName "Crewww PostgreSQL backup" -Action $action -Trigger $trigger -RunLevel Highest
```

## Restore drill

Run this on staging at least once per quarter. A backup that has never been
restored is a hypothesis, not a backup.

```bash
# 1. Stop writers
docker compose stop api web

# 2. Restore (the script asks for confirmation)
./scripts/restore-postgres.sh ./backups/daily/crewww_YYYYMMDD_HHMMSS.dump

# 3. Re-apply migrations and verify
docker compose run --rm migrate
curl -fsS http://127.0.0.1:8080/api/ready

# 4. Check row counts and a known product
docker compose exec db psql -U crewww -d crewww -c \
  "select count(*) from products; select slug, name from products order by created_at limit 3;"

# 5. Bring the site back
docker compose up -d
```

Record the drill date, dump name, restore duration, and any follow-up work in
the release notes.

## Off-host copy

A host-level backup does not survive losing the host. Sync the backup directory
to object storage or another machine:

```bash
# Example: nightly rclone sync to S3-compatible storage
rclone sync ./backups remote:crewww-backups --checksum
```

Store credentials outside the repository. At minimum, keep one monthly copy
off-host.

## Failure playbook

| Symptom | Action |
|---|---|
| `pg_dump` fails with auth error | Check `POSTGRES_USER`/`POSTGRES_PASSWORD` in the active env file and that the `db` container is healthy (`docker compose ps`). |
| Dump is under 1 KB | Treat as failed; check disk space and container logs. The scripts already refuse empty files. |
| Restore fails halfway | `--single-transaction` rolls back; fix the cause and retry. Do not run the API against a partially restored database. |
| Need point-in-time recovery | WAL archiving is **not** configured. Enable `archive_mode` + `archive_command` and `pg_basebackup` before relying on PITR. Until then, RPO is the nightly dump. |
