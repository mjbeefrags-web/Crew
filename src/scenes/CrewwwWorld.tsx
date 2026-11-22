import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type WorldDestinationId = 'graphic' | 'outside' | 'city' | 'essentials';
export type CrewwwWorldProps = { onDestination: (destination: WorldDestinationId) => void };

const storefronts: { id: WorldDestinationId; name: string; x: number; z: number; poster: string }[] = [
  { id: 'graphic', name: 'GRAPHIC HOODIES', x: -5.4, z: -2.2, poster: '/images/crewww/hoodie-01.jpg' },
  { id: 'outside', name: 'OUTSIDE HOURS', x: 5.4, z: -2.2, poster: '/images/crewww/hoodie-03.jpg' },
  { id: 'city', name: 'CITY NOTES', x: -4.7, z: -9.2, poster: '/images/crewww/hoodie-06.jpg' },
  { id: 'essentials', name: 'ESSENTIALS', x: 4.7, z: -9.2, poster: '/images/crewww/hoodie-08.jpg' },
];

function makeSignTexture(name: string) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#c9ef68'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111210'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = name.length > 13 ? '700 42px Arial, sans-serif' : '700 56px Arial, sans-serif'; context.fillText(`CREWWW  /  ${name}`, 384, 96, 710);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makeWorldGarment(color: string) {
  const garment = new THREE.Group();
  const silhouette = new THREE.Shape();
  silhouette.moveTo(-0.52, -0.78); silhouette.lineTo(0.52, -0.78); silhouette.lineTo(0.55, 0.5);
  silhouette.lineTo(0.79, 0.7); silhouette.lineTo(1.2, -0.35); silhouette.quadraticCurveTo(1.36, -0.5, 1.48, -0.34);
  silhouette.lineTo(1.17, 0.83); silhouette.quadraticCurveTo(1.02, 1.02, 0.8, 0.98); silhouette.lineTo(0.55, 0.82);
  silhouette.lineTo(0.4, 1.22); silhouette.quadraticCurveTo(0, 1.5, -0.4, 1.22); silhouette.lineTo(-0.55, 0.82);
  silhouette.lineTo(-0.8, 0.98); silhouette.quadraticCurveTo(-1.02, 1.02, -1.17, 0.83); silhouette.lineTo(-1.48, -0.34);
  silhouette.quadraticCurveTo(-1.36, -0.5, -1.2, -0.35); silhouette.lineTo(-0.79, 0.7); silhouette.lineTo(-0.55, 0.5); silhouette.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(silhouette, { depth: 0.12, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.025, bevelThickness: 0.025 }), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  body.position.z = -0.06; garment.add(body);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.82), roughness: 0.92 }));
  hood.scale.set(0.88, 0.58, 0.28); hood.position.set(0, 1.12, -0.08); garment.add(hood);
  const graphic = makeSignTexture('CREWWW');
  if (graphic) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.22), new THREE.MeshBasicMaterial({ map: graphic, transparent: true, toneMapped: false }));
    mark.position.set(0, 0.32, 0.08); garment.add(mark);
  }
  return garment;
}

