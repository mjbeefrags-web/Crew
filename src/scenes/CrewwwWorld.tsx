import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createStage } from './lib/stage';
import { drops } from '../data/drops';
import { psychedelicPieces } from '../data/psychedelic';

export type WorldDestinationId = 'graphic' | 'outside' | 'city' | 'essentials';
export type WorldMode = 'cinematic' | 'explore';
export type CrewwwWorldProps = {
  onDestination: (destination: WorldDestinationId) => void;
  mode?: WorldMode;
  moveInput?: { x: number; z: number };
  onNearDestination?: (destination: WorldDestinationId | null) => void;
  /** 0–1 scroll position supplied by the page scrollytelling track. */
  progress?: number;
};

type Storefront = {
  id: WorldDestinationId;
  name: string;
  x: number;
  z: number;
  poster: string;
  plate: string;
  angle: string;
  world: string;
  accent: string;
};

const storefronts: Storefront[] = [
  { id: 'graphic', name: 'GRAPHIC HOODIES', x: -5.4, z: -2.2, poster: psychedelicPieces[0].photo ?? drops[0].plate, plate: psychedelicPieces[0].artwork, angle: psychedelicPieces[0].angles[0], world: psychedelicPieces[0].world.name, accent: psychedelicPieces[0].accent },
  { id: 'outside', name: 'OUTSIDE HOURS', x: 5.4, z: -2.2, poster: psychedelicPieces[1].photo ?? drops[1].plate, plate: psychedelicPieces[1].artwork, angle: psychedelicPieces[1].angles[0], world: psychedelicPieces[1].world.name, accent: psychedelicPieces[1].accent },
  { id: 'city', name: 'CITY NOTES', x: -4.7, z: -9.2, poster: psychedelicPieces[3].photo ?? drops[3].plate, plate: psychedelicPieces[3].artwork, angle: psychedelicPieces[3].angles[0], world: psychedelicPieces[3].world.name, accent: psychedelicPieces[3].accent },
  { id: 'essentials', name: 'ESSENTIALS', x: 4.7, z: -9.2, poster: psychedelicPieces[4].photo ?? drops[4].plate, plate: psychedelicPieces[4].artwork, angle: psychedelicPieces[4].angles[0], world: psychedelicPieces[4].world.name, accent: psychedelicPieces[4].accent },
];

