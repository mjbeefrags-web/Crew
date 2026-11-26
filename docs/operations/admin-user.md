# Admin accounts

## Fresh clone

`.env.example` contains a local-only bootstrap administrator:

| Field | Value |
|---|---|
| Email | `admin@crewww.example.com` |
| Password | `CrewwwOwner!2026` |

Copy `.env.example` to `.env` and start the stack. The one-shot `migrate`
service creates the account in PostgreSQL:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Sign in at `http://localhost:8080/login`, then open `/admin`.

## Existing volume

The seed only creates the bootstrap account when it does not already exist. If
you already have a PostgreSQL volume from an earlier setup, run the migration
service once after pulling:

```powershell
docker compose run --rm migrate
```

If an older administrator is already in that volume, it remains valid. Reset or
create an account explicitly with:

```powershell
docker compose exec api python -m app.create_admin `
  --email owner@crewww.example.com --password "your-password"
```

Use `--force` to reset an existing account's password and role.

## Shared environments

- Change `BOOTSTRAP_ADMIN_PASSWORD` before sharing the stack.
- Staging and production reject a non-empty bootstrap password; create the
  account with `python -m app.create_admin` instead.
- Remove `BOOTSTRAP_ADMIN_*` from the environment once the account exists.
- The API enforces the `admin` role; the frontend gate is only a convenience.
