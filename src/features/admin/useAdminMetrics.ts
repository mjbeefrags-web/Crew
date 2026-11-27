import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../app/services";
import { API_MODE } from "../../config/runtime";
import { useAuthStore } from "../../state/authStore";
import type { MetricRange } from "../../domain/admin";

/** Server-computed commercial metrics with formulas and assumptions. */
export function useAdminMetrics(days: MetricRange) {
  const user = useAuthStore((state) => state.user);
  const allowed = API_MODE ? user?.role === "admin" : true;
  return useQuery({
    queryKey: ["admin", "metrics", days],
    queryFn: () => adminService.metrics(days),
    enabled: allowed,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
