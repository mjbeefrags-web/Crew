import http from "k6/http";
import { check, sleep } from "k6";

// Usage:
//   k6 run -e BASE_URL=http://127.0.0.1:8080 perf/k6/catalog.js
// Thresholds fail the run (exit code 99) when the API degrades.

export const options = {
  scenarios: {
    catalog_smoke: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    checks: ["rate>0.99"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8080";

export default function () {
  const home = http.get(`${BASE_URL}/`);
  check(home, {
    "home 200": (r) => r.status === 200,
    "home is html": (r) => (r.headers["Content-Type"] || "").includes("text/html"),
  });

  const list = http.get(`${BASE_URL}/api/v1/products?pageSize=24`);
  check(list, {
    "catalog 200": (r) => r.status === 200,
    "catalog page shape": (r) => {
      const body = r.json();
      return Array.isArray(body.items) && typeof body.total === "number";
    },
  });

  const search = http.get(`${BASE_URL}/api/v1/products?term=hoodie&available=true`);
  check(search, { "search 200": (r) => r.status === 200 });

  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    "health 200": (r) => r.status === 200,
    "health body": (r) => r.json().status === "healthy",
  });

  sleep(1);
}
