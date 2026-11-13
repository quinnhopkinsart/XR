import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

// She Bends the Light to Her Will, by Feather Miigwans with Quinn Hopkins.
// One scene, two views: viewer.js is the 3D view, ar.js the camera AR on ?view=ar.
//
// In the AR work (8th Wall project "she-bends-the-light-to-her-will") a moon floats in the
// room and throws a cone of light to a star on the floor, which follows wherever the phone
// points. Seven words lie hidden on the floor, SHE BENDS THE LIGHT TO HER WILL, and each
// shows for a few seconds when the star passes over it. This file rebuilds that scene in
// plain three.js and holds everything the two views share. The numbers below are the ones
// in the project's body.html and components.js.
const MOON = { y: 2, radius: 0.25, rise: 0.25, speed: 0.5 };       // float: amplitude, speed
const RAYS = { count: 200, spread: Math.PI / 15, opacity: 0.4 };    // light-rays
const STAR = { size: 0.5, opacity: 0.8, lift: 0.02 };               // #cursor
const WORDS = ['SHE', 'BENDS', 'THE', 'LIGHT', 'TO', 'HER', 'WILL'];
// word-position and reveal-on-cursor: each word waits on the ground in its own row, at a
// new place across the row every few seconds, and shows when the star comes close.
const WORD = { scale: 0.5, startZ: -2, zSpacing: 0.5, maxX: 1, every: 3, near: 0.5, shown: 5, fade: 0.6 };
const REACH = 3.2;   // metres from the moon the star can travel

const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = getComputedStyle(document.documentElement);
const token = (name) => new THREE.Color(css.getPropertyValue(name).trim());
const NIGHT = token('--night');
const DUSK = token('--dusk');
const GOLD = token('--gold');

const MODE = window.SBL_MODE;
const scene = new THREE.Scene();
// What only the 3D view shows: the dark floor and the glows. In AR the room is the ground.
const stage = new THREE.Group();
scene.add(stage);

// --- the ground: dark, with a soft pool of dusk around the middle so it reads as a floor
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(30, 64),
  new THREE.MeshBasicMaterial({ color: NIGHT }),
);
ground.rotation.x = -Math.PI / 2;
stage.add(ground);

function glow(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const floorGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14),
  new THREE.MeshBasicMaterial({ map: glow('rgba(255,255,255,.5)', 'rgba(255,255,255,0)'), color: DUSK, transparent: true, depthWrite: false }),
);
floorGlow.rotation.x = -Math.PI / 2;
floorGlow.position.y = 0.002;
stage.add(floorGlow);

// --- the moon
const loaderTex = new THREE.TextureLoader();
const moonTex = loaderTex.load('./assets/moon.jpg');
moonTex.colorSpace = THREE.SRGBColorSpace;
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(MOON.radius, 48, 32),
  new THREE.MeshBasicMaterial({ map: moonTex }),
);
moon.position.set(0, MOON.y, 0);
scene.add(moon);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glow('rgba(255,255,255,.55)', 'rgba(255,255,255,0)'), color: GOLD, transparent: true, depthWrite: false,
}));
halo.scale.setScalar(MOON.radius * 7);
halo.visible = MODE !== 'ar';
moon.add(halo);

// --- the star on the ground, and the pool of light it sits in
const starTex = loaderTex.load('./assets/star.png');
starTex.colorSpace = THREE.SRGBColorSpace;
const star = new THREE.Mesh(
  new THREE.PlaneGeometry(STAR.size, STAR.size),
  new THREE.MeshBasicMaterial({ map: starTex, transparent: true, opacity: STAR.opacity, depthWrite: false }),
);
star.rotation.x = -Math.PI / 2;
star.position.set(0, STAR.lift, 1.2);
star.renderOrder = 3;
scene.add(star);
const pool = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: glow('rgba(255,255,255,.34)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false }),
);
pool.rotation.x = -Math.PI / 2;
pool.renderOrder = 1;
stage.add(pool);

// --- the light: lines from the moon to a ring around the star
const rayPos = new Float32Array(RAYS.count * 2 * 3);
const rayGeo = new THREE.BufferGeometry();
rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
const rays = new THREE.LineSegments(rayGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: RAYS.opacity, depthWrite: false }));
rays.frustumCulled = false;
rays.renderOrder = 2;
scene.add(rays);

function aimRays() {
  const m = moon.position;
  const s = star.position;
  const radius = m.distanceTo(s) * Math.tan(RAYS.spread);
  let i = 0;
  for (let k = 0; k < RAYS.count; k++) {
    const a = (k / RAYS.count) * Math.PI * 2;
    rayPos[i++] = m.x; rayPos[i++] = m.y; rayPos[i++] = m.z;
    rayPos[i++] = s.x + Math.cos(a) * radius; rayPos[i++] = s.y; rayPos[i++] = s.z + Math.sin(a) * radius;
  }
  rayGeo.attributes.position.needsUpdate = true;
  pool.position.set(s.x, 0.006, s.z);
  pool.scale.setScalar(radius * 2.6);
}