export function CrewwwWorld({ onDestination }: CrewwwWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const callbackRef = useRef(onDestination);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; root: THREE.Group; raycaster: THREE.Raycaster; hotspots: THREE.Mesh[] } | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  callbackRef.current = onDestination;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!window.WebGLRenderingContext && !window.WebGL2RenderingContext) { setUnsupported(true); return undefined; }
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' }); }
    catch { setUnsupported(true); return undefined; }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101711');
    scene.fog = new THREE.Fog('#101711', 13, 33);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 55);
    camera.position.set(0, 3.1, 11.8); camera.lookAt(0, 1.1, -5.5);
    const root = new THREE.Group(); scene.add(root);
    scene.add(new THREE.HemisphereLight('#d9e7d4', '#1a1e19', 2.25));
    const moon = new THREE.DirectionalLight('#c9d8c9', 3); moon.position.set(-5, 10, 8); scene.add(moon);
    const streetGlow = new THREE.PointLight('#d6efae', 2.1, 25); streetGlow.position.set(0, 5, -5); scene.add(streetGlow);

    const groundMaterial = new THREE.MeshStandardMaterial({ color: '#29302a', roughness: 0.94 });
    const roadMaterial = new THREE.MeshStandardMaterial({ color: '#151a16', roughness: 0.88 });
    const curbMaterial = new THREE.MeshStandardMaterial({ color: '#66715d', roughness: 0.8 });
    const buildingMaterial = new THREE.MeshStandardMaterial({ color: '#2c372e', roughness: 0.86 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: '#6e8063', roughness: 0.66, metalness: 0.12 });
    const windowMaterial = new THREE.MeshStandardMaterial({ color: '#d5e7bc', emissive: '#78925d', emissiveIntensity: 1.25, roughness: 0.25 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 44), groundMaterial); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.48, -8); root.add(floor);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 42), roadMaterial); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.44, -8); root.add(road);
    for (const x of [-4.9, 4.9]) {
      const pavement = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 42), curbMaterial); pavement.rotation.x = -Math.PI / 2; pavement.position.set(x, -0.42, -8); root.add(pavement);
    }
    for (let z = 3; z > -26; z -= 4) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 1.15), trimMaterial); dash.position.set(0, -0.42, z); root.add(dash);
    }

    const hotspots: THREE.Mesh[] = [];
    const loadedTextures: THREE.Texture[] = [];
    let disposed = false;
    const loader = new THREE.TextureLoader();
    for (let i = 0; i < storefronts.length; i += 1) {
      const shop = storefronts[i];
      const facade = new THREE.Group(); facade.position.set(shop.x, 0, shop.z); root.add(facade);
      const building = new THREE.Mesh(new THREE.BoxGeometry(5.1, 5.8, 3.6), buildingMaterial); building.position.y = 2.35; facade.add(building);
      const signTexture = makeSignTexture(shop.name);
      let signMesh: THREE.Mesh | null = null;
      if (signTexture) {
        loadedTextures.push(signTexture);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 0.84), new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false }));
        sign.position.set(0, 4.55, 1.84); facade.add(sign); signMesh = sign;
      }
      const target = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false }));
      target.position.set(0, 4.55, 1.91); target.userData.destination = shop.id; target.userData.sign = signMesh; facade.add(target); hotspots.push(target);
      for (const windowX of [-1.3, 1.3]) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.48, 2.24, 0.22), trimMaterial); frame.position.set(windowX, 1.72, 1.91); facade.add(frame);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.19, 1.92), windowMaterial); glass.position.set(windowX, 1.72, 2.04); facade.add(glass);
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.36), new THREE.MeshBasicMaterial({ color: '#e8eadb', toneMapped: false }));
        poster.position.set(windowX, 1.72, 2.08); facade.add(poster);
        loader.load(shop.poster, (texture) => {
          if (disposed) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace; loadedTextures.push(texture);
          const previous = poster.material as THREE.MeshBasicMaterial;
          poster.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }); previous.dispose();
          renderer.render(scene, camera);
        });
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.22, 3.85), trimMaterial); roof.position.y = 5.29; facade.add(roof);
      const glow = new THREE.PointLight(i % 2 ? '#c9ef68' : '#edc69d', 2, 10); glow.position.set(shop.x > 0 ? -1 : 1, 2.5, 2.7); facade.add(glow);
    }

    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 4.1, 8), trimMaterial);
    for (const z of [1, -6, -13]) for (const x of [-3.15, 3.15]) {
      const pole = lampPole.clone(); pole.position.set(x, 1.55, z); root.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: '#d9f0a5', toneMapped: false }));
      bulb.position.set(x, 3.7, z); root.add(bulb);
    }
    for (const [x, z] of [[-8.5, -4], [8.5, -5], [-8.4, -13], [8.3, -14]]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.23, 1.6, 8), buildingMaterial); trunk.position.set(x, 0.25, z); root.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), new THREE.MeshStandardMaterial({ color: '#334b38', roughness: 1 })); crown.position.set(x, 1.45, z); root.add(crown);
    }
    const displayHoodie = makeWorldGarment('#53674e'); displayHoodie.scale.setScalar(0.52); displayHoodie.position.set(0.15, 1.1, -4.5); displayHoodie.rotation.y = -0.12; root.add(displayHoodie);

    const raycaster = new THREE.Raycaster();
    const setHovered = (destination: WorldDestinationId | null) => {
      for (const target of hotspots) {
        const active = target.userData.destination === destination;
        const sign = target.userData.sign as THREE.Mesh | null;
        if (sign) (sign.material as THREE.MeshBasicMaterial).color.set(active ? '#ffffff' : '#c9ef68');
      }
      renderer.domElement.style.cursor = destination ? 'pointer' : 'grab';
      renderer.render(scene, camera);
    };
    const hitTest = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const target = raycaster.intersectObjects(hotspots, false)[0]?.object as THREE.Mesh | undefined;
      return target?.userData.destination as WorldDestinationId | undefined;
    };
    let hovered: WorldDestinationId | null = null;
    let compactView = false;
    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const nx = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const ny = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      camera.position.x = reduced ? 0 : nx * (compactView ? 0.18 : 0.42);
      camera.position.y = (compactView ? 3.45 : 3.1) - (reduced ? 0 : ny * 0.13);
      camera.lookAt(nx * (reduced ? 0 : compactView ? 0.08 : 0.18), 1.1, -5.5);
      const hit = hitTest(event) ?? null;
      if (hit !== hovered) { hovered = hit; setHovered(hit); }
      else renderer.render(scene, camera);
    };
    const onPointerLeave = () => { hovered = null; camera.position.set(0, compactView ? 3.45 : 3.1, compactView ? 17 : 11.8); camera.lookAt(0, 1.1, -5.5); setHovered(null); };
    const onPointerUp = (event: PointerEvent) => { const destination = hitTest(event); if (destination) callbackRef.current(destination); };
    const onScroll = () => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const progress = THREE.MathUtils.clamp((window.innerHeight - bounds.top) / (window.innerHeight + bounds.height), 0, 1);
      root.position.y = Math.sin(progress * Math.PI) * -0.12;
      camera.position.z = (compactView ? 17 : 11.8) - progress * (compactView ? 0.9 : 1.3);
      camera.lookAt(0, 1.1, -5.5);
      renderer.render(scene, camera);
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect(); const width = Math.max(1, bounds.width); const height = Math.max(1, bounds.height);
      compactView = width < 680;
      root.scale.x = compactView ? 0.78 : 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); renderer.setSize(width, height, false);
      camera.fov = compactView ? 49 : 42; camera.position.set(0, compactView ? 3.45 : 3.1, compactView ? 17 : 11.8);
      camera.aspect = width / height; camera.updateProjectionMatrix(); camera.lookAt(0, 1.1, -5.5); renderer.render(scene, camera);
    };
    canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerleave', onPointerLeave); canvas.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', resize); window.addEventListener('scroll', onScroll, { passive: true });
    resize(); sceneRef.current = { renderer, scene, camera, root, raycaster, hotspots };
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove); canvas.removeEventListener('pointerleave', onPointerLeave); canvas.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', resize); window.removeEventListener('scroll', onScroll);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => { if ('map' in material && material.map) material.map.dispose(); material.dispose(); });
        }
      });
      disposed = true;
      loadedTextures.forEach((texture) => texture.dispose());
      [groundMaterial, roadMaterial, curbMaterial, buildingMaterial, trimMaterial, windowMaterial].forEach((material) => material.dispose());
      renderer.dispose(); sceneRef.current = null;
    };
  }, []);

  return <div className={`world-stage ${unsupported ? 'world-stage-fallback' : ''}`} aria-hidden="true">
    {!unsupported ? <canvas ref={canvasRef} /> : <div className="world-fallback-scene"><span>CREWWW</span><i /><b>THE BLOCK / FIRST RUN</b></div>}
  </div>;
}
