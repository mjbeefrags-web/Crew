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

Record results in the release notes. Investigate regressions with:

```bash
docker compose exec db psql -U crewww -d crewww -c \
  "select calls, round(mean_exec_time::numeric,2) as avg_ms, query
   from pg_stat_statements order by mean_exec_time desc limit 15;"
```