// --- the words
const words = [];
const gltf = new GLTFLoader();
const loads = WORDS.map((name, index) => gltf.loadAsync(`./assets/${name}.glb`).then((g) => {
  const obj = g.scene;
  obj.scale.setScalar(WORD.scale);
  const mats = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    // Flat white letters, as the model's emissive white reads in the AR scene.
    o.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    o.renderOrder = 4;
    mats.push(o.material);
  });
  obj.visible = false;
  scene.add(obj);
  // The letters are not centred on the model's origin. Measure where they are, so a word
  // shows when the light is on the letters themselves.
  const mid = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
  const w = { name, index, obj, mats, mid, opacity: 0, until: 0, shown: false };
  words[index] = w;
  place(w);
}));

function place(w) {
  w.obj.position.set(
    moon.position.x + (Math.random() * 2 - 1) * WORD.maxX - w.mid.x,
    0.01,
    moon.position.z + WORD.startZ + w.index * WORD.zSpacing,
  );
}

// --- where the star is heading. Each view decides what aims it.
const aim = new THREE.Vector3(0, 0, 1.2);
let touched = false; // has the visitor aimed the light yet

function setAim(x, z, limit = REACH) {
  const dx = x - moon.position.x;
  const dz = z - moon.position.z;
  const d = Math.hypot(dx, dz);
  const k = d > limit ? limit / d : 1;
  aim.set(moon.position.x + dx * k, 0, moon.position.z + dz * k);
  touched = true;
}

// --- sound and motion
const audio = new Audio('./assets/feather-ambient.mp3');
audio.loop = true;
audio.volume = 0.2; // as in the AR scene
audio.preload = 'none';
const soundBtn = $('sound-btn');
function setSound(on) {
  if (on) audio.play().catch(() => setSound(false)); else audio.pause();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.textContent = on ? 'Sound on' : 'Sound off';
}
soundBtn.addEventListener('click', () => setSound(audio.paused));
document.addEventListener('visibilitychange', () => { if (document.hidden && !audio.paused) setSound(false); });

// Motion: the moon's rise and fall, and in the 3D view the light wandering before anyone
// has aimed it.
// The words still change places while hidden: that is how the work hides them.
let motion = !reduced;
const motionBtn = $('motion-btn');
function setMotion(on) {
  motion = on;
  motionBtn.setAttribute('aria-pressed', String(on));
  motionBtn.textContent = on ? 'Motion on' : 'Motion off';
}
motionBtn.addEventListener('click', () => setMotion(!motion));
setMotion(motion);

// --- one frame of the scene. The view calls this, then draws.
let entered = false;
let floatT = 0;
let nextMove = WORD.every;
const clock = new THREE.Clock();
const flat = new THREE.Vector3();

function step() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;

  if (motion) floatT += dt * MOON.speed;
  moon.position.y = MOON.y + Math.sin(floatT) * MOON.rise;

  // In the 3D view, before the visitor aims it, the light drifts slowly over the rows of words.
  if (MODE !== 'ar' && entered && !touched && motion) {
    aim.set(Math.sin(t * 0.23) * 1.1, 0, -0.5 + Math.sin(t * 0.31 + 1) * 1.5);
  }
  star.position.x += (aim.x - star.position.x) * Math.min(1, dt * 6);
  star.position.z += (aim.z - star.position.z) * Math.min(1, dt * 6);
  aimRays();

  // Hidden words take a new place across their row every few seconds.
  if (t >= nextMove) {
    nextMove = t + WORD.every;
    for (const w of words) if (w && !w.shown && w.opacity === 0) place(w);
  }
  for (const w of words) {
    if (!w) continue;
    if (entered && !w.shown) {
      flat.set(w.obj.position.x + w.mid.x, STAR.lift, w.obj.position.z + w.mid.z);
      if (flat.distanceTo(star.position) <= WORD.near) {
        w.shown = true;
        w.until = t + WORD.shown;
        $('found').textContent = w.name.charAt(0) + w.name.slice(1).toLowerCase();
        window.SBL_FOUND = (window.SBL_FOUND || 0) + 1;
      }
    } else if (w.shown && t >= w.until) {
      w.shown = false;
    }
    const goal = w.shown ? 1 : 0;
    if (w.opacity !== goal) {
      const fade = reduced ? 1 : dt / WORD.fade;
      w.opacity = goal > w.opacity ? Math.min(1, w.opacity + fade) : Math.max(0, w.opacity - fade);
      w.mats.forEach((m) => { m.opacity = w.opacity; });
      w.obj.visible = w.opacity > 0;
    }
  }
  return dt;
}

const ctx = {
  THREE, scene, stage, moon, star, aim, setAim, step, setSound, $, reduced,
  NIGHT, MOON, REACH,
  ready: Promise.all(loads),
  enter() { entered = true; },
  get motion() { return motion; },
};

if (MODE === 'ar') (await import('./ar.js')).startAR(ctx);
else (await import('./viewer.js')).startViewer(ctx);
