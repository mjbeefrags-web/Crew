import type { AdminData } from "../domain/admin";

/** One adapter shape for demo and API modes; no silent fallback between them. */
export interface AdminService {
  load(): Promise<AdminData>;
}
