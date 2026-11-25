# CI/CD

## Workflows

| Workflow | Trigger | What it proves |
|---|---|---|
| `ci.yml` | every PR and push to `main` | Web typecheck/lint/unit tests/build, API lint/tests, migration round-trip on PostgreSQL + Redis, Docker image builds, full `docker compose up` smoke test |
| `e2e.yml` | nightly + manual | Playwright Chromium journey suite, including the mobile drop overlay regression |
| `release.yml` | `v*` tag or manual dispatch | Version/tag match, tests, production bundle, GitHub release with notes |

All workflows run with `permissions: contents: read` except the release job,
which needs `contents: write`.

## Required checks

Protect `main` and require these before merge:

- `Web (typecheck, lint, unit tests, build)`
- `API (lint, tests)`
- `Migrations (PostgreSQL + Redis)`
- `Docker images`
- `Compose smoke test`

E2E is nightly because WebGL scenes are heavy and flaky under shared runners;
run it manually on any branch that changes the 3D or drop experience.

## Local equivalents

```bash
npm ci
npm run typecheck
npm run lint
npm test -- --run
npm run build

cd backend
pip install -e ".[dev]"
ruff check .
pytest -q
```

## Semantic versioning

The repo follows SemVer. `package.json` is the source of truth for the web
release; the API version lives in `backend/pyproject.toml` and
`app/main.py`.

```bash
# Choose one
npm version patch   # bug fixes
npm version minor   # backwards-compatible features
npm version major   # breaking changes

git push --follow-tags
```

`release.yml` refuses to publish when the tag (`v0.2.0`) and
`package.json` version (`0.2.0`) disagree. It then runs the test suite,
builds `dist/`, and attaches `crewww-web-v0.2.0.tar.gz` to the GitHub
release.

## Deploying a tagged build

```bash
git fetch --tags
git checkout v0.2.0
cp .env.production.example .env.production   # once, then fill secrets
docker compose --env-file .env.production up -d --build
docker compose exec api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/ready').read())"
```

Rollback is the previous tag plus `docker compose up -d --build`; database
migrations are forward-only, so keep the pre-deploy dump until the release is
verified.

## Secrets

- Never commit `.env`, `.env.staging`, or `.env.production`.
- Prefer your platform's secret store (GitHub Environments, Vault, SSM) over
  files on disk.
- Rotate `JWT_SECRET` and `POSTGRES_PASSWORD` on a schedule and after any
  suspected exposure. Rotating `JWT_SECRET` invalidates all access tokens.
