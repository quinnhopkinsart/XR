import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/DRACOLoader.js';

// Woodland Be[AR]: a black body with colour parts standing off both of its sides in layers.
// models/woodland-bear.glb keeps every colour part as its own node, so each layer can breathe out from the body here.
// The file is metres-agnostic: the sculpture is fitted to HEIGHT and stood on y = 0.
//
// Nesting, outside in:
//   anchor  where it stands, which way it faces, how big the visitor has made it
//   sway    kept as a spare level; nothing moves it now
//   fitted  the model scaled to HEIGHT, centred, feet on the ground, face turned to +z
export const HEIGHT = 1.5;          // metres, at 100%
export const SIZE = { min: 0.2, max: 3 };

const MODEL = './models/woodland-bear.glb';
// The motion is a breath on one axis: the colour layers move out from the body and back in,
// along the line they already stand off it on. Nothing bobs, rocks or sways.
const BREATH = {
  depth: 0.05,   // how far the layers travel, as a share of their distance from the body
  seconds: 5.5,  // one breath, out and in
  lag: 0.35,     // radians the outermost layer trails the innermost, so the breath rolls outward
};

export async function loadSculpture(onProgress) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('./vendor/draco/');
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(MODEL, (e) => {
    if (onProgress && e.total) onProgress(e.loaded / e.total);
  });
  draco.dispose();

  const model = gltf.scene;
  const anchor = new THREE.Group();
  const sway = new THREE.Group();
  const fitted = new THREE.Group();
  anchor.add(sway);
  sway.add(fitted);
  fitted.add(model);

  // The face reads from the model's -x side. Turn it to +z, toward the visitor.
  fitted.rotation.y = Math.PI / 2;
  fitted.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(fitted);
  const size = box.getSize(new THREE.Vector3());
  const k = HEIGHT / size.y;
  const centre = box.getCenter(new THREE.Vector3());
  fitted.scale.setScalar(k);
  fitted.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);

  // The parts: every mesh except the two black body meshes, named Body and Outline in the file.
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const body = meshes.filter((m) => /^(body|outline)/i.test(m.name) || /^(body|outline)/i.test(m.parent.name));
  const bodyBox = new THREE.Box3();
  body.forEach((m) => bodyBox.expandByObject(m));
  const mid = bodyBox.getCenter(new THREE.Vector3());

  const tmp = new THREE.Vector3();
  const parts = meshes.filter((m) => !body.includes(m)).map((mesh, i) => {
    const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    // In the model's own space the parts stand off the body along x.
    const local = mesh.parent.worldToLocal(tmp.copy(c)).clone();
    const midLocal = mesh.parent.worldToLocal(tmp.copy(mid)).clone();
    return {
      mesh,
      home: mesh.position.clone(),
      off: local.x - midLocal.x,
    };
  });
  const reach = Math.max(...parts.map((p) => Math.abs(p.off)), 1e-6);

  // Flat, glossy colour, as in the original. The body picks up the room in its black.
  meshes.forEach((m) => {
    m.material.envMapIntensity = 1;
    m.frustumCulled = false; // parts move off their bounds while floating
  });

  let level = 1;   // 1 moving, 0 still: eased, so turning motion off settles instead of snapping
  let target = 1;

  function update(t, dt) {
    level += (target - level) * Math.min(1, dt * 3);
    const w = (Math.PI * 2) / BREATH.seconds;
    for (const p of parts) {
      const depth = Math.abs(p.off) / reach;
      // In the model's own space the layers stand off the body along x, so only x moves.
      const breath = Math.sin(t * w - depth * BREATH.lag);
      p.mesh.position.x = p.home.x + level * p.off * BREATH.depth * breath;
    }
  }

  return {
    anchor,
    parts: parts.length,
    update,
    setMotion(on) { target = on ? 1 : 0; },
    still() { level = target = 0; },
  };
}

/** A soft round shadow that sits on the ground under the sculpture. */
export function makeShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.55)');
  grad.addColorStop(0.6, 'rgba(0,0,0,.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.004;
  mesh.renderOrder = -1;
  return mesh;
}
