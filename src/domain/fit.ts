/** Provisional sizing guidance. The brand owner must confirm measurements against production samples. */

export type FitPreference = "snug" | "true" | "roomy";

export type FitRecommendation = {
  size: string;
  chestCm: number;
  preference: FitPreference;
  rationale: string;
  confidence: "guided" | "provisional";
};

const CHEST_CENTRES: Record<string, number> = {
  XS: 84,
  S: 92,
  M: 100,
  L: 108,
  XL: 116,
  XXL: 124,
  XXXL: 132,
  "ONE SIZE": 100,
};

const PREFERENCE_OFFSET: Record<FitPreference, number> = {
  snug: -3,
  true: 0,
  roomy: 4,
};
const PREFERENCE_COPY: Record<FitPreference, string> = {
  snug: "a closer body feel",
  true: "your usual fit",
  roomy: "extra room over a layer",
};

/**
 * Maps a chest measurement and fit preference onto the sizes a product actually offers.
 * Unknown size labels fall back to an even index spread so preview catalogues still work.
 */
export function recommendSize(
  sizes: readonly string[],
  chestCm: number,
  preference: FitPreference,
  fitLabel?: string,
): FitRecommendation | null {
  const available = sizes.filter((size) => Boolean(size?.trim()));
  if (!available.length || !Number.isFinite(chestCm)) return null;

  const chest = Math.max(70, Math.min(140, Math.round(chestCm)));
  const target = chest + PREFERENCE_OFFSET[preference];
  const labels = available.map((size) => size.trim().toUpperCase());
  const known = labels.every((label) => label in CHEST_CENTRES);

  let size = available[0];
  if (available.length > 1) {
    if (known) {
      const centres = labels.map((label) => CHEST_CENTRES[label]);
      const match = centres.findIndex((centre) => target <= centre);
      size = available[match === -1 ? centres.length - 1 : match];
    } else {
      const min = CHEST_CENTRES.XS;
      const max = CHEST_CENTRES.XXXL;
      const ratio = Math.max(0, Math.min(1, (target - min) / (max - min)));
      size = available[Math.round(ratio * (available.length - 1))];
    }
  }

  const fitNote = fitLabel
    ? ` ${fitLabel} fit adds its own shape, so treat this as a starting point.`
    : "";
  return {
    size,
    chestCm: chest,
    preference,
    rationale: `Based on a ${chest} cm chest and ${PREFERENCE_COPY[preference]}.${fitNote}`,
    confidence: fitLabel ? "guided" : "provisional",
  };
}
