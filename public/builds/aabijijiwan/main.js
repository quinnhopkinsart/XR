import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/RGBELoader.js';
import { buildRoom, keepOnFloor, L, P } from './room.js';

// Aabijijiwan hangs in the atrium of the John Innes Community Recreation Centre and you
// walk the Level 2 lounge under it, the way you will in the building. The camera stays at
// eye height. Drag to look, tap the floor to walk. The room is built in room.js.
//
// The model is in metres, Y up, with its lowest point at y = 0 and its cables ending
// at its highest point. These numbers set the work and the room:
//
// FOOTPRINT is the size the installed work takes up, in metres: length along the river,
// height from its lowest point to the ceiling fixing, and width. The model is fitted to
// it on each axis, so the viewer shows the installed size even where the export differs
// (Rev E measures 7.72 x 8.03 x 2.04, so the fit is small). Set FOOTPRINT to null to show the model as exported.
const FOOTPRINT = { length: 8, height: 8, width: 2 };
// PLATE_FLUSH hangs the work by its wooden suspension plate: the plate's top face sits
// flush with the ceiling and the steel posts above it disappear into the ceiling. The
// height of the lowest point then follows from the model. Set it to false to hang the
// work by CLEARANCE instead, with rods drawn up to the ceiling.
const PLATE_FLUSH = true;
const CLEARANCE = 5.0;   // metres from the floor to the lowest point, used when PLATE_FLUSH is false
const EYE = 1.6;         // metres, the visitor's eye height
const FIGURE = 1.7;      // metres, the figure standing under the work

const MODEL = './models/aabijijiwan.glb';
// What is outside the windows, and what the mirror tiles reflect: a 360 degree photo of
// a park. An .hdr or a plain equirectangular .jpg both work, so a panorama shot in Moss
// Park can replace this one. ENV_TURN spins it, in degrees, to put the open park to the south.
const ENV = './env/rooitou_park_1k.hdr';
const ENV_TURN = 0;
const canvas = document.getElementById('stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const framed = window.top !== window.self;

const css = getComputedStyle(document.documentElement);
const token = (name) => new THREE.Color(css.getPropertyValue(name).trim());
const GROUND = token('--ground');
const BLACK = token('--black');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(GROUND, 1);

const scene = new THREE.Scene();
// Until the park photo loads, and if it fails, the windows look onto the site's red ground.

// Reflections matter here: the mirror tiles need something to mirror.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

// The work reflects the room it hangs in, not the open park: once the room and the park
// are both there, one look around from the centre of the work becomes its reflections.
let work = null;
function reflectRoom() {
  if (!work) return;
  const target = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const probe = new THREE.CubeCamera(0.1, 120, target);
  probe.position.copy(centre);
  work.visible = false;
  probe.update(renderer, scene);
  work.visible = true;
  const env = pmrem.fromCubemap(target.texture).texture;
  target.dispose();
  work.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      m.envMap = env;
      m.envMapIntensity = 1.25;
      m.needsUpdate = true;
    }
  });
}

function usePark(tex) {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const turn = THREE.MathUtils.degToRad(ENV_TURN);
  scene.background = tex;
  scene.backgroundRotation.y = turn;
  scene.environment = tex;
  scene.environmentRotation.y = turn;
  scene.environmentIntensity = 1.0;
  reflectRoom();
}
if (/\.hdr$/i.test(ENV)) {
  new RGBELoader().load(ENV, usePark, undefined, (e) => console.warn('Park photo did not load', e));
} else {
  new THREE.TextureLoader().load(ENV, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; usePark(tex); },
    undefined, (e) => console.warn('Park photo did not load', e));
}

// Daylight comes through the south facade; the wood throws a warm bounce back up.
const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
key.position.set(-6, 16, 12);
scene.add(key);
scene.add(new THREE.HemisphereLight(0xfff6ea, 0xc9a577, 1.5));

const flat = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
buildRoom(scene, renderer);

