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
    http_req_duration: ["p(95)<400"],
    http_req_failed: ["rate<0.02"],
  },
};

export default function () {
  const token = __ENV.ACCESS_TOKEN;
  if (!token) return;
  const headers = { Authorization: `Bearer ${token}` };
  const orders = http.get(`${base}/api/v1/admin/orders`, { headers });
  const products = http.get(`${base}/api/v1/admin/products`, { headers });
  check(orders, { "admin orders 200": (r) => r.status === 200 });
  check(products, { "admin products 200": (r) => r.status === 200 });
}
