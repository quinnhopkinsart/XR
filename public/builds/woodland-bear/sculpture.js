import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/DRACOLoader.js';

// Woodland Be[AR]: a black body with colour parts standing off both of its sides in layers.
// models/woodland-bear.glb keeps every colour part as its own node, so each one floats here.
// The file is metres-agnostic: the sculpture is fitted to HEIGHT and stood on y = 0.
//
// Nesting, outside in:
//   anchor  where it stands, which way it faces, how big the visitor has made it
//   sway    the whole body leaning a little from its feet, and a slow rise and fall
//   fitted  the model scaled to HEIGHT, centred, feet on the ground, face turned to +z
export const HEIGHT = 1.5;          // metres, at 100%
export const SIZE = { min: 0.2, max: 3 };

const MODEL = './models/woodland-bear.glb';
// How far things move. All of it stops when motion is off.
const FLOAT = {
  spread: 0.09,   // layers breathe out and in along the axis they stand off the body on
  bob: 0.012,     // each part's own drift, as a share of the sculpture's height
  tilt: 0.07,     // radians, each part's own rocking
  sway: 0.012,    // radians, the whole sculpture from its feet
  lift: 0.012,    // metres at 100%, the whole sculpture rising and falling
};

// A steady pseudo-random number per part, so the motion is the same on every visit.
const hash = (i, salt) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
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
      turn: mesh.quaternion.clone(),
      off: local.x - midLocal.x,
      unit: size.y / mesh.parent.getWorldScale(tmp).y, // the sculpture's height in the parent's units
      speed: 0.5 + hash(i, 1) * 0.5,
      phase: hash(i, 2) * Math.PI * 2,
      phase2: hash(i, 3) * Math.PI * 2,
    };
  });
  const reach = Math.max(...parts.map((p) => Math.abs(p.off)), 1e-6);

  // Flat, glossy colour, as in the original. The body picks up the room in its black.
  meshes.forEach((m) => {
    m.material.envMapIntensity = 1;
    m.frustumCulled = false; // parts move off their bounds while floating
  });

  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let level = 1;   // 1 moving, 0 still: eased, so turning motion off settles instead of snapping
  let target = 1;

  function update(t, dt) {
    level += (target - level) * Math.min(1, dt * 3);
    const a = level;
    for (const p of parts) {
      const depth = Math.abs(p.off) / reach;
      // A wave that leaves the body and runs outward through the layers.
      const breath = Math.sin(t * 0.7 - depth * 2.2);
      const s = t * p.speed;
      p.mesh.position.set(
        p.home.x + a * (p.off * FLOAT.spread * breath + p.unit * FLOAT.bob * 0.6 * Math.sin(s * 0.8 + p.phase2)),
        p.home.y + a * p.unit * FLOAT.bob * Math.sin(s + p.phase),
        p.home.z + a * p.unit * FLOAT.bob * Math.cos(s * 0.9 + p.phase),
      );
      e.set(
        a * FLOAT.tilt * Math.sin(s * 0.7 + p.phase),
        a * FLOAT.tilt * 0.6 * Math.sin(s * 0.5 + p.phase2),
        a * FLOAT.tilt * Math.cos(s * 0.6 + p.phase2),
      );
      p.mesh.quaternion.copy(p.turn).multiply(q.setFromEuler(e));
    }
    sway.rotation.z = a * FLOAT.sway * Math.sin(t * 0.45);
    sway.rotation.x = a * FLOAT.sway * 0.6 * Math.sin(t * 0.33 + 1.3);
    sway.position.y = a * FLOAT.lift * (1 + Math.sin(t * 0.6));
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
