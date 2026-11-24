import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_MODE } from "../../config/runtime";
import { adminService } from "../../app/services";
import { useAuthStore } from "../../state/authStore";
import type { MetricRange } from "../../domain/admin";

export function useAdminData(rangeDays: MetricRange) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const allowed = API_MODE ? user?.role === "admin" : true;

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "data"] });
    };
    window.addEventListener("crewww:insight", refresh);
    window.addEventListener("arcfield:bag-updated", refresh);
    return () => {
      window.removeEventListener("crewww:insight", refresh);
      window.removeEventListener("arcfield:bag-updated", refresh);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin", "data", rangeDays],
    queryFn: () => adminService.load(),
    enabled: allowed,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
