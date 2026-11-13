// The atrium of the John Innes Community Recreation Centre, rebuilt as simple planes and
// boxes from MJMA's art extents diagrams (231219, sheets A01 to A03) and their interior
// render. It is an approximation for sense of place and scale, not a survey: levels,
// grid spacing, the art zone and the wood block come from the drawings; the facade
// pattern, the stair and everything east of grid 4 are read off the render by eye.
//
// Axes, in metres. The origin is on the Level 2 floor under the centre of the art zone.
//   x  east. The sculpture's 8 m length runs along it.
//   y  up. 0 is the Level 2 floor (the breakout lounge).
//   z  south. The glazed facade (grid H) is at +z, the corridors (grid G) at -z.
import * as THREE from 'three';

// Levels above the Level 2 floor
export const L = { lobby: -5, level3: 5, level4: 10, ceiling: 13.5, soffit: 3.5 };
// Plan
export const P = {
  west: -5.6,     // inner face of the west wall, by grid 2
  east: 20,       // where the model stops; the atrium carries on
  edge: 3.13,     // east edge of the lounge floor, open to the lobby beyond
  gridG: -2.66,   // north edge of the atrium: corridor glazing above, open at Level 2
  north: -6.3,    // back wall of the corridors (grid F)
  glass: 4.4,     // south glazing at Level 2
  gridH: 3.29,
  bays: [-3.7, 1.3, 6.3, 11.3, 16.3], // beam lines, 5 m apart; the first two carry the work
};
// The wood block in the lounge, straight under the work
export const BLOCK = { x0: -3.36, x1: 0.63, z0: -1.36, z1: 0.63, h: 0.85 };

// Where a visitor can walk on Level 2
export const WALK = [
  { x0: P.west + 0.5, x1: P.edge - 0.45, z0: P.gridG, z1: 3.3 },        // lounge
  { x0: P.west + 0.5, x1: P.east - 1.5, z0: P.north + 0.5, z1: P.gridG }, // corridor
];

const WOOD = 0xc79c68;
const GLULAM = 0xe0bd8a;
const GAP = 0x7a5d3c;

function slatTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = `#${GAP.toString(16)}`;
  g.fillRect(0, 0, 64, 64);
  const grad = g.createLinearGradient(0, 0, 53, 0);
  grad.addColorStop(0, '#b98d5b');
  grad.addColorStop(0.5, '#d2a874');
  grad.addColorStop(1, '#c0935f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 53, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function tileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4b4c4f';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#2f3032';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildRoom(scene, renderer) {
  const room = new THREE.Group();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const slatBase = slatTexture();
  slatBase.anisotropy = aniso;
  const tileBase = tileTexture();
  tileBase.anisotropy = aniso;
  const PITCH = 0.09; // one slat and its gap

  const mats = {
    glulam: new THREE.MeshStandardMaterial({ color: GLULAM, roughness: 0.75 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.9 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 }),
    block: new THREE.MeshStandardMaterial({ color: 0xd9b888, roughness: 0.7 }),
    // Interior glazing, to the corridors: nearly clear
    glass: new THREE.MeshStandardMaterial({
      color: 0xdfeee9, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.14,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  };
  // Slats: `along` is the direction the slats repeat in, 'u' (across the width) or 'v'.
  const slats = (w, h, along = 'u') => {
    const map = slatBase.clone();
    if (along === 'u') map.repeat.set(w / PITCH, 1);
    else { map.rotation = Math.PI / 2; map.repeat.set(h / PITCH, 1); }
    map.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide });
  };
  const tiles = (w, d) => {
    const map = tileBase.clone();
    map.repeat.set(w / 1.2, d / 1.2);
    map.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.55 });
  };
  const add = (mesh) => { room.add(mesh); return mesh; };
  const box = (x0, x1, y0, y1, z0, z1, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m);
  };
  // A vertical plane facing along z (wall running east-west) or along x (north-south).
  const wallZ = (x0, x1, y0, y1, z, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    return add(m);
  };
  const wallX = (z0, z1, y0, y1, x, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), mat);
    m.rotation.y = Math.PI / 2;
    m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m);
  };
  const flat = (x0, x1, z0, z1, y, mat, up = true) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
    m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    return add(m);
  };
  // A timber member between two points.
  const Y = new THREE.Vector3(0, 1, 0);
  const member = (a, b, w = 0.36, d = 0.5, mat = mats.glulam) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, dir.length(), d), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(Y, dir.clone().normalize());
    return add(m);
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);

  // Floors
  flat(P.west, P.edge, P.gridG, P.glass, 0, tiles(P.edge - P.west, P.glass - P.gridG));          // lounge
  flat(P.west, P.east, P.north, P.gridG, 0, tiles(P.east - P.west, P.gridG - P.north));          // Level 2 corridor
  flat(P.edge, P.east, P.gridG, P.glass, L.lobby, tiles(P.east - P.edge, P.glass - P.gridG));    // lobby, Level 1
  box(P.west, P.edge, -0.4, -0.001, P.gridG, P.glass, mats.white);                                // slab under the lounge
  wallX(P.gridG, P.glass, L.lobby, -0.4, P.edge, mats.white);                                     // lobby wall under its edge
  // The lounge's east edge: a solid guard, open where the stair arrives
  box(P.edge - 0.12, P.edge, 0, 1.1, -1.0, P.glass, mats.black);
  // The stair down to the lobby, along the north side (placed by eye from the render)
  const steps = 29;
  for (let i = 0; i < steps; i += 1) {
    const x0 = P.edge + i * 0.28;
    const top = -(i + 1) * (5 / steps);
    box(x0, x0 + 0.28, top - 0.5, top, -2.5, -1.1, mats.black);
  }

  // The wood block and its low bench, from the two sections
  box(BLOCK.x0, BLOCK.x1, 0, BLOCK.h, BLOCK.z0, BLOCK.z1, mats.block);
  box(BLOCK.x0 + 0.4, BLOCK.x1 - 0.4, 0, 0.42, BLOCK.z0 - 0.5, BLOCK.z0, mats.block);

  // Ceiling: wood boards running east-west at the Level 4 ceiling
  flat(P.west, P.east, P.north, 2.6, L.ceiling, slats(P.east - P.west, 2.6 - P.north, 'v'), false);

  // North side (grid G): open to the corridor at Level 2, then slatted spandrels and
  // the glazing of the Level 3 corridor and the Level 4 track
  const band = (y0, y1) => wallZ(P.west, P.east, y0, y1, P.gridG, slats(P.east - P.west, y1 - y0));
  band(L.soffit, L.level3 + 0.35);
  band(L.level4 - 1.7, L.level4 + 0.6);
  wallZ(P.west, P.east, L.level3 + 0.35, L.level4 - 1.7, P.gridG, mats.glass);
  wallZ(P.west, P.east, L.level4 + 0.6, L.ceiling, P.gridG, mats.glass);
  for (const y of [L.level3 + 0.35, L.level4 - 1.7, L.level4 + 0.6]) {
    box(P.west, P.east, y - 0.05, y + 0.05, P.gridG - 0.04, P.gridG + 0.04, mats.black);
  }
  for (const x of P.bays) box(x - 0.15, x + 0.15, x < P.edge ? 0 : L.lobby, L.soffit, P.gridG - 0.15, P.gridG + 0.15, mats.white);
  // Corridors behind it
  wallZ(P.west, P.east, L.lobby, L.ceiling, P.north, mats.white);
  flat(P.west, P.east, P.north, P.gridG, L.soffit, slats(P.east - P.west, P.gridG - P.north, 'v'), false);
  box(P.west, P.east, L.level3 - 0.4, L.level3, P.north, P.gridG, mats.white);
  flat(P.west, P.east, P.north, P.gridG, L.level3 + 0.002, tiles(P.east - P.west, P.gridG - P.north));
  box(P.west, P.east, L.level4 - 0.4, L.level4, P.north, P.gridG, mats.white);
  flat(P.west, P.east, P.north, P.gridG, L.level4 + 0.002, tiles(P.east - P.west, P.gridG - P.north));
  wallX(P.north, P.gridG, 0, L.ceiling, P.west, mats.white);

  // South side (grid H): glazing at Level 2, then a slatted wall that leans in as it
  // rises, cut by tall window slots, with the V-shaped timber columns in front of it
  wallZ(P.west, P.edge, 0, 3.3, P.glass, mats.glass);
  wallZ(P.edge, P.east, L.lobby, 3.3, P.glass, mats.glass);
  flat(P.west, P.east, 3.6, P.glass, 3.35, slats(P.east - P.west, P.glass - 3.6, 'v'), false);
  const lean = { y0: 3.35, z0: 3.6, y1: L.ceiling, z1: 2.8 };
  const zAt = (y, inset = 0) => lean.z0 + ((y - lean.y0) / (lean.y1 - lean.y0)) * (lean.z1 - lean.z0) - inset;
  const leanLen = Math.hypot(lean.y1 - lean.y0, lean.z1 - lean.z0);
  const leanTilt = -Math.atan2(lean.z0 - lean.z1, lean.y1 - lean.y0);
  const leaning = (x0, x1, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, leanLen), mat);
    m.rotation.x = leanTilt;
    m.position.set((x0 + x1) / 2, (lean.y0 + lean.y1) / 2, (lean.z0 + lean.z1) / 2);
    return add(m);
  };
  for (let x = P.west; x < P.east; x += 2.5) {
    const solid = Math.min(x + 1.95, P.east);
    leaning(x, solid, slats(solid - x, leanLen));
    if (solid < P.east) leaning(solid, Math.min(x + 2.5, P.east), mats.glass);
  }
  for (const x of P.bays) {
    const foot = x < P.edge ? 0 : L.lobby;
    const node = v(x, 1.2, zAt(1.2, 0.4));
    member(v(x, foot, zAt(1.2, 0.4)), node);
    member(node, v(x - 2.5, L.ceiling, zAt(L.ceiling, 0.4)));
    member(node, v(x + 2.5, L.ceiling, zAt(L.ceiling, 0.4)));
  }

  // West end (grid 2): glazing at Level 2, a slatted band, then slat panels and glass,
  // with the Y-shaped column that shows in both sections
  wallX(P.gridG, P.glass, 0, 3.3, P.west, mats.glass);
  wallX(P.gridG, P.glass, 3.3, L.level3, P.west, slats(P.glass - P.gridG, L.level3 - 3.3));
  for (let z = P.gridG; z < 3.4; z += 1.9) {
    const solid = Math.min(z + 1.2, 3.4);
    wallX(z, solid, L.level3, L.ceiling, P.west, slats(solid - z, L.ceiling - L.level3));
    if (solid < 3.4) wallX(solid, Math.min(z + 1.9, 3.4), L.level3, L.ceiling, P.west, mats.glass);
  }
  const fork = v(-4.85, 4.8, 0.4);
  member(v(-4.85, 0, 0.4), fork, 0.4, 0.4);
  member(fork, v(-4.85, L.ceiling, 2.2), 0.4, 0.4);
  member(fork, v(-4.85, L.ceiling, -1.5), 0.4, 0.4);

  // East end of the model: glass, so the park carries on past it
  wallX(P.north, P.glass, L.lobby, L.ceiling, P.east, mats.glass);

  scene.add(room);
  return room;
}

/** Keeps a point on the Level 2 floor: inside the lounge or the corridor, off the block. */
export function keepOnFloor(x, z) {
  let best = null;
  for (const r of WALK) {
    const cx = Math.max(r.x0, Math.min(r.x1, x));
    const cz = Math.max(r.z0, Math.min(r.z1, z));
    const d = (cx - x) ** 2 + (cz - z) ** 2;
    if (!best || d < best.d) best = { x: cx, z: cz, d };
  }
  let { x: px, z: pz } = best;
  // Walk round the wood block, not through it
  const m = 0.35;
  const b = { x0: BLOCK.x0 - m, x1: BLOCK.x1 + m, z0: BLOCK.z0 - 0.5 - m, z1: BLOCK.z1 + m };
  if (px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1) {
    const out = [
      [px - b.x0, () => { px = b.x0; }],
      [b.x1 - px, () => { px = b.x1; }],
      [pz - b.z0, () => { pz = b.z0; }],
      [b.z1 - pz, () => { pz = b.z1; }],
    ].sort((p, q) => p[0] - q[0]);
    out[0][1]();
  }
  return { x: px, z: pz };
}
