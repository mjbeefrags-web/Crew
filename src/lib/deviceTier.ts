export type DeviceTier = "low" | "mid" | "high";

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

let cachedTier: DeviceTier | null = null;

function webglRendererName(): string {
  if (typeof document === "undefined") return "";
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const name = debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) ?? "")
      : String(gl.getParameter(gl.RENDERER) ?? "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name.toLowerCase();
  } catch {
    return "";
  }
}

function softwareRenderer(name: string): boolean {
  return /(swiftshader|llvmpipe|software|mali-4|adreno \(tm\) 3|powervr sgx)/.test(name);
}

/** Coarse, cached capability signal used to scale back 3D work on weak devices. */
export function getDeviceTier(): DeviceTier {
  if (cachedTier) return cachedTier;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    cachedTier = "low";
    return cachedTier;
  }

  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const coarse =
    (window.matchMedia?.("(pointer: coarse)").matches ?? false) ||
    nav.maxTouchPoints > 0;
  const renderer = webglRendererName();
  const reduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  let tier: DeviceTier;
  if (
    reduced ||
    coarse ||
    cores <= 4 ||
    memory <= 4 ||
    softwareRenderer(renderer) ||
    window.innerWidth < 640
  ) {
    tier = "low";
  } else if (cores <= 6 || memory <= 6) {
    tier = "mid";
  } else {
    tier = "high";
  }
  cachedTier = tier;
  return tier;
}

export function isLowEnd(): boolean {
  return getDeviceTier() === "low";
}

/** Test-only reset for capability-sensitive assertions. */
export function resetDeviceTierCache(): void {
  cachedTier = null;
}

type TierListener = (tier: DeviceTier) => void;
const listeners = new Set<TierListener>();

/** Observe runtime capability changes (resize, orientation, reduced motion, context loss). */
export function subscribeDeviceTier(listener: TierListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function invalidateDeviceTier(): void {
  const previous = cachedTier;
  cachedTier = null;
  const next = getDeviceTier();
  if (next !== previous) listeners.forEach((listener) => listener(next));
}

if (typeof window !== "undefined") {
  let resizeFrame = 0;
  window.addEventListener(
    "resize",
    () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(invalidateDeviceTier);
    },
    { passive: true },
  );
  window.addEventListener("orientationchange", invalidateDeviceTier);
  window.addEventListener("webglcontextlost", invalidateDeviceTier, true);
  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  );
  reducedMotion?.addEventListener?.("change", invalidateDeviceTier);
}
