export const API_MODE = (import.meta.env.VITE_DATA_MODE ?? "mock") === "api";
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);
