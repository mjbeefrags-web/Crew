# Local live data mirror (Neon → this laptop)

Keeps a local PostgreSQL database (`crewww_live`) refreshed from the deployed
Neon database, so the storefront/API running on this laptop can display the
live catalog and orders without a live connection to Railway.

## What is installed

- `scripts/sync-from-neon.ps1` — dump/verify/restore worker.
- `npm run sync:db` — convenience wrapper for one manual refresh.
- Windows Scheduled Task `Crewww Neon to Local Sync` — at logon, then every
  15 minutes while a network connection is available.
- `%LOCALAPPDATA%\crewww\neon-direct.url` — the Neon **direct/unpooled** URL,
  encrypted with Windows DPAPI for the current user. No secret is in the repo.

## One-time setup

1. Sign in with the Neon CLI. It prints an Auth URL to **stderr** and waits
   for you to finish the sign-in in Chrome:

   ```powershell
   $env:NODE_OPTIONS = "--dns-result-order=ipv4first"  # avoids IPv6-only failures
   npx --yes neon@latest login 2>&1
   ```

   If the CLI says "Could not reach the Neon API", re-run with the
   `NODE_OPTIONS` line above. For a linked project, `npx neon@latest deploy`
   also writes both `DATABASE_URL` values into `.env` (see `README.md`).

2. Get the **direct** connection string (never the pooled one) for the
   deployed branch. Example for this project:

   ```powershell
   $env:NODE_OPTIONS = "--dns-result-order=ipv4first"
   npx --yes neon@latest connection-string production `
     --project-id winter-lake-47657148 --ssl require
   ```

3. Encrypt the **direct** URL into the credential file. The value is never
   echoed or stored in plain text:

   ```powershell
   $dir = "$env:LOCALAPPDATA\crewww"
   New-Item -ItemType Directory -Force $dir | Out-Null
   Read-Host -AsSecureString "Paste Neon DIRECT URL" |
     ConvertFrom-SecureString | Set-Content "$dir\neon-direct.url"
   ```

4. Create the local target database with the installed PostgreSQL 18 tools:

   ```powershell
   $pg = "C:\Program Files\PostgreSQL\18\bin"
   & "$pg\psql.exe" "postgresql://postgres:LOCAL_POSTGRES_PASSWORD@127.0.0.1:5432/postgres" `
     -c "CREATE USER crewww WITH PASSWORD 'LOCAL_PASSWORD';" `
     -c "CREATE DATABASE crewww_live OWNER crewww;"
   ```

   Skip the `CREATE USER` line if the `crewww` role already exists.

5. Point the local (non-Docker) backend at the mirror. Put the URL in
   `backend/.env`, **not** the root `.env`:

   ```dotenv
   DATABASE_URL=postgresql+asyncpg://crewww:LOCAL_PASSWORD@127.0.0.1:5432/crewww_live
   ```

   Docker Compose interpolates the root `.env`; a host-only `DATABASE_URL`
   there overrides the Compose `db:5432` default and makes `migrate` fail when
   the host Postgres is stopped. `backend/.env` is read only by the backend
   and by `scripts/sync-from-neon.ps1`, so Compose keeps its own database.
   Use `127.0.0.1`, not `host.docker.internal` — that hostname is only for
   containers. See `postgres-docker.md` → "Using your installed PostgreSQL
   instead".

6. Run one refresh by hand and check the result:

   ```powershell
   npm run sync:db
   Get-Content logs\sync-neon.log -Tail 20
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
     "postgresql://crewww:LOCAL_PASSWORD@127.0.0.1:5432/crewww_live" `
     -c "select count(*) from products;"
   ```

## Opening the mirror in a PostgreSQL desktop app

pgAdmin 4 is installed and a server named **Crewww Live Mirror (Neon)** is
already registered in it. On first connect, enter the password below and tick
**Save Password**; pgAdmin cannot import passwords, so it asks once.

Use the same details in DBeaver or another PostgreSQL client:

| Field | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `5432` |
| Database | `crewww_live` |
| User | `crewww` |
| Password | `local-only-change-me-123456` (also in `backend/.env` `DATABASE_URL`) |
| SSL | disabled |

The installed server listens on all interfaces by default. To keep the mirror
private to this laptop, set `listen_addresses = 'localhost'` in
`C:\Program Files\PostgreSQL\18\data\postgresql.conf` and restart the
`postgresql-x64-18` service. `127.0.0.1` still works for every local tool.

## Task Scheduler registration

The task is registered with this command (run from the repository root):

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `'C:\Users\mjbee\Desktop\projects\game arena\scripts\sync-from-neon.ps1`'"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 15) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20) `
  -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 10) `
  -RunOnlyIfNetworkAvailable
Register-ScheduledTask -TaskName "Crewww Neon to Local Sync" `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description "Refresh local crewww_live from deployed Neon every 15 minutes" -Force
```

Check it with `Get-ScheduledTask -TaskName "Crewww Neon to Local Sync" | Get-ScheduledTaskInfo`.
A `LastRunResult` of `0x0` means success.

## Behavior and limits

- Dumps use the **direct** Neon URL; the pooled endpoint is not used for dumps.
- The deployed Neon server can run a newer PostgreSQL minor than the local
  server (Neon 18.7 vs local 18.3 at setup). The dump may contain the internal
  `pg_attver` column setting, which older minors reject; the sync strips that
  marker before piping the SQL to `psql`. Data and schema are unaffected.
  Installing the current PostgreSQL 18 minor locally also removes the need.
- The restore runs through `psql --single-transaction`, so the local database
  swaps atomically. If the local API is holding a connection, the restore may
  wait for it to release locks; stop the local app if a refresh ever stalls.
- This is a snapshot every 15 minutes, not real-time replication. If Wi-Fi is
  down, the script logs one line and exits successfully; the next tick retries.
- The last 7 verified dumps are kept in `backups\neon\` and the run log is
  `logs\sync-neon.log`. A failed restore leaves the previous dump on disk.
- The deployed database may contain customer data. The mirror lives on this
  laptop: keep disk encryption on and do not expose PostgreSQL beyond
  `localhost`.