function shadow(w, d, x, z, strength) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(255,255,255,${strength})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    flat(BLACK, { map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.006, z);
  scene.add(m);
}

// A person for scale, standing in the lounge beside the wood block and looking up.
const FIGURE_AT = new THREE.Vector3(1.5, 0, 1.6);
function buildFigure() {
  const mat = new THREE.MeshStandardMaterial({ color: BLACK, roughness: 0.85, metalness: 0 });
  const g = new THREE.Group();
  const part = (geo, x, y, z = 0, rz = 0, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    g.add(m);
    return m;
  };
  // Proportions for a 1.7 m adult, built at that size and scaled by FIGURE.
  part(new THREE.CapsuleGeometry(0.075, 0.7, 6, 12), -0.1, 0.425);          // legs
  part(new THREE.CapsuleGeometry(0.075, 0.7, 6, 12), 0.1, 0.425);
  const torso = part(new THREE.CapsuleGeometry(0.17, 0.36, 6, 16), 0, 1.13);
  torso.scale.z = 0.68;
  part(new THREE.CapsuleGeometry(0.05, 0.52, 6, 10), -0.25, 1.06, 0, -0.1);  // arms
  part(new THREE.CapsuleGeometry(0.05, 0.52, 6, 10), 0.25, 1.06, 0, 0.1);
  part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 12), 0, 1.44);           // neck
  part(new THREE.SphereGeometry(0.115, 20, 16), 0, 1.585, -0.02, 0, -0.35);  // head, tipped back
  g.scale.setScalar(FIGURE / 1.7);
  g.position.copy(FIGURE_AT);
  g.rotation.y = Math.atan2(-FIGURE_AT.x, -FIGURE_AT.z) + Math.PI; // facing the centre
  scene.add(g);
  shadow(0.9, 0.9, FIGURE_AT.x, FIGURE_AT.z, 0.85);
}
buildFigure();

// Camera: a visitor on the floor.
const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 200);
camera.rotation.order = 'YXZ';
const me = { x: 2.3, y: EYE, z: 2.7, yaw: 0, pitch: 0.45 };
let centre = new THREE.Vector3(0, CLEARANCE + 2.6, 0); // refined once the model loads
let top = CLEARANCE + (FOOTPRINT ? FOOTPRINT.height : 7.2);

