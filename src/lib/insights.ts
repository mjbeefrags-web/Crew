import type { AdminEvent, AdminEventType } from "../domain/admin";

const INSIGHTS_KEY = "crewww-insights";
const MAX_EVENTS = 600;

function isEvent(value: unknown): value is AdminEvent {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as AdminEvent).id === "string" &&
    typeof (value as AdminEvent).type === "string" &&
    typeof (value as AdminEvent).createdAt === "string",
  );
}

export function readInsightEvents(): AdminEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(INSIGHTS_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(isEvent) : [];
  } catch {
    return [];
  }
}

export function trackEvent(
  type: AdminEventType,
  meta: Partial<AdminEvent> = {},
) {
  if (typeof window === "undefined") return;
  const event: AdminEvent = {
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    createdAt: new Date().toISOString(),
    ...meta,
  };
  try {
    window.localStorage.setItem(
      INSIGHTS_KEY,
      JSON.stringify([event, ...readInsightEvents()].slice(0, MAX_EVENTS)),
    );
  } catch {
    /* analytics must never break commerce */
  }
  window.dispatchEvent(new CustomEvent("crewww:insight", { detail: event }));
}

export function clearInsightEvents() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(INSIGHTS_KEY);
  } catch {
    /* no-op */
  }
}
