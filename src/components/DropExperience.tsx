import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { crewMark, drops, getDrop, type Drop } from "../data/drops";
import { psychedelicPieces } from "../data/psychedelic";
import { psychedelicProducts } from "../data/psychedelicProducts";
import { createStage } from "../scenes/lib/stage";
import { createHoodieModel } from "../scenes/lib/garment";
import {
  isSoundEnabled,
  playSound,
  setSoundEnabled,
  startAmbience,
  stopAmbience,
} from "../lib/sound";

type View = "focus" | "gallery";
type HotspotId = "fabric" | "print" | "fit";

type Props = {
  drop: Drop;
  onExit?: () => void;
  onSelectDrop?: (slug: string) => void;
  onAddToBag?: (colorway: string, size: string) => void;
  onColorwayChange?: (colorway: string) => void;
};

const hotspotCopy: Record<HotspotId, { title: string; body: string }> = {
  fabric: {
    title: "Heavy fleece",
    body: "A dense, structured body built to hold the print flat. Prototype specification — final weight to be confirmed.",
  },
  print: {
    title: "Full-colour DTG",
    body: "The concept artwork is printed directly into the fibres across the back, with the CREW mark at the chest.",
  },
  fit: {
    title: "Boxy study",
    body: "A relaxed shoulder and long sleeve line. Fit shown on the study model, not a production pattern.",
  },
};

/** HUD pins stay put while the object spins, so they remain clickable. */
const hotspotPositions: Record<HotspotId, { left: string; top: string }> = {
  fabric: { left: "33%", top: "47%" },
  print: { left: "60%", top: "34%" },
  fit: { left: "57%", top: "66%" },
};

