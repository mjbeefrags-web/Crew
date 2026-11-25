/**
 * Build-time feature flags.
 *
 * Vite inlines `import.meta.env.VITE_FEATURE_*` at build time, so toggling a
 * flag only requires rebuilding the web image with a different value. Defaults
 * are chosen so a plain `npm run dev` keeps the full experience on.
 */
function flag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export const FEATURES = {
  /** "Recently viewed" rail on the home page. */
  recentlyViewed: flag(import.meta.env.VITE_FEATURE_RECENTLY_VIEWED, true),
  /** Command palette (⌘K / Ctrl+K) and its search affordances. */
  commandPalette: flag(import.meta.env.VITE_FEATURE_COMMAND_PALETTE, true),
  /** Ambient home sound when the visitor opts in. */
  ambientSound: flag(import.meta.env.VITE_FEATURE_AMBIENT_SOUND, true),
  /** Walk/explore mode in the CREWWW world. */
  worldWalk: flag(import.meta.env.VITE_FEATURE_WORLD_WALK, true),
} as const;
