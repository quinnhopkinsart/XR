import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { FLOWERS } from './flowers.js';
import { buildField } from './field.js';
import { buildCarousel } from './carousel.js';

// Beaded Flowers: beadwork by Robyn Adams, modelled in 3D by Quinn Hopkins.
// Two views share one canvas. "Field" is a meadow of the flowers that you walk through
// at eye height (field.js). "Each flower" singles them out one at a time with a few
// lines about each (carousel.js; the text is in flowers.js).
//
// The models are the game assets: each plant is a few flat cards with a picture of its
// beads (tex/<id>.webp), a normal map (tex/<id>-n.webp) and a wind weight on every
// vertex (_wind). models/flowers.glb holds all of them, geometry only, in metres, Y up.
// tools/ in the source folder rebuilds the model and the textures from the FBX exports.

const canvas = document.getElementById('stage');
const framed = window.top !== window.self;
const small = Math.min(screen.width, screen.height) < 700 || matchMedia('(hover:none)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The colours of the meadow are the work's own, from Quinn's render of it: a hazy warm
// sky over green. The buttons and panels keep the site's palette (style.css).
export const SKY = { top: '#b98f8b', horizon: '#f6dcc0', sun: '#fff1d0', ground: '#1f4a2a' };

const loaderEl = document.getElementById('loader');
const fail = (msg) => { document.getElementById('loader-text').textContent = msg; };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  fail('This viewer needs WebGL, which this browser has turned off.');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Neutral tone mapping keeps the bead colours as saturated as the beads are.
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

// Glass beads catch light: a soft room gives them something to reflect.
const pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---- Loading --------------------------------------------------------------------------
const manager = new THREE.LoadingManager();
manager.onProgress = (_, done, total) => {
  const pct = Math.round((done / total) * 100);
  document.getElementById('bar-fill').style.width = `${pct}%`;
  document.getElementById('loader-text').textContent = `Loading ${pct}%`;
};
manager.onError = (url) => console.warn('Could not load', url);

const texLoader = new THREE.TextureLoader(manager);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function texture(file, colour) {
  const t = texLoader.load(`./tex/${file}`);
  t.flipY = false;                       // the model's UVs are already glTF's way up
  if (colour) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  return t;
}

// Wind: every vertex carries a weight (0 at the root, 1 at the tips), and the shader
// leans it. The phase comes from where the plant stands, so a gust crosses the field.
export const wind = { time: { value: 0 }, strength: { value: 1 } };
export function addWind(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind.time;
    shader.uniforms.uWind = wind.strength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float _wind;\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 wRoot = instanceMatrix[3].xyz;
        #else
          vec3 wRoot = vec3(0.0);
        #endif
        float wPhase = wRoot.x * 0.35 + wRoot.z * 0.27;
        float wLean = sin(uTime * 1.3 + wPhase + position.y * 0.8) * 0.6 + sin(uTime * 2.9 + wPhase * 1.7) * 0.25;
        transformed.x += wLean * _wind * uWind * 0.07;
        transformed.z += cos(uTime * 1.1 + wPhase) * _wind * uWind * 0.04;`);
  };
  return material;
}

// One material per plant. alphaToCoverage keeps the strings of beads whole at a distance,
// where a plain alpha test would thin them to nothing.
function beadMaterial(id) {
  return addWind(new THREE.MeshStandardMaterial({
    map: texture(`${id}${small ? '-1k' : ''}.webp`, true),
    normalMap: texture(`${id}-n.webp`, false),
    normalScale: new THREE.Vector2(1, 1),
    roughness: 0.42,
    metalness: 0,
    envMapIntensity: 0.6,
    side: THREE.DoubleSide,
    alphaTest: 0.4,
    alphaToCoverage: true,
  }));
}

const materials = {};
for (const f of FLOWERS) materials[f.id] = beadMaterial(f.id);
materials['bead-path'] = beadMaterial('bead-path');

const geometries = {};
new GLTFLoader(manager).load('./models/flowers.glb', (gltf) => {
  gltf.scene.traverse((o) => { if (o.isMesh) geometries[o.name] = o.geometry; });
}, undefined, () => fail('The flowers could not be loaded. Reload to try again.'));

// ---- The two views --------------------------------------------------------------------
let field, carousel, mode = 'field';
const ctx = { THREE, renderer, canvas, environment, materials, geometries, small, framed, SKY, wind, addWind, touched };

const hint = document.getElementById('hint');
let hintTimer;
function touched() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hint.classList.add('gone'), 2500);
}

const modeField = document.getElementById('mode-field');
const modeFlowers = document.getElementById('mode-flowers');
const carouselEl = document.getElementById('carousel');

function setMode(next, flowerId) {
  mode = next;
  document.body.dataset.mode = mode;
  modeField.setAttribute('aria-pressed', String(mode === 'field'));
  modeFlowers.setAttribute('aria-pressed', String(mode === 'flowers'));
  carouselEl.hidden = mode !== 'flowers';
  hint.classList.remove('gone');
  clearTimeout(hintTimer);
  canvas.setAttribute('aria-label', mode === 'field'
    ? '3D view of a field of beaded flowers. Drag to look around, tap the ground to walk there, or use the arrow keys.'
    : '3D view of one beaded flower. Drag to turn it. Left and right arrow keys change flowers.');
  if (mode === 'flowers' && carousel) carousel.show(flowerId);
  const hash = mode === 'flowers' && carousel ? `#${carousel.current().id}` : '#field';
  if (location.hash !== hash) history.replaceState(null, '', hash);
  resize();
}
modeField.addEventListener('click', () => setMode('field'));
modeFlowers.addEventListener('click', () => setMode('flowers'));

// Motion: the wind, the drifting lights and the flower's slow turn. Off to start for
// visitors who ask their device for less motion.
const motionBtn = document.getElementById('motion');
let motion = !reducedMotion;
function setMotion(on) {
  motion = on;
  motionBtn.setAttribute('aria-pressed', String(on));
  wind.strength.value = on ? 1 : 0;
}
motionBtn.addEventListener('click', () => setMotion(!motion));
setMotion(motion);

// About
const about = document.getElementById('about');
const aboutBtn = document.getElementById('about-btn');
function toggleAbout(open) {
  about.hidden = !open;
  aboutBtn.setAttribute('aria-expanded', String(open));
}
aboutBtn.addEventListener('click', () => toggleAbout(about.hidden));
document.getElementById('about-close').addEventListener('click', () => { toggleAbout(false); aboutBtn.focus(); });

// Full screen
const fsBtn = document.getElementById('fs');
if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
fsBtn.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()));

addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !about.hidden) { toggleAbout(false); aboutBtn.focus(); return; }
  if (e.target.closest && e.target.closest('button, a, input')) {
    if (e.key === ' ' || e.key === 'Enter') return;       // let buttons be buttons
  }
  const view = mode === 'field' ? field : carousel;
  if (view && view.key(e, true)) { e.preventDefault(); touched(); }
});
addEventListener('keyup', (e) => { if (field) field.key(e, false); });
addEventListener('blur', () => { if (field) field.clearKeys(); });

// The pointer goes to whichever view is showing.
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
  canvas.addEventListener(type, (e) => {
    const view = mode === 'field' ? field : carousel;
    if (view) view.pointer(type, e);
    if (type === 'pointerdown') touched();
  });
}
// Inside the work page the wheel belongs to the page until the view has been clicked.
canvas.addEventListener('wheel', (e) => {
  if (framed && document.activeElement !== canvas) return;
  const view = mode === 'field' ? field : carousel;
  if (view && view.wheel(e)) { e.preventDefault(); touched(); }
}, { passive: false });
if (framed) canvas.addEventListener('pointerleave', () => canvas.blur());

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  if (field) field.resize(w, h);
  if (carousel) carousel.resize(w, h);
}
addEventListener('resize', resize);

let visible = !document.hidden;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  if (motion) wind.time.value += dt;
  const view = mode === 'field' ? field : carousel;
  if (view) view.update(dt, motion);
}

manager.onLoad = () => {
  if (field) return;                      // textures finishing after the first build
  if (!geometries.asters) return;
  field = buildField(ctx);
  carousel = buildCarousel(ctx, FLOWERS, () => {
    if (mode === 'flowers') history.replaceState(null, '', `#${carousel.current().id}`);
  });
  const wanted = location.hash.slice(1);
  if (FLOWERS.some((f) => f.id === wanted)) setMode('flowers', wanted);
  else if (wanted === 'flowers') setMode('flowers');
  else resize();
  loaderEl.classList.add('done');
  window.__ready = true;                  // for tests
  frame();
};
addEventListener('hashchange', () => {
  const wanted = location.hash.slice(1);
  if (wanted === 'field') setMode('field');
  else if (FLOWERS.some((f) => f.id === wanted)) setMode('flowers', wanted);
});