export function DropExperience({
  drop,
  onExit,
  onSelectDrop,
  onAddToBag,
  onColorwayChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hoverRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const productIndex = Math.max(
    0,
    drops.findIndex((item) => item.slug === drop.slug),
  );
  const product = psychedelicProducts[productIndex] ?? psychedelicProducts[0];
  const piece = psychedelicPieces[productIndex] ?? psychedelicPieces[0];
  const initialSlugRef = useRef(drop.slug);
  const [slug, setSlug] = useState(drop.slug);
  const [colorIndex, setColorIndex] = useState(() => {
    const requested = searchParams.get("colour");
    const index = drop.colorways.findIndex(
      (item) => item.name.toLowerCase() === requested?.toLowerCase(),
    );
    return index >= 0 ? index : 2;
  });
  const [sizeIndex, setSizeIndex] = useState(() => {
    const requested = searchParams.get("size");
    const index = product.sizes.findIndex((item) => item === requested);
    return index >= 0 ? index : 0;
  });
  const [view, setView] = useState<View>(() =>
    searchParams.get("view") === "gallery" ? "gallery" : "focus",
  );
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [nearSlug, setNearSlug] = useState<string | null>(null);
  const [hotspot, setHotspot] = useState<HotspotId | null>(null);
  const [autoSpin, setAutoSpin] = useState(true);
  const [portal, setPortal] = useState(true);
  const [notice, setNotice] = useState("");
  const [cardCollapsed, setCardCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 900,
  );
  const [unsupported, setUnsupported] = useState(false);
  const selectRef = useRef(onSelectDrop);
  const autoSpinRef = useRef(autoSpin);
  const activeDrop = getDrop(slug) ?? drop;
  const selectedSize = product.sizes[sizeIndex] ?? product.sizes[0] ?? "M";
  const selectedVariant = product.variants?.find(
    (variant) =>
      variant.color === activeDrop.colorways[colorIndex]?.name &&
      variant.size === selectedSize,
  );
  const soldOut = selectedVariant ? selectedVariant.stockQuantity <= 0 : false;
  selectRef.current = onSelectDrop;
  autoSpinRef.current = autoSpin;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (slug === initialSlugRef.current) return;
    setSizeIndex(0);
    setColorIndex(2);
    const next = new URLSearchParams(searchParams);
    next.delete("colour");
    next.delete("size");
    setSearchParams(next, { replace: true });
  }, [slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPortal(false), 1050);
    return () => window.clearTimeout(timer);
  }, [slug, view]);

  useEffect(() => {
    if (!soundOn) return undefined;
    startAmbience();
    return () => stopAmbience();
  }, [soundOn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a090b");
    scene.fog = new THREE.FogExp2("#0a090b", 0.035);
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 90);
    const disposables = new Set<{ dispose(): void }>();
    const track = <T extends { dispose(): void }>(item: T): T => {
      disposables.add(item);
      return item;
    };

    scene.add(new THREE.HemisphereLight("#ffd9a8", "#0d0a12", 1.8));
    const key = new THREE.SpotLight("#ffd7a0", 90, 22, Math.PI / 5, 0.65, 1.4);
    key.position.set(-3.5, 7, 5);
    scene.add(key);
    const red = new THREE.PointLight("#9c1f2a", 45, 26);
    red.position.set(5, 3.2, -4);
    scene.add(red);
    const blue = new THREE.PointLight("#2e7f8e", 38, 24);
    blue.position.set(-5, 2.4, -7);
    scene.add(blue);

    const floorMaterial = track(
      new THREE.MeshStandardMaterial({
        color: "#120f13",
        roughness: 0.42,
        metalness: 0.35,
      }),
    );
    const floor = new THREE.Mesh(
      track(new THREE.CircleGeometry(30, 64)),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);
    const grid = new THREE.PolarGridHelper(19, 10, 14, 72, 0x7d2026, 0x2b4b52);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.26;
    track(grid.geometry);
    track(grid.material as THREE.Material);
    scene.add(grid);

    const rings: { mesh: THREE.Mesh; offset: number }[] = [];
    const ringGeo = track(new THREE.TorusGeometry(1, 0.018, 6, 96));
    for (let i = 0; i < 12; i += 1) {
      const material = track(
        new THREE.MeshBasicMaterial({
          color: i % 2 ? "#7d2026" : "#c9ef68",
          transparent: true,
          opacity: 0.36,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      const mesh = new THREE.Mesh(ringGeo, material);
      mesh.position.z = -i * 2.4;
      mesh.scale.setScalar(3.1 + i * 0.18);
      mesh.rotation.x = i * 0.08;
      scene.add(mesh);
      rings.push({ mesh, offset: i });
    }

    const bulbGeo = track(new THREE.SphereGeometry(0.055, 8, 6));
    const bulbs: THREE.Mesh[] = [];
    for (let i = 0; i < 28; i += 1) {
      const angle = (i / 28) * Math.PI * 2;
      const material = track(
        new THREE.MeshBasicMaterial({ color: "#ffd79a", toneMapped: false }),
      );
      const bulb = new THREE.Mesh(bulbGeo, material);
      bulb.position.set(
        Math.cos(angle) * 4.3,
        3.7 + Math.sin(angle * 3) * 0.12,
        Math.sin(angle) * 4.3 - 1,
      );
      scene.add(bulb);
      bulbs.push(bulb);
    }

    // Surreal amusement-park debris: floating shards and small neon orbitals.
    const shardGeo = track(new THREE.OctahedronGeometry(0.24, 0));
    const orbitalGeo = track(new THREE.TorusGeometry(0.36, 0.015, 6, 32));
    const floaters: {
      mesh: THREE.Mesh;
      baseY: number;
      phase: number;
      spin: number;
    }[] = [];
    const shardColors = ["#c9ef68", "#edc69d", "#83d6ef", "#b69cff"];
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      const radius = 3.4 + (i % 4) * 0.75;
      const geometry = i % 3 === 0 ? orbitalGeo : shardGeo;
      const material = track(
        new THREE.MeshBasicMaterial({
          color: shardColors[i % shardColors.length],
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(angle) * radius,
        1.3 + (i % 6) * 0.62,
        Math.sin(angle) * radius - 2,
      );
      mesh.rotation.set(i * 0.4, i * 0.7, i * 0.2);
      scene.add(mesh);
      floaters.push({
        mesh,
        baseY: mesh.position.y,
        phase: i * 0.9,
        spin: i % 2 ? 0.32 : -0.24,
      });
    }

    const loader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const loadPlate = (
      url: string,
      onReady: (texture: THREE.Texture) => void,
    ) => {
      loader.load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        track(texture);
        textures.push(texture);
        onReady(texture);
      });
    };

    const plinthGeo = track(new THREE.CylinderGeometry(1.05, 1.18, 0.34, 32));
    const plinthMaterial = track(
      new THREE.MeshStandardMaterial({
        color: "#1e1a1d",
        roughness: 0.35,
        metalness: 0.6,
      }),
    );
    const createPlinth = (x: number, z: number) => {
      const plinth = new THREE.Mesh(plinthGeo, plinthMaterial);
      plinth.position.set(x, 0.17, z);
      scene.add(plinth);
      const ring = new THREE.Mesh(
        track(new THREE.TorusGeometry(1.02, 0.018, 6, 48)),
        track(
          new THREE.MeshBasicMaterial({ color: "#c9ef68", toneMapped: false }),
        ),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.35, z);
      scene.add(ring);
    };

    const plates: THREE.Mesh[] = [];
    const galleryTargets: THREE.Mesh[] = [];
    let garment: ReturnType<typeof createHoodieModel> | null = null;
    let galleryGarments: ReturnType<typeof createHoodieModel>[] = [];
    const color = activeDrop.colorways[colorIndex]?.value ?? "#171719";

    if (view === "focus") {
      createPlinth(0, 0);
      garment = createHoodieModel(color);
      garment.group.scale.setScalar(1.05);
      garment.group.position.set(0, 1.72, 0);
      scene.add(garment.group);
      garment.group.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments
        ) {
          track(object.geometry);
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => disposables.add(material));
        }
      });
      loadPlate(activeDrop.plate, (texture) => {
        if (!garment?.backPrint) return;
        const material = garment.backPrint.material as THREE.MeshBasicMaterial;
        material.map = texture;
        material.needsUpdate = true;
        garment.backPrint.visible = true;
      });
      loadPlate(crewMark, (texture) => {
        if (!garment?.chestMark) return;
        const material = garment.chestMark.material as THREE.MeshBasicMaterial;
        material.map = texture;
        material.needsUpdate = true;
        garment.chestMark.visible = true;
      });
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2;
        const material = track(
          new THREE.MeshBasicMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            toneMapped: false,
          }),
        );
        const plate = new THREE.Mesh(
          track(new THREE.PlaneGeometry(1.7, 1.1)),
          material,
        );
        plate.position.set(
          Math.cos(angle) * 5.2,
          2.3,
          Math.sin(angle) * 5.2 - 1,
        );
        plate.lookAt(0, 2.1, 0);
        scene.add(plate);
        plates.push(plate);
        loadPlate(activeDrop.plate, (texture) => {
          material.map = texture;
          material.needsUpdate = true;
        });
      }
    } else {
      drops.forEach((item, index) => {
        const angle = (index / drops.length) * Math.PI * 2;
        const x = Math.sin(angle) * 6.6;
        const z = Math.cos(angle) * 6.6;
        createPlinth(x, z);
        const model = createHoodieModel(item.colorways[2]?.value ?? "#171719");
        model.group.scale.setScalar(0.72);
        model.group.position.set(x, 1.42, z);
        model.group.rotation.y = -angle;
        scene.add(model.group);
        galleryGarments.push(model);
        model.group.traverse((object) => {
          if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.LineSegments
          ) {
            track(object.geometry);
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            materials.forEach((material) => disposables.add(material));
          }
        });
        loadPlate(item.plate, (texture) => {
          if (!model.backPrint) return;
          const material = model.backPrint.material as THREE.MeshBasicMaterial;
          material.map = texture;
          material.needsUpdate = true;
          model.backPrint.visible = true;
        });
        const targetMaterial = track(
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            colorWrite: false,
            depthWrite: false,
          }),
        );
        const target = new THREE.Mesh(
          track(new THREE.BoxGeometry(2, 3.2, 2)),
          targetMaterial,
        );
        target.position.set(x, 1.6, z);
        target.userData.slug = item.slug;
        scene.add(target);
        galleryTargets.push(target);
      });
    }

    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const particleGeo = track(new THREE.BufferGeometry());
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMaterial = track(
      new THREE.PointsMaterial({
        color: "#ffdca4",
        size: 0.09,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    scene.add(new THREE.Points(particleGeo, particleMaterial));

    let yaw = view === "focus" ? 0.4 : 0;
    let pitch = view === "focus" ? 0.12 : -0.04;
    let yawVelocity = 0;
    let zoom = 6.4;
    let targetZoom = 6.4;
    const walkPosition = new THREE.Vector3(0, 0, 10);
    const keys = new Set<string>();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = false;
    let lastX = 0;
    let lastY = 0;
    let dragDistance = 0;
    let near: string | null = null;
    const focusTarget = new THREE.Vector3(0, 1.72, 0);

    const stage = createStage(canvas, {
      scene,
      camera,
      fps: 45,
      maxPixelRatio: 1.3,
      visibilityTarget: stageRef.current ?? canvas.parentElement ?? undefined,
      onResize: (w, h) => {
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      },
      onFrame: (delta, elapsed) => {
        const reduced =
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
          false;
        rings.forEach(({ mesh, offset }, index) => {
          mesh.rotation.z += delta * (index % 2 ? 0.09 : -0.07);
          mesh.position.z = -(offset * 2.4 + ((elapsed * 0.6) % 2.4));
          mesh.scale.setScalar(3.1 + ((offset + elapsed * 0.08) % 12) * 0.18);
        });
        bulbs.forEach((bulb, index) => {
          const pulse = 0.65 + Math.sin(elapsed * 3 + index * 0.7) * 0.35;
          (bulb.material as THREE.MeshBasicMaterial).color.setRGB(
            pulse,
            pulse * 0.78,
            pulse * 0.5,
          );
        });
        plates.forEach((plate, index) => {
          plate.rotation.z += delta * 0.04;
          plate.position.y = 2.3 + Math.sin(elapsed * 0.6 + index) * 0.14;
        });
        floaters.forEach((floater) => {
          floater.mesh.rotation.y += delta * floater.spin;
          floater.mesh.rotation.z += delta * floater.spin * 0.5;
          floater.mesh.position.y =
            floater.baseY + Math.sin(elapsed * 0.7 + floater.phase) * 0.28;
        });
        const attribute = particleGeo.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        for (let i = 0; i < particleCount; i += 1) {
          let y = attribute.getY(i) + delta * 0.22;
          if (y > 7) y = 0;
          attribute.setY(i, y);
        }
        attribute.needsUpdate = true;

        if (view === "focus") {
          if (!reduced && autoSpinRef.current && !hoverRef.current)
            yaw += delta * 0.22;
          yaw += yawVelocity * delta;
          yawVelocity *= Math.exp(-delta * 5);
          zoom += (targetZoom - zoom) * (1 - Math.exp(-delta * 7));
          pitch = THREE.MathUtils.clamp(pitch, -0.45, 0.7);
          camera.position.set(
            focusTarget.x + Math.sin(yaw) * Math.cos(pitch) * zoom,
            focusTarget.y + Math.sin(pitch) * zoom,
            focusTarget.z + Math.cos(yaw) * Math.cos(pitch) * zoom,
          );
          camera.lookAt(focusTarget);
          if (garment)
            garment.group.rotation.y = Math.sin(elapsed * 0.35) * 0.08;
        } else {
          const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
          const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
          const zInput =
            (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
            (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
          const xInput =
            (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
            (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
          const movement = forward
            .multiplyScalar(zInput)
            .add(right.multiplyScalar(xInput));
          if (movement.lengthSq() > 0) {
            movement.normalize().multiplyScalar(delta * 3.4);
            walkPosition.add(movement);
          }
          const radius = Math.hypot(walkPosition.x, walkPosition.z);
          if (radius > 11) {
            walkPosition.x *= 11 / radius;
            walkPosition.z *= 11 / radius;
          }
          camera.position.set(walkPosition.x, 2.1, walkPosition.z);
          camera.rotation.set(pitch, yaw, 0, "YXZ");
          let closest: string | null = null;
          let distance = 3.2;
          galleryTargets.forEach((target) => {
            const d = Math.hypot(
              walkPosition.x - target.position.x,
              walkPosition.z - target.position.z,
            );
            if (d < distance) {
              distance = d;
              closest = target.userData.slug as string;
            }
          });
          if (closest !== near) {
            near = closest;
            setNearSlug(closest);
          }
          galleryGarments.forEach((model, index) => {
            model.group.rotation.y =
              -Math.atan2(walkPosition.x, walkPosition.z) + index * 0.1;
          });
        }
      },
    });
    if (!stage) {
      setUnsupported(true);
      return undefined;
    }

    const hitTest = (event: PointerEvent): string | null => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return (
        (raycaster.intersectObjects(galleryTargets, false)[0]?.object.userData
          .slug as string | undefined) ?? null
      );
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      dragDistance = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.focus({ preventScroll: true });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      if (view === "focus") {
        yaw -= dx * 0.006;
        yawVelocity = -dx * 0.06;
        pitch = THREE.MathUtils.clamp(pitch + dy * 0.004, -0.45, 0.7);
      } else {
        yaw -= dx * 0.0035;
        pitch = THREE.MathUtils.clamp(pitch - dy * 0.0035, -0.4, 0.5);
      }
      lastX = event.clientX;
      lastY = event.clientY;
      stage.requestRender();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown) return;
      pointerDown = false;
      canvas.releasePointerCapture?.(event.pointerId);
      const hit = hitTest(event);
      if (hit && dragDistance < 8) {
        playSound("select");
        setSlug(hit);
        setView("focus");
        setPortal(true);
        setHotspot(null);
        selectRef.current?.(hit);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (view !== "focus") return;
      event.preventDefault();
      targetZoom = THREE.MathUtils.clamp(
        targetZoom + event.deltaY * 0.006,
        3.8,
        11,
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (view !== "gallery") return;
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(key)
      )
        event.preventDefault();
      keys.add(key);
      if ((key === "e" || key === "enter") && near) {
        playSound("select");
        setSlug(near);
        setView("focus");
        setPortal(true);
        selectRef.current?.(near);
      }
    };
    const onKeyUp = (event: KeyboardEvent) =>
      keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();
    const onZoom = (event: Event) => {
      targetZoom = THREE.MathUtils.clamp(
        targetZoom + (event as CustomEvent<number>).detail,
        3.8,
        11,
      );
    };
    const onView = (event: Event) => {
      yaw = (event as CustomEvent<number>).detail;
      yawVelocity = 0;
      stage.requestRender();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("blur", onBlur);
    window.addEventListener("drop:zoom", onZoom);
    window.addEventListener("drop:view", onView);
    stage.requestRender();

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("blur", onBlur);
      window.removeEventListener("drop:zoom", onZoom);
      window.removeEventListener("drop:view", onView);
      stage.dispose();
      disposables.forEach((item) => item.dispose());
      galleryGarments = [];
      setNearSlug(null);
    };
  }, [slug, colorIndex, view]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      startAmbience();
      playSound("select");
    } else stopAmbience();
  };

  const flashNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  return (
    <div
      className={`drop-experience ${view === "gallery" ? "is-gallery" : "is-focus"}`}
    >
      <div
        className={`drop-portal ${portal ? "is-open" : ""}`}
        aria-hidden="true"
      >
        <span>CREW</span>
      </div>
      <div className="drop-grain" aria-hidden="true" />
      <header className="drop-topbar">
        <button
          type="button"
          onClick={() => {
            playSound("click");
            onExit?.();
          }}
        >
          ← EXIT THE DROP
        </button>
        <span>CONCEPT 02 / PSYCHEDELIC MINDS</span>
        <button type="button" aria-pressed={soundOn} onClick={toggleSound}>
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </header>

      <div
        className="drop-stage"
        ref={stageRef}
        onPointerEnter={() => {
          hoverRef.current = true;
        }}
        onPointerLeave={() => {
          hoverRef.current = false;
        }}
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={
            view === "focus"
              ? `${activeDrop.name} 3D item viewer. Drag to rotate, scroll to zoom, arrow keys to inspect.`
              : "Drop gallery. Walk with W A S D, drag to look, press E to inspect a piece."
          }
        />
        {unsupported && (
          <div className="drop-fallback">
            <img
              src={activeDrop.artwork ?? activeDrop.plate}
              alt={activeDrop.name}
            />
            <p>3D preview unavailable — the artwork plate is shown instead.</p>
          </div>
        )}

        {view === "focus" && (
          <>
            {(["fabric", "print", "fit"] as HotspotId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`drop-hotspot ${hotspot === id ? "active" : ""}`}
                style={hotspotPositions[id]}
                aria-label={`Inspect ${hotspotCopy[id].title}`}
                onClick={() => {
                  playSound("click");
                  setHotspot(hotspot === id ? null : id);
                }}
              >
                +
              </button>
            ))}
            {hotspot && (
              <div className="drop-hotspot-copy" role="note">
                <strong>{hotspotCopy[hotspot].title}</strong>
                <p>{hotspotCopy[hotspot].body}</p>
              </div>
            )}
            <div className="drop-view-tools">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => {
                  playSound("click");
                  window.dispatchEvent(
                    new CustomEvent("drop:zoom", { detail: -1 }),
                  );
                }}
              >
                +
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => {
                  playSound("click");
                  window.dispatchEvent(
                    new CustomEvent("drop:zoom", { detail: 1 }),
                  );
                }}
              >
                −
              </button>
              <button
                type="button"
                aria-pressed={autoSpin}
                onClick={() => {
                  playSound("click");
                  setAutoSpin((value) => !value);
                }}
              >
                {autoSpin ? "AUTO SPIN ON" : "AUTO SPIN OFF"}
              </button>
              <div
                className="drop-view-angles"
                role="group"
                aria-label="Garment view"
              >
                {(
                  [
                    ["FRONT", 0],
                    ["SIDE", Math.PI / 2],
                    ["BACK", Math.PI],
                  ] as const
                ).map(([label, angle]) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={`${label.toLowerCase()} view`}
                    onClick={() => {
                      playSound("click");
                      setAutoSpin(false);
                      window.dispatchEvent(
                        new CustomEvent("drop:view", { detail: angle }),
                      );
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {view === "gallery" && (
          <div className="drop-walk-hint">
            <span>W A S D TO WALK</span>
            <span>DRAG TO LOOK</span>
            <span>
              {nearSlug
                ? `E TO INSPECT ${getDrop(nearSlug)?.name.toUpperCase() ?? ""}`
                : "APPROACH A PLINTH"}
            </span>
          </div>
        )}
      </div>

      <aside
        className={`drop-item-card${cardCollapsed ? " is-collapsed" : ""}`}
      >
        <button
          type="button"
          className="drop-card-handle"
          aria-expanded={!cardCollapsed}
          aria-controls="drop-card-body"
          onClick={() => setCardCollapsed((v) => !v)}
        >
          <span>{cardCollapsed ? "SHOW DETAILS" : "HIDE DETAILS"}</span>
          <span aria-hidden="true">{cardCollapsed ? "↑" : "↓"}</span>
        </button>
        <div id="drop-card-body" className="drop-card-body">
          <p className="drop-kicker">
            DROP {activeDrop.number} · {activeDrop.signal}
          </p>
          <h2>{activeDrop.name}</h2>
          <p className="drop-world-line">
            <i aria-hidden="true">{piece.world.glyph}</i> {piece.world.name} /{" "}
            {piece.world.realm}
          </p>
          <p className="drop-line">“{activeDrop.line}”</p>
          <p className="drop-lore">{activeDrop.lore}</p>
          <div className="drop-specs">
            <span>PRINT / FULL-COLOUR DTG BACK</span>
            <span>MARK / CREW CHEST</span>
            <span>SERIES / CONCEPT 02</span>
          </div>
          <div
            className="drop-colorways"
            role="group"
            aria-label="Choose a colourway"
          >
            {activeDrop.colorways.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-label={`Select ${item.name}`}
                aria-pressed={colorIndex === index}
                className={colorIndex === index ? "selected" : ""}
                style={{ background: item.value }}
                onClick={() => {
                  playSound("select");
                  setColorIndex(index);
                  setParam("colour", item.name);
                  onColorwayChange?.(item.name);
                }}
              />
            ))}
            <span>{activeDrop.colorways[colorIndex]?.name}</span>
          </div>
          <div className="drop-sizes" role="group" aria-label="Choose a size">
            {product.sizes.map((size, index) => (
              <button
                key={size}
                type="button"
                aria-label={`Select size ${size}`}
                aria-pressed={sizeIndex === index}
                className={sizeIndex === index ? "selected" : ""}
                onClick={() => {
                  playSound("click");
                  setSizeIndex(index);
                  setParam("size", size);
                }}
              >
                {size}
              </button>
            ))}
          </div>
          {selectedVariant && (
            <p className="drop-stock">
              {soldOut
                ? "SOLD OUT IN THIS VARIANT"
                : selectedVariant.stockQuantity <= 5
                  ? `ONLY ${selectedVariant.stockQuantity} LEFT`
                  : `SKU ${selectedVariant.sku}`}
            </p>
          )}
          <div className="drop-actions">
            <button
              type="button"
              className="drop-claim"
              disabled={soldOut}
              onClick={() => {
                playSound("unlock");
                onAddToBag?.(
                  activeDrop.colorways[colorIndex]?.name ?? "Black",
                  selectedSize,
                );
                flashNotice(`ADDED TO YOUR LOADOUT · ${selectedSize}`);
              }}
            >
              ADD TO LOADOUT ↗
            </button>
            <button
              type="button"
              className="drop-gallery-toggle"
              onClick={() => {
                playSound("portal");
                setPortal(true);
                const next = view === "focus" ? "gallery" : "focus";
                setView(next);
                setParam("view", next === "focus" ? null : next);
              }}
            >
              {view === "focus"
                ? "ENTER THE GALLERY →"
                : "BACK TO THE OBJECT →"}
            </button>
          </div>
        </div>
        {notice && (
          <p className="drop-notice" role="status">
            {notice}
          </p>
        )}
      </aside>
    </div>
  );
}