function makeSignTexture(name: string, accent = '#c9ef68') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#111210'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accent; context.lineWidth = 3; context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  context.fillStyle = accent; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = name.length > 13 ? '700 46px Arial, sans-serif' : '700 62px Arial, sans-serif';
  context.fillText(`CREWWW  /  ${name}`, 512, 116, 940);
  context.fillStyle = '#e7e4d8'; context.font = '400 20px monospace';
  context.fillText('DISTRICT 02 · OPEN PORTAL', 512, 194, 900);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,.95)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,.34)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makePortalTexture(glyph: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(256, 256, 20, 256, 256, 256);
  gradient.addColorStop(0, '#23352a');
  gradient.addColorStop(0.62, '#101711');
  gradient.addColorStop(1, '#080a08');
  context.fillStyle = gradient; context.fillRect(0, 0, 512, 512);
  context.strokeStyle = '#c9ef6855'; context.lineWidth = 2;
  for (let ring = 0; ring < 5; ring += 1) {
    context.beginPath(); context.arc(256, 256, 62 + ring * 42, 0, Math.PI * 2); context.stroke();
  }
  context.fillStyle = '#c9ef68'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = '220px Georgia, serif';
  context.fillText(glyph, 256, 266);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makeParticleTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(226,255,173,1)');
  gradient.addColorStop(0.4, 'rgba(201,239,104,.55)');
  gradient.addColorStop(1, 'rgba(201,239,104,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
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

export function CrewwwWorld({ onDestination, mode = 'cinematic', moveInput, onNearDestination, progress }: CrewwwWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const callbackRef = useRef(onDestination);
  const modeRef = useRef(mode);
  const moveRef = useRef(moveInput ?? { x: 0, z: 0 });
  const nearRef = useRef(onNearDestination);
  const progressRef = useRef(progress);
  const [unsupported, setUnsupported] = useState(false);
  callbackRef.current = onDestination;
  modeRef.current = mode;
  moveRef.current = moveInput ?? { x: 0, z: 0 };
  nearRef.current = onNearDestination;
  progressRef.current = progress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101711');
    scene.fog = new THREE.Fog('#101711', 13, 36);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 3.1, 11.8);
    const lookTarget = new THREE.Vector3(0, 1.1, -5.5);
    camera.lookAt(lookTarget);
    const root = new THREE.Group(); scene.add(root);

    const disposables = new Set<{ dispose(): void }>();
    const track = <T extends { dispose(): void }>(item: T): T => { disposables.add(item); return item; };

    scene.add(new THREE.HemisphereLight('#d9e7d4', '#1a1e19', 2.25));
    const moon = new THREE.DirectionalLight('#c9d8c9', 3); moon.position.set(-5, 10, 8); scene.add(moon);
    const streetGlow = new THREE.PointLight('#d6efae', 2.1, 25); streetGlow.position.set(0, 5, -5); scene.add(streetGlow);
    const sweep = new THREE.PointLight('#e5ffb0', 1.5, 12); scene.add(sweep);

    const groundMaterial = track(new THREE.MeshStandardMaterial({ color: '#29302a', roughness: 0.94 }));
    const roadMaterial = track(new THREE.MeshPhysicalMaterial({
      color: '#0d110f', roughness: 0.28, metalness: 0.24,
      clearcoat: 0.9, clearcoatRoughness: 0.19,
    }));
    const curbMaterial = track(new THREE.MeshStandardMaterial({ color: '#66715d', roughness: 0.8 }));
    const buildingMaterial = track(new THREE.MeshStandardMaterial({ color: '#2c372e', roughness: 0.86 }));
    const trimMaterial = track(new THREE.MeshStandardMaterial({ color: '#6e8063', roughness: 0.66, metalness: 0.12 }));
    const windowMaterial = track(new THREE.MeshStandardMaterial({ color: '#d5e7bc', emissive: '#78925d', emissiveIntensity: 1.25, roughness: 0.25 }));
    const floorGeo = track(new THREE.PlaneGeometry(30, 44));
    const roadGeo = track(new THREE.PlaneGeometry(8.8, 42));
    const pavementGeo = track(new THREE.PlaneGeometry(1.1, 42));
    const dashGeo = track(new THREE.BoxGeometry(0.09, 0.012, 1.15));
    const floor = new THREE.Mesh(floorGeo, groundMaterial); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.48, -8); root.add(floor);
    const road = new THREE.Mesh(roadGeo, roadMaterial); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.44, -8); root.add(road);
    for (const x of [-4.9, 4.9]) {
      const pavement = new THREE.Mesh(pavementGeo, curbMaterial); pavement.rotation.x = -Math.PI / 2; pavement.position.set(x, -0.42, -8); root.add(pavement);
    }
    for (let z = 3; z > -26; z -= 4) {
      const dash = new THREE.Mesh(dashGeo, trimMaterial); dash.position.set(0, -0.42, z); root.add(dash);
    }
    const centreLight = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.12, 40)),
      track(new THREE.MeshBasicMaterial({ color: '#c9ef68', transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })),
    );
    centreLight.rotation.x = -Math.PI / 2; centreLight.position.set(0, -0.415, -8); root.add(centreLight);
    const glowTexture = makeGlowTexture();
    if (glowTexture) track(glowTexture);
    const lightPools: THREE.Mesh[] = [];
    for (const z of [1, -6, -13, -20]) for (const x of [-3.15, 3.15]) {
      const pool = new THREE.Mesh(
        track(new THREE.PlaneGeometry(3.2, 3.2)),
        track(new THREE.MeshBasicMaterial({
          map: glowTexture ?? undefined, color: '#d9f0a5', transparent: true,
          opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        })),
      );
      pool.rotation.x = -Math.PI / 2; pool.position.set(x, -0.412, z); root.add(pool); lightPools.push(pool);
    }

    const hotspots: THREE.Mesh[] = [];
    const signs: THREE.Mesh[] = [];
    const glows: { light: THREE.PointLight; base: number; phase: number }[] = [];
    const loader = new THREE.TextureLoader();
    const buildingGeo = track(new THREE.BoxGeometry(5.1, 5.8, 3.6));
    const signGeo = track(new THREE.PlaneGeometry(3.75, 0.84));
    const hotspotGeo = track(new THREE.BoxGeometry(3.6, 0.9, 0.2));
    const frameGeo = track(new THREE.BoxGeometry(1.48, 2.24, 0.22));
    const glassGeo = track(new THREE.PlaneGeometry(1.19, 1.92));
    const posterGeo = track(new THREE.PlaneGeometry(0.92, 1.36));
    const roofGeo = track(new THREE.BoxGeometry(5.35, 0.22, 3.85));

    for (let i = 0; i < storefronts.length; i += 1) {
      const shop = storefronts[i];
      const facade = new THREE.Group(); facade.position.set(shop.x, 0, shop.z); root.add(facade);
      const building = new THREE.Mesh(buildingGeo, buildingMaterial); building.position.y = 2.35; facade.add(building);
      const signTexture = makeSignTexture(shop.world, shop.accent);
      let signMesh: THREE.Mesh | null = null;
      if (signTexture) {
        track(signTexture);
        const signMaterial = track(new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false }));
        const sign = new THREE.Mesh(signGeo, signMaterial);
        sign.position.set(0, 4.55, 1.84); facade.add(sign); signMesh = sign; signs.push(sign);
      }
      const target = new THREE.Mesh(hotspotGeo, track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false })));
      target.position.set(0, 4.55, 1.91);
      target.userData.destination = shop.id;
      target.userData.sign = signMesh;
      facade.add(target); hotspots.push(target);
      for (const windowX of [-1.3, 1.3]) {
        const frame = new THREE.Mesh(frameGeo, trimMaterial); frame.position.set(windowX, 1.72, 1.91); facade.add(frame);
        const glass = new THREE.Mesh(glassGeo, windowMaterial); glass.position.set(windowX, 1.72, 2.04); facade.add(glass);
        const windowPoster = windowX < 0 ? shop.poster : shop.plate;
        const poster = new THREE.Mesh(posterGeo, track(new THREE.MeshBasicMaterial({ color: '#e8eadb', toneMapped: false })));
        poster.position.set(windowX, 1.72, 2.08); facade.add(poster);
        loader.load(windowPoster, (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          track(texture);
          const previous = poster.material as THREE.MeshBasicMaterial;
          poster.material = track(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
          previous.dispose(); disposables.delete(previous);
          stage?.requestRender();
        });
      }
      const anglePanel = new THREE.Mesh(posterGeo, track(new THREE.MeshBasicMaterial({ color: '#e8eadb', toneMapped: false })));
      anglePanel.scale.set(0.42, 0.3, 1);
      anglePanel.position.set(0, 3.35, 2.08);
      facade.add(anglePanel);
      loader.load(shop.angle, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        track(texture);
        const previous = anglePanel.material as THREE.MeshBasicMaterial;
        anglePanel.material = track(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
        previous.dispose(); disposables.delete(previous);
        stage?.requestRender();
      });
      const roof = new THREE.Mesh(roofGeo, trimMaterial); roof.position.y = 5.29; facade.add(roof);
      const glow = new THREE.PointLight(shop.accent, 2, 10);
      glow.position.set(shop.x > 0 ? -1 : 1, 2.5, 2.7); facade.add(glow);
      glows.push({ light: glow, base: 2, phase: i * 1.7 });
    }

    // The concept plates become roadside lightboxes: the artwork is world
    // architecture here, not a thumbnail hidden inside a product card.
    const artBoards: { group: THREE.Group; baseY: number; baseRotation: number; phase: number }[] = [];
    const artFrameGeo = track(new THREE.BoxGeometry(1.78, 2.38, 0.1));
    const artPlaneGeo = track(new THREE.PlaneGeometry(1.64, 2.24));
    const artGlowGeo = track(new THREE.PlaneGeometry(3.2, 3.8));
    const boardPositions = [
      [-3.3, 2.85, -3.4, 0.18], [3.3, 3.05, -6.4, -0.18],
      [-3.2, 2.75, -10.3, 0.14], [3.2, 2.95, -14.2, -0.14],
      [0, 3.35, -18.6, 0],
    ] as const;
    drops.forEach((drop, index) => {
      const [x, y, z, rotation] = boardPositions[index];
      const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = rotation; root.add(group);
      const frame = new THREE.Mesh(artFrameGeo, track(new THREE.MeshStandardMaterial({ color: '#171a16', roughness: 0.34, metalness: 0.58 })));
      group.add(frame);
      const aura = new THREE.Mesh(artGlowGeo, track(new THREE.MeshBasicMaterial({
        map: glowTexture ?? undefined, color: psychedelicPieces[index].accent, transparent: true,
        opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })));
      aura.position.z = -0.1; group.add(aura);
      const boardMaterial = track(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.94, side: THREE.DoubleSide, toneMapped: false }));
      const board = new THREE.Mesh(artPlaneGeo, boardMaterial); board.position.z = 0.055; group.add(board);
      loader.load(drop.plate, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; track(texture);
        boardMaterial.map = texture; boardMaterial.needsUpdate = true; stage?.requestRender();
      });
      artBoards.push({ group, baseY: y, baseRotation: rotation, phase: index * 1.35 });
    });

    const lampPoleGeo = track(new THREE.CylinderGeometry(0.045, 0.075, 4.1, 8));
    const bulbGeo = track(new THREE.SphereGeometry(0.16, 12, 10));
    const bulbMaterial = track(new THREE.MeshBasicMaterial({ color: '#d9f0a5', toneMapped: false }));
    for (const z of [1, -6, -13]) for (const x of [-3.15, 3.15]) {
      const pole = new THREE.Mesh(lampPoleGeo, trimMaterial); pole.position.set(x, 1.55, z); root.add(pole);
      const bulb = new THREE.Mesh(bulbGeo, bulbMaterial); bulb.position.set(x, 3.7, z); root.add(bulb);
    }
    const trunkGeo = track(new THREE.CylinderGeometry(0.17, 0.23, 1.6, 8));
    const crownGeo = track(new THREE.SphereGeometry(0.9, 12, 10));
    const crownMaterial = track(new THREE.MeshStandardMaterial({ color: '#334b38', roughness: 1 }));
    for (const [x, z] of [[-8.5, -4], [8.5, -5], [-8.4, -13], [8.3, -14]]) {
      const trunk = new THREE.Mesh(trunkGeo, buildingMaterial); trunk.position.set(x, 0.25, z); root.add(trunk);
      const crown = new THREE.Mesh(crownGeo, crownMaterial); crown.position.set(x, 1.45, z); root.add(crown);
    }
    const displayHoodie = makeWorldGarment('#53674e');
    displayHoodie.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        disposables.add(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => disposables.add(material));
      }
    });
    displayHoodie.scale.setScalar(0.52); displayHoodie.position.set(0.15, 1.1, -4.5); displayHoodie.rotation.y = -0.12; root.add(displayHoodie);

    // Later chapters of the scroll journey reveal floating garments and a portal.
    const floaters: { group: THREE.Group; baseY: number; phase: number }[] = [];
    for (const [x, y, z, scale] of [[-2.5, 2.5, -8.5, 0.36], [2.7, 3.1, -12.5, 0.32], [-1.9, 3.4, -16.5, 0.38]] as const) {
      const garment = makeWorldGarment('#8aa171');
      garment.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          disposables.add(object.geometry);
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => disposables.add(material));
        }
      });
      garment.position.set(x, y, z); garment.scale.setScalar(scale); root.add(garment);
      floaters.push({ group: garment, baseY: y, phase: z });
    }
    const portalMaterial = track(new THREE.MeshStandardMaterial({ color: '#c9ef68', emissive: '#c9ef68', emissiveIntensity: 1.5, roughness: 0.4 }));
    const portal = new THREE.Mesh(track(new THREE.TorusGeometry(1.55, 0.07, 10, 48)), portalMaterial);
    portal.position.set(0, 2.3, -20.5); root.add(portal);
    const portalTexture = makePortalTexture('✦');
    if (portalTexture) track(portalTexture);
    const portalDisc = new THREE.Mesh(
      track(new THREE.CircleGeometry(1.47, 48)),
      track(new THREE.MeshBasicMaterial({
        map: portalTexture ?? undefined, color: '#ffffff', transparent: true,
        opacity: 0.92, side: THREE.DoubleSide, toneMapped: false,
      })),
    );
    portalDisc.position.set(0, 2.3, -20.56); root.add(portalDisc);
    const portalLight = new THREE.PointLight('#c9ef68', 2.4, 15); portalLight.position.set(0, 2.3, -19.8); root.add(portalLight);
    const farSignTexture = makeSignTexture('THE EDIT');
    if (farSignTexture) {
      track(farSignTexture);
      const farSign = new THREE.Mesh(signGeo, track(new THREE.MeshBasicMaterial({ map: farSignTexture, toneMapped: false })));
      farSign.position.set(0, 4.5, -20.3); root.add(farSign);
    }

    const particleCount = 150;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 13;
      particlePositions[i * 3 + 1] = Math.random() * 7;
      particlePositions[i * 3 + 2] = 8 - Math.random() * 34;
      particleSpeeds[i] = 0.06 + Math.random() * 0.16;
    }
    const particleGeo = track(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleTexture = makeParticleTexture();
    if (particleTexture) track(particleTexture);
    const particleMaterial = track(new THREE.PointsMaterial({
      color: '#c9ef68', size: 0.13, map: particleTexture ?? undefined, transparent: true,
      opacity: 0.52, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    root.add(new THREE.Points(particleGeo, particleMaterial));

    const journey = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3.1, 11.8), new THREE.Vector3(-1.1, 2.8, 7.2),
      new THREE.Vector3(1.1, 2.35, 2.6), new THREE.Vector3(-0.7, 2.1, -2.2),
      new THREE.Vector3(0.6, 2.05, -6.4), new THREE.Vector3(-0.6, 2.15, -11),
      new THREE.Vector3(0.4, 2.35, -15.4), new THREE.Vector3(0, 2.6, -18.2),
    ]);
    const lookJourney = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.1, -5.5), new THREE.Vector3(-2.6, 1.7, -4.5),
      new THREE.Vector3(2.7, 2.1, -7), new THREE.Vector3(-1.8, 2.2, -10),
      new THREE.Vector3(1.6, 2.4, -13), new THREE.Vector3(-1.2, 2.5, -16),
      new THREE.Vector3(0, 2.5, -19), new THREE.Vector3(0, 2.3, -21),
    ]);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const walkPosition = new THREE.Vector3(0, 0, 6.5);
    const keys = new Set<string>();
    let yaw = 0;
    let pitch = -0.05;
    let scrollProgress = 0;
    let smoothProgress = 0;
    let firstFrame = true;
    let compactView = false;
    let hovered: WorldDestinationId | null = null;
    let nearby: WorldDestinationId | null = null;
    let pointerActive = false;
    let pointerMoved = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerLastX = 0;
    let pointerLastY = 0;

    const stage = createStage(canvas, {
      scene, camera,
      maxPixelRatio: 1.35,
      fps: 45,
      toneMapping: THREE.ACESFilmicToneMapping,
      visibilityTarget: canvas.parentElement ?? undefined,
      onResize: (width) => {
        compactView = width < 680;
        root.scale.x = compactView ? 0.78 : 1;
        camera.fov = compactView ? 49 : 42;
        camera.aspect = width / Math.max(1, canvas.clientHeight);
        camera.updateProjectionMatrix();
      },
      onFrame: (delta, elapsed) => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        // An external scrollytelling track owns the journey when supplied.
        if (progressRef.current !== undefined) scrollProgress = progressRef.current;
        smoothProgress += (scrollProgress - smoothProgress) * (1 - Math.exp(-delta * 4.5));

        if (modeRef.current === 'explore') {
          const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
          forward.y = 0; forward.normalize();
          const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          const xInput = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + moveRef.current.x;
          const zInput = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) + moveRef.current.z;
          const movement = forward.multiplyScalar(zInput).add(right.multiplyScalar(xInput));
          if (movement.lengthSq() > 0) {
            movement.normalize().multiplyScalar(delta * (keys.has('shift') ? 5.4 : 3.2));
            walkPosition.add(movement);
          }
          walkPosition.x = THREE.MathUtils.clamp(walkPosition.x, -3.35, 3.35);
          walkPosition.z = THREE.MathUtils.clamp(walkPosition.z, -22, 7);
          camera.position.set(walkPosition.x, 1.68, walkPosition.z);
          camera.rotation.set(pitch, yaw, 0, 'YXZ');

          let closest: WorldDestinationId | null = null;
          let closestDistance = 4.4;
          for (const shop of storefronts) {
            const distance = Math.hypot(walkPosition.x - shop.x, walkPosition.z - (shop.z + 2));
            if (distance < closestDistance) { closestDistance = distance; closest = shop.id; }
          }
          if (closest !== nearby) { nearby = closest; nearRef.current?.(closest); }
        } else {
          const position = journey.getPoint(THREE.MathUtils.clamp(smoothProgress, 0, 1));
          const target = lookJourney.getPoint(THREE.MathUtils.clamp(smoothProgress, 0, 1));
          const breathe = reduced ? 0 : Math.sin(elapsed * 0.45) * 0.09;
          const nextPosition = new THREE.Vector3(position.x + breathe, position.y + breathe * 0.4, position.z);
          if (firstFrame) {
            camera.position.copy(nextPosition);
            lookTarget.copy(target);
            firstFrame = false;
          } else {
            camera.position.lerp(nextPosition, 1 - Math.exp(-delta * 4));
            lookTarget.lerp(target, 1 - Math.exp(-delta * 4));
          }
          camera.lookAt(lookTarget);
        }

        if (!reduced) {
          const positions = particleGeo.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < particleCount; i += 1) {
            let y = positions.getY(i) + delta * particleSpeeds[i];
            if (y > 7) y = -0.4;
            positions.setY(i, y);
            positions.setX(i, positions.getX(i) + Math.sin(elapsed * 0.5 + i) * delta * 0.012);
          }
          positions.needsUpdate = true;
          for (const glow of glows) {
            const flicker = Math.sin(elapsed * 3.2 + glow.phase) * 0.12 + (Math.sin(elapsed * 17 + glow.phase) > 0.985 ? -0.45 : 0);
            glow.light.intensity = glow.base + flicker;
          }
          displayHoodie.rotation.y += delta * 0.16;
          displayHoodie.position.y = 1.1 + Math.sin(elapsed * 0.7) * 0.1;
          for (const floater of floaters) {
            floater.group.rotation.y += delta * 0.22;
            floater.group.position.y = floater.baseY + Math.sin(elapsed * 0.6 + floater.phase) * 0.22;
          }
          for (const board of artBoards) {
            board.group.position.y = board.baseY + Math.sin(elapsed * 0.72 + board.phase) * 0.11;
            board.group.rotation.y = board.baseRotation + Math.sin(elapsed * 0.38 + board.phase) * 0.035;
          }
          lightPools.forEach((pool, index) => {
            (pool.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(elapsed * 1.7 + index * 0.8) * 0.055;
          });
          portalDisc.rotation.z -= delta * 0.035;
          portal.rotation.z += delta * 0.08;
          portalMaterial.emissiveIntensity = 1.35 + Math.sin(elapsed * 1.6) * 0.28;
          sweep.position.set(0, 3.4, -20 + ((elapsed * 1.4) % 30));
        }
      },
    });
    if (!stage) { setUnsupported(true); return undefined; }

    const hitTest = (event: PointerEvent): WorldDestinationId | null => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const target = raycaster.intersectObjects(hotspots, false)[0]?.object as THREE.Mesh | undefined;
      return (target?.userData.destination as WorldDestinationId | undefined) ?? null;
    };
    const setHovered = (destination: WorldDestinationId | null) => {
      for (const target of hotspots) {
        const sign = target.userData.sign as THREE.Mesh | null;
        if (!sign) continue;
        (sign.material as THREE.MeshBasicMaterial).color.set(signs.indexOf(sign) >= 0 && target.userData.destination === destination ? '#ffffff' : '#c9ef68');
      }
      canvas.style.cursor = destination ? 'pointer' : modeRef.current === 'explore' ? 'crosshair' : 'grab';
      stage.requestRender();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (pointerActive) {
        const dx = event.clientX - pointerLastX;
        const dy = event.clientY - pointerLastY;
        if (Math.abs(event.clientX - pointerStartX) + Math.abs(event.clientY - pointerStartY) > 6) pointerMoved = true;
        if (modeRef.current === 'explore') {
          yaw -= dx * 0.0032;
          pitch = THREE.MathUtils.clamp(pitch - dy * 0.0032, -0.75, 0.6);
          stage.requestRender();
        }
        pointerLastX = event.clientX; pointerLastY = event.clientY;
      }
      const hit = modeRef.current === 'explore' ? nearby : hitTest(event);
      if (hit !== hovered) { hovered = hit; setHovered(hit); }
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerActive = true; pointerMoved = false;
      pointerStartX = pointerLastX = event.clientX;
      pointerStartY = pointerLastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.focus({ preventScroll: true });
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerActive) return;
      pointerActive = false;
      canvas.releasePointerCapture?.(event.pointerId);
      const hit = modeRef.current === 'explore' ? (nearby ?? hitTest(event)) : hitTest(event);
      if (hit && (!pointerMoved || modeRef.current === 'cinematic')) callbackRef.current(hit);
    };
    const onPointerLeave = () => {
      if (modeRef.current !== 'cinematic' || pointerActive) return;
      hovered = null; setHovered(null);
      onScroll();
      stage.requestRender();
    };
    const onScroll = () => {
      if (modeRef.current !== 'cinematic' || progressRef.current !== undefined) return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      // The hero is in normal flow: page top is the start of the journey,
      // and scrolling past the hero reaches the end.
      const heroTop = bounds.top + window.scrollY;
      scrollProgress = THREE.MathUtils.clamp((window.scrollY - heroTop) / Math.max(1, bounds.height), 0, 1);
      stage.requestRender();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (modeRef.current !== 'explore') return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      keys.add(key);
      if ((key === 'e' || key === 'enter') && (nearby || hovered)) callbackRef.current(nearby ?? hovered!);
      stage.requestRender();
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('blur', onBlur);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    smoothProgress = scrollProgress;

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('blur', onBlur);
      window.removeEventListener('scroll', onScroll);
      stage.dispose();
      disposables.forEach((item) => item.dispose());
      nearRef.current?.(null);
    };
  }, []);

  return <div className={`world-stage ${unsupported ? 'world-stage-fallback' : ''}`}>
    <canvas
      ref={canvasRef}
      tabIndex={0}
      aria-label="Crewww district. Choose Explore to walk with W A S D, drag to look around, and press E at a storefront."
      aria-hidden={unsupported ? true : undefined}
    />
    {unsupported && <div className="world-fallback-scene"><span>CREWWW</span><i /><b>THE BLOCK / FIRST RUN</b></div>}
  </div>;
}
