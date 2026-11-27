# Deployment refresh

A push to `main` or `tier1-perf-smoothness` triggers
`.github/workflows/ci-deploy.yml`:

1. Frontend checks — typecheck, unit tests, production build.
2. Backend checks — `ruff` and `pytest`.
3. Migrate and seed Railway Postgres.
4. Deploy the FastAPI service to Railway.
5. Build and publish the storefront to Cloudflare Workers.

If backend checks fail, the deploy jobs are skipped. Reproduce locally before
re-pushing:

```bash
npm run typecheck && npm test -- --run && npm run build
cd backend && python -m pip install -e '.[dev]' && ruff check . && pytest -q
```

Live endpoints:

- Storefront: `https://crewww-storefront.crewww-storefront.workers.dev`
- API: `https://crewww-api-production.up.railway.app/api/ready`

Check the latest run at
`https://github.com/mjbeefrags-web/Crew/actions/workflows/ci-deploy.yml`.
