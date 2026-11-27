import { useEffect, useRef, useState } from "react";
import {
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
} from "three";
import { createStage } from "./lib/stage";
import { isLowEnd } from "../lib/deviceTier";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = (lowPower: boolean) => /* glsl */ `
  precision ${lowPower ? "mediump" : "highp"} float;
  #define FBM_STEPS ${lowPower ? 1 : 2}
  #define WARP_STEPS ${lowPower ? 2 : 3}
  uniform float uTime;
  uniform float uEnergy;
  uniform vec2 uPointer;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uAccent;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < FBM_STEPS; i++) {
      value += amplitude * noise(p);
      p *= 2.02;
      amplitude *= 0.5;
    }
    return value;
  }

  float eyeShape(vec2 p, vec2 centre) {
    vec2 q = (p - centre) * vec2(1.0, 1.75);
    return 1.0 - smoothstep(0.11, 0.19, length(q));
  }

  float irisShape(vec2 p, vec2 centre, vec2 look) {
    vec2 q = p - centre - look * vec2(0.035, 0.024);
    float eye = eyeShape(p, centre);
    return eye * (1.0 - smoothstep(0.028, 0.055, length(q * vec2(1.0, 1.2))));
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(1.7, 1.0);
    float t = uTime * 0.18;
    float breath = 1.0 + sin(uTime * 0.55) * 0.045;
    p *= breath;

    vec2 warp = p;
    for (int i = 0; i < WARP_STEPS; i++) {
      warp += 0.12 * vec2(
        sin(warp.y * 3.4 + t * 1.3 + float(i) * 1.8) + fbm(warp * 2.0 + t) * 0.35,
        cos(warp.x * 3.0 - t * 1.1 + float(i) * 1.4) + fbm(warp * 2.0 - t) * 0.35
      );
    }
    warp += uPointer * 0.12;

    float n = fbm(warp * 2.2 + t * 0.4);
    float r = length(warp);
    float a = atan(warp.y, warp.x);
    float rings = sin(r * 13.0 - t * 5.0 + n * 3.0);
    float petals = sin(a * 9.0 + r * 8.0 - t * 2.2 + n * 2.0);
    float mixValue = 0.5 + 0.5 * rings * petals;

    vec3 color = mix(uColorA, uColorB, smoothstep(0.15, 0.85, mixValue));
    color = mix(color, uColorC, 0.35 + 0.35 * sin(r * 5.0 + t * 1.6 + n * 2.0));
    color += uAccent * (0.12 + 0.18 * n) * (0.5 + 0.5 * rings);
    color *= 0.78 + 0.28 * sin(r * 3.5 - t * 0.9);

    vec2 leftEye = vec2(-0.42, 0.10);
    vec2 rightEye = vec2(0.42, 0.10);
    float eyes = max(eyeShape(warp, leftEye), eyeShape(warp, rightEye));
    float iris = max(irisShape(warp, leftEye, uPointer), irisShape(warp, rightEye, uPointer));
    color = mix(color, vec3(0.94, 0.93, 0.87), eyes * 0.24);
    color = mix(color, uAccent, iris * 0.85);

    color.r *= 1.0 + 0.035 * sin(r * 22.0 - t * 3.0);
    color.b *= 1.0 + 0.035 * cos(r * 19.0 + t * 2.7);

    float vignette = smoothstep(1.1, 0.16, r);
    float grain = hash(uv * 900.0 + fract(uTime) * 17.0);
    color = color * vignette + grain * 0.022;
    gl_FragColor = vec4(color * uEnergy, 1.0);
  }
`;

type Props = {
  mood: { a: string; b: string; c: string };
  energy?: number;
  accent?: string;
};

/** Full-bleed animated plasma backdrop with breathing eyes for the psychedelic drop. */
export function PsychedelicField({ mood, energy = 1, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const moodRef = useRef(mood);
  const energyRef = useRef(energy);
  const accentRef = useRef(accent ?? mood.a);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [unsupported, setUnsupported] = useState(false);
  const [staticFallback] = useState(
    () =>
      isLowEnd() ||
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false),
  );
  moodRef.current = mood;
  energyRef.current = energy;
  accentRef.current = accent ?? mood.a;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || staticFallback) return undefined;
    const lowPower =
      (window.matchMedia?.("(max-width: 640px), (pointer: coarse)").matches ??
        false) ||
      (navigator.hardwareConcurrency ?? 8) <= 4;
    const reducedMotion =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const pointerTarget = new Vector2();
    const targetA = new Color(moodRef.current.a);
    const targetB = new Color(moodRef.current.b);
    const targetC = new Color(moodRef.current.c);
    const targetAccent = new Color(accentRef.current);
    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader: fragmentShader(lowPower),
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: energyRef.current },
        uPointer: { value: new Vector2() },
        uColorA: { value: new Color(moodRef.current.a) },
        uColorB: { value: new Color(moodRef.current.b) },
        uColorC: { value: new Color(moodRef.current.c) },
        uAccent: { value: new Color(accentRef.current) },
      },
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new Mesh(geometry, material));

    const stage = createStage(canvas, {
      scene,
      camera,
      fps: lowPower ? 24 : 30,
      maxPixelRatio: lowPower ? 0.75 : 0.9,
      antialias: false,
      visibilityTarget: canvas.parentElement ?? undefined,
      disposables: new Set([geometry, material]),
      onFrame: (delta, elapsed) => {
        const u = material.uniforms;
        const smoothing = 1 - Math.exp(-delta * 3);
        u.uTime.value = reducedMotion?.matches ? 0 : elapsed;
        u.uEnergy.value += (energyRef.current - u.uEnergy.value) * smoothing;
        pointerTarget.set(pointerRef.current.x, pointerRef.current.y);
        (u.uPointer.value as Vector2).lerp(
          pointerTarget,
          1 - Math.exp(-delta * 4),
        );
        targetA.set(moodRef.current.a);
        targetB.set(moodRef.current.b);
        targetC.set(moodRef.current.c);
        targetAccent.set(accentRef.current);
        (u.uColorA.value as Color).lerp(targetA, smoothing);
        (u.uColorB.value as Color).lerp(targetB, smoothing);
        (u.uColorC.value as Color).lerp(targetC, smoothing);
        (u.uAccent.value as Color).lerp(targetAccent, smoothing);
      },
    });
    if (!stage) {
      setUnsupported(true);
      return undefined;
    }

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerRef.current = {
        x:
          ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2,
        y:
          (0.5 - (event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2,
      };
      stage.requestRender();
    };
    let scrollResume = 0;
    const onScroll = () => {
      // Give the scroll thread priority: render one frame, pause the ambient
      // loop while the page is moving, then resume shortly after it settles.
      stage.setMotionEnabled(false);
      stage.requestRender();
      window.clearTimeout(scrollResume);
      scrollResume = window.setTimeout(() => stage.setMotionEnabled(true), 200);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(scrollResume);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      stage.dispose();
    };
  }, []);

  if (staticFallback) {
    return (
      <div
        className="psychedelic-field psychedelic-field-static"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${mood.b}, ${mood.c} 48%, #0b0a0d 85%)`,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`psychedelic-field${unsupported ? " is-unsupported" : ""}`}
      aria-hidden="true"
    />
  );
}
