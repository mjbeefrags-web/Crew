import type { AdminData, AiAdvice } from "../domain/admin";

/** One adapter shape for demo and API modes; no silent fallback between them. */
export interface AdminService {
  load(): Promise<AdminData>;
  advise(
    signals: Record<string, unknown>,
    question?: string,
  ): Promise<AiAdvice>;
}
