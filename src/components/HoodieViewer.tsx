import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type HoodieViewerProps = { color: string; label: string };

function makePrintTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#f1ead9';
  context.textAlign = 'center';
  context.font = '900 53px Arial, sans-serif';
  context.fillText('CREWWW', 256, 144);
  context.font = '700 22px Arial, sans-serif';
  context.letterSpacing = '8px';
  context.fillText('STREET DEPT. / 01', 256, 185);
  context.strokeStyle = '#f1ead9';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(96, 222); context.lineTo(416, 222);
  context.moveTo(126, 258); context.lineTo(386, 258);
  context.stroke();
  for (const [x, y, radius] of [[96, 96, 14], [411, 112, 10], [154, 296, 9], [366, 305, 14]]) {
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function createHoodie(color: string) {
  const garment = new THREE.Group();
  const fabric = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 });
  const rib = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.72), roughness: 0.92 });
  const frontZ = 0.16;

  const silhouette = new THREE.Shape();
  silhouette.moveTo(-0.53, -0.91);
  silhouette.lineTo(0.53, -0.91);
  silhouette.lineTo(0.56, 0.55);
  silhouette.lineTo(0.82, 0.73);
  silhouette.lineTo(1.18, -0.44);
  silhouette.quadraticCurveTo(1.34, -0.59, 1.49, -0.43);
  silhouette.lineTo(1.18, 0.88);
  silhouette.quadraticCurveTo(1.04, 1.06, 0.82, 1.05);
  silhouette.lineTo(0.57, 0.92);
  silhouette.lineTo(0.46, 1.22);
  silhouette.lineTo(0.43, 1.42);
  silhouette.quadraticCurveTo(0, 1.67, -0.43, 1.42);
  silhouette.lineTo(-0.46, 1.22);
  silhouette.lineTo(-0.57, 0.92);
  silhouette.lineTo(-0.82, 1.05);
  silhouette.quadraticCurveTo(-1.04, 1.06, -1.18, 0.88);
  silhouette.lineTo(-1.49, -0.43);
  silhouette.quadraticCurveTo(-1.34, -0.59, -1.18, -0.44);
  silhouette.lineTo(-0.82, 0.73);
  silhouette.lineTo(-0.56, 0.55);
  silhouette.closePath();
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(silhouette, { depth: 0.12, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.035, bevelThickness: 0.035 }), fabric);
  shell.position.z = -0.06;
  garment.add(shell);

  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-0.39, 1.19);
  hoodShape.quadraticCurveTo(-0.43, 1.78, 0, 1.82);
  hoodShape.quadraticCurveTo(0.43, 1.78, 0.39, 1.19);
  hoodShape.quadraticCurveTo(0, 1.39, -0.39, 1.19);
  const hood = new THREE.Mesh(new THREE.ExtrudeGeometry(hoodShape, { depth: 0.16, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.025, bevelThickness: 0.025 }), rib);
  hood.position.z = -0.1;
  garment.add(hood);

  const cuffGeometry = new THREE.BoxGeometry(0.29, 0.22, 0.19);
  const rightCuff = new THREE.Mesh(cuffGeometry, rib); rightCuff.position.set(1.31, -0.39, 0.015); rightCuff.rotation.z = -0.22; garment.add(rightCuff);
  const leftCuff = new THREE.Mesh(cuffGeometry, rib); leftCuff.position.set(-1.31, -0.39, 0.015); leftCuff.rotation.z = 0.22; garment.add(leftCuff);

  const hem = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.18, 0.19), rib);
  hem.position.set(0, -0.83, 0.015); garment.add(hem);
  const pocketShape = new THREE.Shape();
  pocketShape.moveTo(-0.34, 0.08); pocketShape.lineTo(0.34, 0.08); pocketShape.lineTo(0.28, -0.3); pocketShape.quadraticCurveTo(0, -0.42, -0.28, -0.3); pocketShape.closePath();
  const pocket = new THREE.Mesh(new THREE.ShapeGeometry(pocketShape), rib);
  pocket.position.set(0, -0.24, frontZ); garment.add(pocket);

  const printTexture = makePrintTexture();
  if (printTexture) {
    const print = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.56), new THREE.MeshBasicMaterial({ map: printTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    print.position.set(0, 0.41, frontZ + 0.012); garment.add(print);
  }
  const drawstring = new THREE.MeshStandardMaterial({ color: '#e8dfce', roughness: 0.8 });
  for (const x of [-0.13, 0.13]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.48, 8), drawstring);
    cord.position.set(x, 0.88, frontZ + 0.035); garment.add(cord);
  }
  return garment;
}

export function HoodieViewer({ color, label }: HoodieViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<{ garment: THREE.Group; renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!window.WebGLRenderingContext && !window.WebGL2RenderingContext) {
      setUnsupported(true);
      return undefined;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      setUnsupported(true);
      return undefined;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    camera.position.set(0, 0.18, 7.4);
    scene.add(new THREE.HemisphereLight('#ffffff', '#33303b', 2));
    const key = new THREE.DirectionalLight('#fff6e6', 3.2); key.position.set(-3.5, 4.2, 5); scene.add(key);
    const rim = new THREE.DirectionalLight('#d5d2ff', 2.2); rim.position.set(4, 1.5, -3); scene.add(rim);
    const garment = createHoodie(color);
    garment.rotation.y = rotation;
    scene.add(garment);
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width); const height = Math.max(1, bounds.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    resize();
    window.addEventListener('resize', resize);
    sceneRef.current = { garment, renderer, scene, camera };
    return () => {
      window.removeEventListener('resize', resize);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => { if ('map' in material && material.map) material.map.dispose(); material.dispose(); });
        }
      });
      renderer.dispose();
      sceneRef.current = null;
    };
  // The garment material changes when the color variant changes, so rebuild and dispose scene resources.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.garment.rotation.y = rotation;
      sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
    }
  }, [rotation]);

  const turn = (direction: number) => setRotation((value) => value + direction * Math.PI / 4);
  return <div className="hoodie-viewer" role="group" aria-label={`${label} 3D product viewer`}>
    {!unsupported ? <canvas ref={canvasRef} aria-label={`${label}, rotate by dragging`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragX = String(event.clientX); }} onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const last = Number(event.currentTarget.dataset.dragX ?? event.clientX); const delta = event.clientX - last; event.currentTarget.dataset.dragX = String(event.clientX); setRotation((value) => value + delta * 0.008); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} /> : <div className="viewer-unavailable">3D preview is unavailable in this browser.</div>}
    {!unsupported && <div className="viewer-controls"><button type="button" aria-label="Rotate hoodie left" onClick={() => turn(-1)}>↶</button><span>DRAG TO ROTATE</span><button type="button" aria-label="Rotate hoodie right" onClick={() => turn(1)}>↷</button><button type="button" aria-label="Reset hoodie view" onClick={() => setRotation(0)}>RESET</button></div>}
    <span className="viewer-caption">ILLUSTRATIVE 3D GARMENT / CREWWW STUDY 01</span>
  </div>;
}
