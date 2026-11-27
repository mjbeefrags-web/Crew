import {
  ACESFilmicToneMapping,
  Camera,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
} from "three";
import type { ToneMapping } from "three";

export type StageOptions = {
  scene: Scene;
  camera: Camera;
  maxPixelRatio?: number;
  fps?: number;
  alpha?: boolean;
  antialias?: boolean;
  toneMapping?: ToneMapping;
  visibilityTarget?: HTMLElement;
  /** Geometries, materials and textures owned by the scene. */
  disposables?: Set<{ dispose(): void }>;
  onFrame?: (delta: number, elapsed: number) => void;
  onResize?: (width: number, height: number) => void;
};

export type Stage = {
  renderer: WebGLRenderer;
  requestRender: () => void;
  setMotionEnabled: (enabled: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

/**
 * Small shared runtime for the site's direct-Three.js scenes.
 *
 * The original scenes rendered only on user input. This adds a budgeted,
 * visibility-aware loop so the world can breathe without draining a phone
 * battery. Rendering still collapses to on-demand when motion is reduced.
 */
export function createStage(
  canvas: HTMLCanvasElement,
  options: StageOptions,
): Stage | null {
  if (!window.WebGLRenderingContext && !window.WebGL2RenderingContext)
    return null;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: options.alpha ?? false,
      antialias: options.antialias ?? true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = options.toneMapping ?? ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    window.innerWidth < 640
      ? Math.min(options.maxPixelRatio ?? 1.5, 1)
      : (options.maxPixelRatio ?? 1.5),
  );
  renderer.setPixelRatio(pixelRatio);

  const motionQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  let motionEnabled = !(motionQuery?.matches ?? false);
  let onscreen = true;
  let offscreenTimer = 0;
  let contextLost = false;
  let disposed = false;
  let needsRender = true;
  let frameId = 0;
  let lastFrame = 0;
  let elapsed = 0;
  // Cap the frame budget so animated scenes stay smooth on mid-tier devices:
  // 40 fps under 600px, 45 fps by default, 60 fps when fps is not set.
  const requestedFps = options.fps ?? (window.innerWidth < 600 ? 40 : 45);
  const minFrameTime = requestedFps > 0 ? 1000 / requestedFps : 0;

  const render = (delta: number) => {
    options.onFrame?.(delta, elapsed);
    renderer.render(options.scene, options.camera);
  };

  const loop = (now: number) => {
    if (disposed || contextLost) return;
    frameId = window.requestAnimationFrame(loop);
    if (now - lastFrame < minFrameTime) return;
    const delta =
      lastFrame === 0 ? 1 / 60 : Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    elapsed += delta;
    if (motionEnabled || needsRender) {
      needsRender = false;
      render(delta);
    }
  };

  const requestRender = () => {
    needsRender = true;
  };

  const resize = () => {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    options.onResize?.(width, height);
    needsRender = true;
  };

  const updateVisibility = () => {
    const active = onscreen && !document.hidden;
    if (!active) {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrame = 0;
      return;
    }
    if (!frameId) {
      lastFrame = 0;
      frameId = window.requestAnimationFrame(loop);
    }
  };

  // Keep rendering briefly after the canvas leaves the viewport (smoother
  // scroll), then stop the rAF loop until it comes back or the tab is shown.
  const onIntersection = (entries: IntersectionObserverEntry[]) => {
    onscreen = entries.some((entry) => entry.isIntersecting);
    window.clearTimeout(offscreenTimer);
    if (onscreen) updateVisibility();
    else offscreenTimer = window.setTimeout(updateVisibility, 2000);
  };

  const onMotionChange = () => {
    motionEnabled = !motionQuery!.matches;
    needsRender = true;
  };
  const onVisibilityChange = () => updateVisibility();
  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };
  const onContextRestored = () => {
    contextLost = false;
    resize();
    updateVisibility();
  };

  let observer: ResizeObserver | null = null;
  let intersection: IntersectionObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(resize);
    observer.observe(canvas);
  }
  if (typeof IntersectionObserver !== "undefined" && options.visibilityTarget) {
    intersection = new IntersectionObserver(onIntersection, {
      rootMargin: "120px",
    });
    intersection.observe(options.visibilityTarget);
  }
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibilityChange);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  motionQuery?.addEventListener?.("change", onMotionChange);

  resize();
  updateVisibility();

  return {
    renderer,
    requestRender,
    setMotionEnabled: (enabled: boolean) => {
      motionEnabled = enabled;
      needsRender = true;
    },
    resize,
    dispose: () => {
      disposed = true;
      window.clearTimeout(offscreenTimer);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      motionQuery?.removeEventListener?.("change", onMotionChange);
      observer?.disconnect();
      intersection?.disconnect();
      options.disposables?.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