function lookFrom(p, t) {
  const dx = t.x - p.x, dy = t.y - p.y, dz = t.z - p.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
// Places to stand: the lounge under the work, the Level 2 corridor, the glazing of the
// Level 3 corridor and the Level 4 track, and the long view from the east in MJMA's render.
const views = () => ({
  lounge: { p: [2.3, EYE, 2.7], t: centre },
  under: { p: [1.5, EYE, 0.1], t: new THREE.Vector3(0.2, top, 0) },
  corridor: { p: [8.6, EYE, -3.0], t: centre },
  level3: { p: [3.4, L.level3 + EYE, -2.95], t: centre },
  track: { p: [3.6, L.level4 + EYE, -2.95], t: new THREE.Vector3(centre.x, centre.y + 2.0, 0) },
  long: { p: [14, L.level3 + 1.9, 0.9], t: new THREE.Vector3(-1, centre.y + 0.4, 0.3) },
});

let tween = null;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const turnTo = (from, to) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
function travel(to, dur) {
  const goal = { ...me, ...to };
  if (to.yaw != null) goal.yaw = turnTo(me.yaw, to.yaw);
  if (reduced) { Object.assign(me, goal); tween = null; return; }
  tween = { t0: performance.now(), dur, from: { ...me }, to: goal };
}
function flyTo(name) {
  const v = views()[name];
  if (!v) return;
  const p = new THREE.Vector3(...v.p);
  travel({ x: p.x, y: p.y, z: p.z, ...lookFrom(p, v.t) }, 1400);
  document.querySelectorAll('.views button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
const clearActive = () => document.querySelectorAll('.views button').forEach((b) => b.classList.remove('active'));

// Model
const draco = new DRACOLoader().setDecoderPath('./vendor/draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const barFill = document.getElementById('bar-fill');
const loaderText = document.getElementById('loader-text');
loader.load(MODEL, (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.map) { m.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); m.map.colorSpace = THREE.SRGBColorSpace; }
      m.envMapIntensity = 1.0;
      m.fog = false; // the work itself never fades into the room
      if (/Mirror/i.test(m.name)) { m.metalness = 1; m.roughness = Math.max(m.roughness, 0.04); }
    }
  });
  // Fit it to the installed footprint, measured from the model as exported.
  const exported = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  if (FOOTPRINT) {
    root.scale.set(FOOTPRINT.length / exported.x, FOOTPRINT.height / exported.y, FOOTPRINT.width / exported.z);
    root.updateMatrixWorld(true);
  }
  // Hang it. Flush: the top of the suspension plate, the highest wood in the model, meets
  // the ceiling. Otherwise the lowest point sits CLEARANCE above the floor.
  const box = new THREE.Box3().setFromObject(root);
  let plateTop = -Infinity;
  if (PLATE_FLUSH) {
    const p = new THREE.Vector3();
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const pos = o.geometry.attributes.position;
      const index = o.geometry.index;
      const groups = o.geometry.groups.length
        ? o.geometry.groups
        : [{ start: 0, count: index ? index.count : pos.count, materialIndex: 0 }];
      for (const g of groups) {
        if (!/wood/i.test(mats[g.materialIndex]?.name || '')) continue;
        for (let i = g.start; i < g.start + g.count; i += 1) {
          p.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(o.matrixWorld);
          if (p.y > plateTop) plateTop = p.y;
        }
      }
    });
  }
  const flush = PLATE_FLUSH && Number.isFinite(plateTop);
  root.position.y = flush ? L.ceiling - plateTop : CLEARANCE - box.min.y;
  scene.add(root);
  box.translate(new THREE.Vector3(0, root.position.y, 0));
  const size = box.getSize(new THREE.Vector3());
  window.__model = { exported: exported.toArray(), shown: size.toArray(), lowest: box.min.y, top: box.max.y, plateTop: flush ? L.ceiling : null };
  top = box.max.y;
  centre = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + size.y * 0.36, (box.min.z + box.max.z) / 2);

  // Hangers: steel rods carry on from the highest points of the model up to the ceiling,
  // where the beams above take the load.
  const rise = L.ceiling - top;
  if (!flush && rise > 0.02) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x9a9da0, roughness: 0.35, metalness: 1 });
    const tops = new Map();
    const p = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (p.y < top - 0.02) continue;
        const k = `${Math.round(p.x / 0.5)}|${Math.round(p.z / 0.5)}`;
        const t = tops.get(k) || { x: 0, z: 0, n: 0 };
        t.x += p.x; t.z += p.z; t.n += 1;
        tops.set(k, t);
      }
    });
    for (const t of [...tops.values()].slice(0, 12)) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, rise, 10), steel);
      rod.position.set(t.x / t.n, top + rise / 2, t.z / t.n);
      scene.add(rod);
    }
  }

  work = root;
  reflectRoom();

  Object.assign(me, lookFrom(new THREE.Vector3(me.x, me.y, me.z), centre));
  document.getElementById('loader').classList.add('done');
  setTimeout(() => document.getElementById('loader')?.remove(), 800);
  window.__ready = true;
}, (e) => {
  if (!e.total) return;
  const pct = Math.round((e.loaded / e.total) * 100);
  barFill.style.width = `${pct}%`;
  loaderText.textContent = `Loading ${pct}%`;
}, (err) => {
  console.error(err);
  loaderText.textContent = 'Could not load the model. Check your connection and reload.';
});

