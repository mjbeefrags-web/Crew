import http from "k6/http";
import { check } from "k6";

const base = __ENV.BASE_URL || "http://127.0.0.1:8080";
export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 15 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const res = http.post(
    `${base}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.PERF_USER || "admin@crewww.example.com",
      password: __ENV.PERF_PASSWORD || "CrewwwOwner!2026",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, { "login handled": (r) => r.status === 200 || r.status === 401 });
}
