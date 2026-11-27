import { useEffect, useRef, useState } from "react";
import {
  CanvasTexture,
  DirectionalLight,
  HemisphereLight,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  Vector3,
} from "three";
import { crewMark } from "../data/drops";
import { createStage } from "../scenes/lib/stage";
import { createHoodieModel } from "../scenes/lib/garment";
import { isLowEnd } from "../lib/deviceTier";

type HoodieViewerProps = {
  color: string;
  label: string;
  artworkUrl?: string;
  /** Extra rotation in radians. Scroll-driven stages add this on top of drag input. */
  scrollYaw?: number;
  /** Shown instead of the generic notice when WebGL is unavailable. */
  fallbackUrl?: string;
};

export function HoodieViewer({
  color,
  label,
  artworkUrl,
  scrollYaw = 0,
  fallbackUrl,
}: HoodieViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [staticFallback] = useState(
    () =>
      isLowEnd() ||
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false),
  );
  const [autoSpin, setAutoSpin] = useState(false);
  const autoSpinRef = useRef(autoSpin);
  const scrollYawRef = useRef(scrollYaw);
  autoSpinRef.current = autoSpin;
  scrollYawRef.current = scrollYaw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || staticFallback) return undefined;
    let disposed = false;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const scene = new Scene();
    const camera = new PerspectiveCamera(32, width / height, 0.1, 30);
    const disposables = new Set<{ dispose(): void }>();
    const track = <T extends { dispose(): void }>(item: T): T => {
      disposables.add(item);
      return item;
    };

    const target = new Vector3(0, 0.2, 0);
    scene.add(new HemisphereLight("#ffffff", "#33303b", 2));
    const key = new DirectionalLight("#fff6e6", 3.2);
    key.position.set(-3.5, 4.2, 5);
    scene.add(key);
    const rim = new DirectionalLight("#d5d2ff", 2.2);
    rim.position.set(4, 1.5, -3);
    scene.add(rim);
    const warm = new PointLight("#ffd79a", 18, 12);
    warm.position.set(2, -1, 3);
    scene.add(warm);

    const shadowSurface = document.createElement("canvas");
    shadowSurface.width = shadowSurface.height = 128;
    const shadowContext = shadowSurface.getContext("2d");
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(
        64,
        64,
        2,
        64,
        64,
        64,
      );
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = track(new CanvasTexture(shadowSurface));
    const shadowMaterial = track(
      new MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        map: shadowTexture,
      }),
    );
    const shadow = new Mesh(track(new PlaneGeometry(3.2, 1.2)), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.02;
    scene.add(shadow);

    const model = createHoodieModel(color);
    scene.add(model.group);
    model.group.traverse((object) => {
      if (object instanceof Mesh || object instanceof LineSegments) {
        track(object.geometry);
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => disposables.add(material));
      }
    });

    const loader = new TextureLoader();
    if (artworkUrl) {
      loader.load(artworkUrl, (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        track(texture);
        if (model.backPrint) {
          const material = model.backPrint.material as MeshBasicMaterial;
          material.map = texture;
          material.needsUpdate = true;
          model.backPrint.visible = true;
        }
        stage?.requestRender();
      });
    }
    loader.load(crewMark, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      track(texture);
      if (model.chestMark) {
        const material = model.chestMark.material as MeshBasicMaterial;
        material.map = texture;
        material.needsUpdate = true;
        model.chestMark.visible = true;
      }
      stage?.requestRender();
    });

    let yaw = 0.25;
    let velocity = 0;
    let zoom = 7.3;
    let targetZoom = 7.3;
    let dragging = false;
    let lastX = 0;

    const stage = createStage(canvas, {
      scene,
      camera,
      alpha: true,
      fps: 45,
      maxPixelRatio: 1.5,
      disposables,
      onResize: (w, h) => {
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      },
      onFrame: (delta) => {
        if (autoSpinRef.current) yaw += delta * 0.28;
        yaw += velocity * delta;
        velocity *= Math.exp(-delta * 5);
        zoom += (targetZoom - zoom) * (1 - Math.exp(-delta * 8));
        const totalYaw = yaw + scrollYawRef.current;
        model.group.rotation.y = totalYaw;
        model.group.position.y = Math.sin(performance.now() * 0.0006) * 0.025;
        camera.position.set(
          Math.sin(totalYaw * 0.18) * 0.35,
          target.y + 0.12,
          zoom,
        );
        camera.lookAt(target);
      },
    });
    if (!stage) {
      setUnsupported(true);
      return () => disposables.forEach((item) => item.dispose());
    }

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.focus({ preventScroll: true });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const deltaX = event.clientX - lastX;
      yaw -= deltaX * 0.008;
      velocity = -deltaX * 0.05;
      lastX = event.clientX;
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      canvas.releasePointerCapture?.(event.pointerId);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetZoom = MathUtils.clamp(targetZoom + event.deltaY * 0.005, 5.2, 10);
    };
    const onTurn = (event: Event) => {
      const direction = (event as CustomEvent<number>).detail;
      yaw += (direction * Math.PI) / 4;
      velocity = direction * 0.3;
    };
    const onReset = () => {
      yaw = 0.25;
      velocity = 0;
      zoom = 7.3;
      targetZoom = 7.3;
      setAutoSpin(false);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("hoodie:turn", onTurn);
    window.addEventListener("hoodie:reset", onReset);

    return () => {
      disposed = true;
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("hoodie:turn", onTurn);
      window.removeEventListener("hoodie:reset", onReset);
      stage.dispose();
    };
  }, [color, artworkUrl]);

  return (
    <div
      className="hoodie-viewer"
      role="group"
      aria-label={`${label} 3D product viewer`}
    >
      {!unsupported && !staticFallback ? (
        <canvas
          ref={canvasRef}
          tabIndex={0}
          data-cursor="TURN"
          aria-label={`${label}, drag to rotate and scroll to zoom`}
        />
      ) : fallbackUrl ? (
        <img
          className="viewer-fallback"
          src={fallbackUrl}
          alt={`${label} garment preview`}
        />
      ) : (
        <div className="viewer-unavailable">
          3D preview is unavailable in this browser.
        </div>
      )}
      {!unsupported && !staticFallback && (
        <div className="viewer-controls">
          <button
            type="button"
            aria-label="Rotate hoodie left"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("hoodie:turn", { detail: -1 }),
              )
            }
          >
            ↶
          </button>
          <button
            type="button"
            aria-label="Rotate hoodie right"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("hoodie:turn", { detail: 1 }),
              )
            }
          >
            ↷
          </button>
          <button
            type="button"
            aria-label="Reset hoodie view"
            onClick={() => window.dispatchEvent(new Event("hoodie:reset"))}
          >
            ↺
          </button>
          <span>DRAG · ZOOM · SPIN</span>
          <button
            type="button"
            aria-label="Toggle automatic spin"
            aria-pressed={autoSpin}
            onClick={() => setAutoSpin((value) => !value)}
          >
            {autoSpin ? "STOP SPIN" : "AUTO SPIN"}
          </button>
        </div>
      )}
      <span className="viewer-caption">
        ILLUSTRATIVE 3D GARMENT / CREWWW STUDY 01
      </span>
    </div>
  );
}
