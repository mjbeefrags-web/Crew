import http from "k6/http";
import { check } from "k6";

const base = __ENV.BASE_URL || "http://127.0.0.1:8080";
const slug = __ENV.PRODUCT_SLUG || "vivre-la-vie-hoodie";
export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 60 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<100"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const res = http.get(`${base}/api/v1/products/${slug}`);
  check(res, { "product 200": (r) => r.status === 200 || r.status === 404 });
}
