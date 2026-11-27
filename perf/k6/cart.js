import http from "k6/http";
import { check } from "k6";

const base = __ENV.BASE_URL || "http://127.0.0.1:8080";
export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 30 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<200"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const res = http.get(`${base}/api/v1/cart`);
  check(res, { "cart 200": (r) => r.status === 200 });
}
