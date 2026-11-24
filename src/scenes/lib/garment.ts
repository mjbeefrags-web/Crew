import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
} from "three";

export type GarmentModel = {
  group: Group;
  backPrint: Mesh | null;
  chestMark: Mesh | null;
  bodyMaterial: MeshPhysicalMaterial;
  ribMaterial: MeshStandardMaterial;
};

function makeFabricBump() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#808080";
  context.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    context.strokeStyle =
      y % 8 === 0 ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)";
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(256, y + 0.5);
    context.stroke();
  }
  for (let x = 0; x < 256; x += 4) {
    context.strokeStyle = "rgba(0,0,0,.07)";
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, 256);
    context.stroke();
  }
  for (let i = 0; i < 2400; i += 1) {
    const shade = Math.random() > 0.5 ? 255 : 0;
    context.fillStyle = `rgba(${shade},${shade},${shade},.06)`;
    context.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

/**
 * A more considered procedural hoodie than the original flat silhouette:
 * beveled shell, hood opening, ribbing, stitched pocket, cords and separate
 * print planes so a real design plate can be mapped to the back at runtime.
 */
export function createHoodieModel(color: string): GarmentModel {
  const group = new Group();
  const bump = makeFabricBump();
  const bodyMaterial = new MeshPhysicalMaterial({
    color,
    roughness: 0.86,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.85,
    bumpMap: bump ?? undefined,
    bumpScale: 0.018,
    side: DoubleSide,
  });
  const ribMaterial = new MeshStandardMaterial({
    color: new Color(color).multiplyScalar(0.72),
    roughness: 0.94,
  });
  const seamMaterial = new LineBasicMaterial({
    color: new Color(color).multiplyScalar(0.5),
    transparent: true,
    opacity: 0.65,
  });

  const silhouette = new Shape();
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
  const shellGeometry = new ExtrudeGeometry(silhouette, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.045,
    curveSegments: 14,
  });
  const shell = new Mesh(shellGeometry, bodyMaterial);
  shell.position.z = -0.07;
  group.add(shell);

  const hoodShape = new Shape();
  hoodShape.moveTo(-0.4, 1.18);
  hoodShape.quadraticCurveTo(-0.44, 1.8, 0, 1.84);
  hoodShape.quadraticCurveTo(0.44, 1.8, 0.4, 1.18);
  hoodShape.quadraticCurveTo(0, 1.42, -0.4, 1.18);
  const hood = new Mesh(
    new ExtrudeGeometry(hoodShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    }),
    ribMaterial,
  );
  hood.position.z = -0.11;
  group.add(hood);

  const hoodOpening = new Mesh(
    new CircleGeometry(0.26, 24),
    new MeshStandardMaterial({
      color: new Color(color).multiplyScalar(0.22),
      roughness: 1,
    }),
  );
  hoodOpening.scale.set(1, 0.62, 1);
  hoodOpening.position.set(0, 1.53, 0.09);
  group.add(hoodOpening);

  const cuffGeometry = new BoxGeometry(0.31, 0.24, 0.23);
  const rightCuff = new Mesh(cuffGeometry, ribMaterial);
  rightCuff.position.set(1.31, -0.39, 0.015);
  rightCuff.rotation.z = -0.22;
  group.add(rightCuff);
  const leftCuff = new Mesh(cuffGeometry, ribMaterial);
  leftCuff.position.set(-1.31, -0.39, 0.015);
  leftCuff.rotation.z = 0.22;
  group.add(leftCuff);
  const hem = new Mesh(new BoxGeometry(1.04, 0.2, 0.22), ribMaterial);
  hem.position.set(0, -0.83, 0.015);
  group.add(hem);

  const pocketShape = new Shape();
  pocketShape.moveTo(-0.34, 0.08);
  pocketShape.lineTo(0.34, 0.08);
  pocketShape.lineTo(0.28, -0.3);
  pocketShape.quadraticCurveTo(0, -0.42, -0.28, -0.3);
  pocketShape.closePath();
  const pocket = new Mesh(new ShapeGeometry(pocketShape), ribMaterial);
  pocket.position.set(0, -0.24, 0.175);
  group.add(pocket);
  const pocketOutline = new LineSegments(
    new EdgesGeometry(pocket.geometry),
    seamMaterial,
  );
  pocketOutline.position.copy(pocket.position);
  group.add(pocketOutline);

  const drawstringMaterial = new MeshStandardMaterial({
    color: "#ddd4c2",
    roughness: 0.8,
  });
  for (const x of [-0.13, 0.13]) {
    const curve = new CatmullRomCurve3([
      new Vector3(x, 1.14, 0.11),
      new Vector3(x * 1.2, 0.98, 0.2),
      new Vector3(x * 0.9, 0.74, 0.2),
    ]);
    group.add(
      new Mesh(
        new TubeGeometry(curve, 12, 0.012, 6, false),
        drawstringMaterial,
      ),
    );
  }

  const backPrint = new Mesh(
    new PlaneGeometry(0.92, 1.16),
    new MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      toneMapped: false,
      side: DoubleSide,
    }),
  );
  backPrint.position.set(0, 0.12, -0.16);
  backPrint.rotation.y = Math.PI;
  backPrint.visible = false;
  group.add(backPrint);

  const chestMark = new Mesh(
    new PlaneGeometry(0.44, 0.2),
    new MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      toneMapped: false,
      side: DoubleSide,
    }),
  );
  chestMark.position.set(0, 0.62, 0.185);
  chestMark.visible = false;
  group.add(chestMark);

  return { group, backPrint, chestMark, bodyMaterial, ribMaterial };
}
