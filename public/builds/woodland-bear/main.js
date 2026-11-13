import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { loadSculpture, makeShadow, SIZE } from './sculpture.js';

// One scene, two views. The 3D view (viewer.js) orbits the sculpture on a saffron stage.
// ?view=ar (ar.js) stands it on the floor through the phone's camera with world tracking.
// Both share the sculpture, its floating parts, and the turn and size controls below.
const MODE = window.WB_MODE;
const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(2, 5, 3);
scene.add(key);

/** Reflections for the glossy black body. Called once a renderer exists. */
function dress(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();
}

// What the visitor has done to the sculpture: turned it and resized it.
const state = { turn: 0, size: 1, facing: 0, motion: !reduced };
let sculpture = null;
const shadow = makeShadow();

function apply() {
  if (!sculpture) return;
  state.size = THREE.MathUtils.clamp(state.size, SIZE.min, SIZE.max);
  sculpture.anchor.rotation.y = state.facing + state.turn;
  sculpture.anchor.scale.setScalar(state.size);
  shadow.position.set(sculpture.anchor.position.x, sculpture.anchor.position.y + 0.004, sculpture.anchor.position.z);
  shadow.scale.setScalar(state.size);
  $('size').textContent = `${Math.round(state.size * 100)}%`;
}

const controls = {
  state,
  apply,
  turnBy(rad) { state.turn += rad; apply(); },
  scaleBy(f) { state.size *= f; apply(); },
  reset() { state.turn = 0; state.size = 1; apply(); view?.reset?.(); },
};

// The buttons: one press is one step, holding keeps going.
const STEP = { left: () => controls.turnBy(-Math.PI / 12), right: () => controls.turnBy(Math.PI / 12),
  smaller: () => controls.scaleBy(1 / 1.1), bigger: () => controls.scaleBy(1.1), reset: () => controls.reset() };
$('controls').querySelectorAll('button').forEach((btn) => {
  const act = STEP[btn.dataset.act];
  let hold = null;
  let held = false;
  const stop = () => { clearInterval(hold); hold = null; };
  btn.addEventListener('pointerdown', () => {
    if (btn.dataset.act === 'reset') return;
    held = false;
    stop();
    const start = setTimeout(() => { held = true; hold = setInterval(act, 90); }, 350);
    hold = start;
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => btn.addEventListener(n, () => { clearTimeout(hold); stop(); }));
  btn.addEventListener('click', () => { if (!held) act(); held = false; view?.touched?.(); });
});

// Motion: the floating parts, and the slow turn in the 3D view. Off for reduced motion.
const motionBtn = $('motion-btn');
function setMotion(on) {
  state.motion = on;
  motionBtn.setAttribute('aria-pressed', String(on));
  motionBtn.textContent = on ? 'Motion on' : 'Motion off';
  sculpture?.setMotion(on);
}
motionBtn.addEventListener('click', () => setMotion(!state.motion));

window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('a,button,input') && !['+', '-', '='].includes(e.key)) return;
  if (e.key === 'ArrowLeft') STEP.left();
  else if (e.key === 'ArrowRight') STEP.right();
  else if (e.key === '+' || e.key === '=') STEP.bigger();
  else if (e.key === '-' || e.key === '_') STEP.smaller();
  else if (e.key === '0') STEP.reset();
  else return;
  e.preventDefault();
  view?.touched?.();
});

let view = null;
const clock = new THREE.Clock();
/** Called by the view once per frame, before it draws. */
function tick() {
  const dt = Math.min(clock.getDelta(), 0.1);
  sculpture?.update(clock.elapsedTime, dt);
  return dt;
}

const ctx = { THREE, scene, controls, state, dress, tick, shadow, $, reduced, setMotion,
  get sculpture() { return sculpture; } };

const ready = loadSculpture((f) => {
  $('bar-fill').style.width = `${Math.round(f * 100)}%`;
  $('loader-text').textContent = `Loading ${Math.round(f * 100)}%`;
}).then((s) => {
  sculpture = s;
  scene.add(s.anchor, shadow);
  setMotion(state.motion);
  if (reduced) s.still();
  apply();
  return s;
});
ready.catch((err) => {
  console.error(err);
  $('loader-text').textContent = 'The sculpture could not load. Reload to try again.';
});

view = MODE === 'ar'
  ? (await import('./ar.js')).startAR(ctx, ready)
  : (await import('./viewer.js')).startViewer(ctx, ready);
