# Performance tests (k6)

`catalog.js` ramps to 50 virtual users against the home page, catalog list,
search, and health endpoint.

```bash
# Start the stack first
docker compose up -d --build

# Run with Docker (no local k6 install needed)
docker run --rm -i --network crewww_internal grafana/k6 run - \
  -e BASE_URL=http://web:80 < perf/k6/catalog.js

# Or from the host when the stack is bound to loopback
k6 run -e BASE_URL=http://127.0.0.1:8080 perf/k6/catalog.js
```

Thresholds (the run fails if breached):

- `http_req_failed < 1%`
- `http_req_duration p(95) < 500 ms`, `p(99) < 1000 ms`
- `checks > 99%`

## Frontend budgets

Two Playwright audits live here. Run them against a built site (`npm run build
&& npm run preview -- --port 5201`) with `PERF_BASE_URL=http://localhost:5201`:

```bash
node perf/audit-overflow.mjs   # zero horizontal overflow at 320/390/768/1024/1440
node perf/audit-perf.mjs       # downloaded bytes by resource type + first paint
```

Current production baseline: `/shop` 0.8 MB images / 0.50 MB JS / FCP ~280 ms,
`/drops` 1.9 MB images / 0.51 MB JS / FCP ~120 ms, home FCP ~130 ms. The WebGL
world loads only after the browser is idle.

Record results in the release notes. Investigate regressions with:

```bash
docker compose exec db psql -U crewww -d crewww -c \
  "select calls, round(mean_exec_time::numeric,2) as avg_ms, query
   from pg_stat_statements order by mean_exec_time desc limit 15;"
```