// Looking and walking
const hint = document.getElementById('hint');
const touched = () => { hint.classList.add('gone'); };
const pointers = new Map();
let drag = null;
let pinch = 0;
const ray = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const clampToRoom = keepOnFloor;
function walkTo(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.ray.intersectPlane(floorPlane, new THREE.Vector3());
  if (!hit) return; // tapped above the horizon
  const to = clampToRoom(hit.x, hit.z);
  const dist = Math.hypot(to.x - me.x, to.z - me.z);
  travel({ x: to.x, z: to.z, y: EYE }, Math.min(2600, 500 + dist * 260 + Math.abs(me.y - EYE) * 150));
  clearActive();
}
function step(forward, sideways) {
  const s = Math.sin(me.yaw), c = Math.cos(me.yaw);
  const to = clampToRoom(me.x - s * forward + c * sideways, me.z - c * forward - s * sideways);
  me.x = to.x;
  me.z = to.z;
  me.y += (EYE - me.y) * 0.2; // walking brings you back down to the floor
  tween = null;
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    step((d - pinch) * 0.02, 0);
    pinch = d;
    touched();
    return;
  }
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
  if (!drag.moved) return;
  // The view follows the hand: drag right and the room turns right.
  const k = 0.0042;
  me.yaw += dx * k;
  me.pitch = THREE.MathUtils.clamp(me.pitch + dy * k, -1.2, 1.55);
  tween = null;
  clearActive();
  touched();
});
const release = (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (drag && !drag.moved && e.type === 'pointerup' && performance.now() - drag.t0 < 400) {
    walkTo(e.clientX, e.clientY);
    touched();
  }
  if (pointers.size === 0) drag = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

// The wheel steps forward and back. Inside the work page it only does so once the
// viewer has focus, so scrolling the page past it never gets caught.
canvas.addEventListener('wheel', (e) => {
  if (framed && document.activeElement !== canvas) return;
  e.preventDefault();
  step(-e.deltaY * 0.004, 0);
  touched();
}, { passive: false });
if (framed) canvas.addEventListener('pointerleave', () => canvas.blur());

const keys = new Set();
const MOVE = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleAbout(false);
  if (!MOVE.includes(e.code) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.activeElement !== canvas && document.activeElement !== document.body) return;
  keys.add(e.code);
  e.preventDefault();
  touched();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// UI
document.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => { flyTo(b.dataset.view); touched(); }));

const about = document.getElementById('about');
const aboutBtn = document.getElementById('about-btn');
function toggleAbout(open) {
  about.hidden = !open;
  aboutBtn.setAttribute('aria-expanded', String(open));
}
aboutBtn.addEventListener('click', () => toggleAbout(about.hidden));
document.getElementById('about-close').addEventListener('click', () => { toggleAbout(false); aboutBtn.focus(); });

const fsBtn = document.getElementById('fs');
if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
fsBtn.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()));

setTimeout(touched, 9000);

// Pause rendering when the tab is hidden
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 72 : 58; // a wider eye on portrait screens
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// The figure's height label follows its head.
const scaleTag = document.getElementById('scale');
const headTop = new THREE.Vector3(FIGURE_AT.x, FIGURE + 0.12, FIGURE_AT.z);
const projected = new THREE.Vector3();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  if (!visible) return;
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k);
    for (const key of ['x', 'y', 'z', 'yaw', 'pitch']) me[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * e;
    if (k >= 1) tween = null;
  }
  if (keys.size) {
    const walk = 2.4 * dt, turn = 1.5 * dt;
    const f = (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
    const s = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    me.yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * turn;
    if (f || s) step(f * walk, s * walk);
    clearActive();
  }

  camera.position.set(me.x, me.y, me.z);
  camera.rotation.set(me.pitch, me.yaw, 0);
  renderer.render(scene, camera);

  projected.copy(headTop).project(camera);
  const near = Math.hypot(me.x - FIGURE_AT.x, me.z - FIGURE_AT.z);
  const show = projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && near > 1.2;
  scaleTag.classList.toggle('on', show);
  if (show) {
    const x = (projected.x * 0.5 + 0.5) * innerWidth, y = (-projected.y * 0.5 + 0.5) * innerHeight;
    scaleTag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }
});
