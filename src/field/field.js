// The floating field: models from every work drift behind the site.
// Plain three.js, loaded on demand by <FloatingField />, so the first paint
// never waits on WebGL.
//
// Each model is one sculpture. A split model is almost put together, just a little
// exploded: each part eased slightly out from the centre, so the whole is recognised at
// a glance. Sculptures are large and sit near the focal plane, where the lens is sharp.
//
// A model can also name `foreground` parts (spirit lines, barbed wire). Those leave
// their sculpture and hang close to the camera, far larger than the screen and running
// off its edges, soft in the lens, so the page sits inside the work.
//
// Interaction, kept slight on purpose:
//   - the camera leans toward the pointer
//   - parts near the pointer drift away from it and swell a little
//   - tapping a part (on open page, not on text or links) sets it spinning; it settles back
//   - scrolling moves near sculptures faster than far ones
//   - on phones, tilting leans the camera and slides near sculptures further than far ones
//
// Free camera (the landing page only, `fly` in motion.js): the page steps aside and the
// visitor flies among the sculptures. Drag to look, scroll or W A S D to move. Leaving
// eases the camera back to where the page keeps it.
//
// In flight the field opens out: each work's sculptures leave the page's column and gather
// in that work's own zone, a place in the air with the title under it, set on an arc ahead
// of the camera (`ZONES`, `planZones`). Colour fields, stars, pines and marks stand far off
// (scenery.js) and come out of the haze as it draws back (`HAZE`). `flyMix` runs 0 to 1 as
// all of that happens, and back to 0 on the way out.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { flyStick, hasLens, motion } from './motion.js';
import { LensPass } from './lens.js';
import { buildScenery } from './scenery.js';

// Where the page keeps the camera. The layout is worked out from this distance, never from
// the camera itself, so flying does not move the sculptures.
const CAM_Z = 14;
const LOOK_AT = new THREE.Vector3(0, 0, -3);
// Free camera: `speed` in units a second (a screen is about 9 high), `boost` with Shift,
// `turn` in radians a second for the arrow keys, `look` in radians per pixel dragged,
// `wheel` in units per pixel scrolled, `reach` how far from the centre the camera may go.
const FLY = { speed: 13, boost: 2.5, turn: 1.3, look: 0.0042, wheel: 0.022, reach: 135, pitch: 1.45 };
// On phones with Tilt on, tilting looks around in flight: `yaw` and `pitch` are the angles
// in radians at full tilt (about 20 degrees of the phone), to each side and up or down.
// They are negative because the first version, with them positive, looked the wrong way on
// Quinn's phone: both directions are turned round here, in the one place.
const TILT_LOOK = { yaw: -0.7, pitch: -0.45 };
// The tour: scrolling carries the camera along the dashed line (scenery.js). `wheel` and
// `swipe` are units along the line per pixel scrolled or swiped, `flick` how many pixels a
// sideways swipe must travel to turn to the next work, `keys` units a second for
// the keys and the joystick, `ease` how quickly the camera catches up (higher is tighter).
const TOUR = { wheel: 0.035, swipe: 0.12, keys: 16, ease: 2.6, flick: 36 };
// Zones: `out` is the least distance from the centre to a zone, `step` the angle between
// neighbours in degrees, `gap` the space between sculptures in one zone and between two
// zones, `pad` the clear space round a zone's sculptures.
const ZONES = { out: 70, step: 52, gap: 2.5, pad: 4 };
// Haze: where it starts and where it is complete, on the page and in flight. `far` is how
// far the camera draws in flight.
const HAZE = { page: [17, 46], flight: [90, 380], far: 700 };
// The lens (desktop only, lens.js). `aperture` is how fast things soften as they leave the
// focus, in screen widths per unit of (distance - focus) / distance; `back` and `near` cap the
// blur behind and in front of it, `tol` is the share of that ratio kept sharp (the depth of
// field), `boost` brightens bright discs a little, as a real lens does. In flight the
// distances are several times longer, the works stand in zones with their titles a few units
// toward the middle, and Quinn found the blur hid them: wider sharp range, softer ends, and
// a gentler blur in front so the foreground never covers a work.
const LENS = {
  page: { aperture: 0.025, back: 0.009, near: 0.007, tol: 0.08, boost: 0.5 },
  flight: { aperture: 0.02, back: 0.011, near: 0.004, tol: 0.11, boost: 0.6 },
};

const SPIN = 0.35; // radians a second, for parts a model lists under `spin`

const INTERACTIVE = 'a, button, input, select, textarea, iframe, label, summary, [role="button"], .fly-stick';

// Small seeded random so the composition is the same on every visit.
function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const token = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Wraps a mesh or scene in a pivot centred on its bounds. Keeps its authored size. */
function toPart(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());

  const inner = new THREE.Group();
  inner.add(object);
  object.position.sub(centre);

  const pivot = new THREE.Group();
  pivot.add(inner);
  return { pivot, centre, longest: Math.max(size.x, size.y, size.z) || 1 };
}

function recolor(root, colour) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colour),
    roughness: 0.18,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    sheen: 1,
    sheenColor: new THREE.Color(token('--ground', '#ff3314')),
    side: THREE.DoubleSide,
  });
  root.traverse((o) => {
    if (o.isMesh) o.material = material;
  });
}

/**
 * Makes a model a neon tube: its own surface in a pale, unlit core colour, with two shells
 * of the glow colour pushed out round it, a solid rim and a wide soft halo. The field has
 * no bloom pass, so the glow is drawn. `NEON` is how far each shell stands off, in the
 * model's own units, and how solid the halo is. Quinn wanted the glow thin and subtle
 * (the first shells were about three times as wide), so keep these small.
 */
const NEON = { rim: 0.011, halo: 0.035, soft: 0.2 };
function neon(root, core, glow) {
  const tube = new THREE.MeshBasicMaterial({ color: new THREE.Color(core), toneMapped: false });
  const shell = (push, opacity) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(glow),
      side: THREE.BackSide,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      toneMapped: false,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.neonPush = { value: push };
      shader.vertexShader = `uniform float neonPush;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed += normalize(normal) * neonPush;',
      );
    };
    material.customProgramCacheKey = () => `neon-${push}`;
    return material;
  };
  const rim = shell(NEON.rim, 1);
  const halo = shell(NEON.halo, NEON.soft);
  const meshes = [];
  root.traverse((o) => o.isMesh && meshes.push(o));
  for (const o of meshes) {
    o.material = tube;
    o.add(new THREE.Mesh(o.geometry, rim), new THREE.Mesh(o.geometry, halo));
  }
}

/**
 * Turns one model spec from a project.js into a sculpture: its parts, where each sat
 * in the original (relative to the sculpture's centre), and the scale that brings the
 * whole to unit size.
 */
function sculptureFrom(gltf, spec, maxParts) {
  const exclude = (spec.exclude || []).map((s) => s.toLowerCase());
  const skip = (name = '') => exclude.some((s) => name.toLowerCase().includes(s));
  const spins = (spec.spin || []).map((s) => s.toLowerCase());
  const isSpin = (name = '') => spins.some((s) => name.toLowerCase().includes(s));
  const front = (spec.foreground || []).map((s) => s.toLowerCase());
  const isFront = (name = '') => front.some((s) => name.toLowerCase().includes(s));
  let parts = [];
  const foreground = [];

  gltf.scene.updateMatrixWorld(true);

  if (spec.split) {
    const meshes = [];
    gltf.scene.traverse((o) => {
      if (o.isMesh && !skip(o.name) && !skip(o.parent?.name)) meshes.push(o);
    });
    for (const mesh of meshes) {
      const copy = mesh.clone();
      // Give the copy the mesh's world transform, so each part keeps its authored shape,
      // size and place. Set, not applied on top: the clone already carries the mesh's own
      // position and scale, and applying the world matrix again would count them twice
      // (that squashed the scaled orbs on Woodland Be[AR]).
      copy.matrix.copy(mesh.matrixWorld);
      copy.matrix.decompose(copy.position, copy.quaternion, copy.scale);
      copy.matrixAutoUpdate = true;
      const part = toPart(copy);
      if (isFront(mesh.name) || isFront(mesh.parent?.name)) {
        if (spec.recolor) recolor(part.pivot, token(spec.recolor, '#000000'));
        if (spec.neon) neon(part.pivot, token(spec.neon[0], '#ffffff'), token(spec.neon[1], '#ff0000'));
        part.home = new THREE.Vector3();
        // A drawing on a plane (a cut-out texture), as against modelled wire or tube.
        mesh.geometry.computeBoundingBox();
        const thin = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        // Broad: a drawing on a plane, or a thick see-through loop. These come in smaller
        // than thin wire, or their bands would cover the sculptures behind them.
        part.flat =
          Math.min(thin.x, thin.y, thin.z) < Math.max(thin.x, thin.y, thin.z) * 0.02 || !!material?.transparent;
        foreground.push({
          parts: [part],
          unit: 1 / part.longest,
          front: true,
          hero: false,
          scale: 1,
          turn: THREE.MathUtils.degToRad(spec.turn || 0),
        });
      } else {
        if (isSpin(mesh.name) || isSpin(mesh.parent?.name)) {
          // A flat part that turns in its own plane, like a wheel: its thinnest side is the axle.
          const box = new THREE.Box3().setFromObject(part.pivot).getSize(new THREE.Vector3());
          part.axle = box.x <= box.y && box.x <= box.z ? 'x' : box.y <= box.z ? 'y' : 'z';
        }
        parts.push(part);
      }
    }
    // On small screens only the largest parts are kept; they carry the shape.
    parts = parts.sort((a, b) => b.longest - a.longest).slice(0, maxParts);
  } else {
    parts.push(toPart(gltf.scene));
  }
  if (!parts.length) return foreground;

  // The sculpture's extent: where its parts sit, padded by a typical part. Measured
  // from centres so one oversized part cannot shrink everything else.
  const bounds = new THREE.Box3();
  parts.forEach((p) => bounds.expandByPoint(p.centre));
  // Centred on the middle part on each axis, so one part set far off does not pull
  // the sculpture's centre away from its body.
  const mid = (axis) => parts.map((p) => p.centre[axis]).sort((a, b) => a - b)[Math.floor(parts.length / 2)];
  const centre = new THREE.Vector3(mid('x'), mid('y'), mid('z'));
  const spread = bounds.getSize(new THREE.Vector3());
  const typical = parts.map((p) => p.longest).sort((a, b) => a - b)[Math.floor(parts.length / 2)];
  const longest =
    parts.length === 1 ? parts[0].longest : Math.max(spread.x, spread.y, spread.z) + typical;

  for (const part of parts) {
    if (spec.recolor) recolor(part.pivot, token(spec.recolor, '#000000'));
    if (spec.neon) neon(part.pivot, token(spec.neon[0], '#ffffff'), token(spec.neon[1], '#ff0000'));
    part.home = part.centre.clone().sub(centre);
  }
  return [
    {
      parts,
      unit: 1 / longest,
      hero: !!spec.hero,
      scatter: !!spec.scatter && !spec.split,
      scale: spec.scale || 1,
      turn: THREE.MathUtils.degToRad(spec.turn || 0),
    },
    ...foreground,
  ];
}

export function createField(container, { models, reducedMotion }) {
  const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  // Per split sculpture. High enough to keep every piece of the works shown now (Woodland
  // Be[AR] has 54, the Shaman 46): a lower number on phones dropped their small pieces.
  const maxParts = mobile ? 64 : 120;
  const lens = hasLens; // depth of field; phones get the haze only
  const random = rng(11);
  const ground = new THREE.Color(token('--ground', '#ff3314'));

  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  // Haze: sculptures further back sink into the ground colour.
  scene.fog = new THREE.Fog(ground, HAZE.page[0], HAZE.page[1]);

  // Lens: sharp at the focal plane (z = 0) on the page, and wherever it is pointed in flight.
  // The scene is drawn into a target that keeps its depth, which the lens reads (lens.js).
  let composer = null;
  let dof = null;
  if (lens) {
    composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(1, 1, {
        samples: 4,
        type: THREE.HalfFloatType,
        depthTexture: new THREE.DepthTexture(1, 1),
      }),
    );
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.addPass(new RenderPass(scene, camera));
    // With the lens on, the canvas paints the ground itself: the blur needs an opaque frame.
    scene.background = ground;
    dof = new LensPass(camera);
    composer.addPass(dof);
    composer.addPass(new OutputPass());
  }

  // Lit pieces take the site's palette: saffron from above, oxblood from below.
  scene.add(new THREE.HemisphereLight(token('--light-sky', '#ffb31a'), token('--light-floor', '#7a1004'), 2.4));
  const key = new THREE.DirectionalLight(0xfff1e6, 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);

  // three.js bundles its own Draco decoder (fingerprinted by Vite), so no path is needed.
  const draco = new DRACOLoader();
  const loader = new GLTFLoader().setDRACOLoader(draco);

  const floaters = []; // every part
  const clusters = []; // every sculpture
  const tmp = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const pointer = new THREE.Vector2(0, 0);
  let pointerActive = false;
  let hovered = null;
  let running = false;

  // Tilt: a smoothed lean from -1 to 1 on each axis, recentred around however
  // the phone is being held, so it answers changes in angle, not the angle itself.
  const tilt = new THREE.Vector2();
  const tiltTarget = new THREE.Vector2();
  let tiltListening = false;
  let baseline = null;
  const isPaused = () => motion.get().userPaused || motion.get().embedPaused;
  let frame = 0;
  let last = performance.now();

  // Free camera.
  let flying = false;
  let returning = false; // easing back to the page's camera after a flight
  let yaw = 0;
  let pitch = 0;
  let glide = 0; // distance still to travel from the scroll wheel
  let drag = null;
  let flyHome = motion.get().flyHome;
  let flyMix = 0; // 0 on the page, 1 in flight: sculptures in their zones, haze drawn back
  let shownMix = -1;
  let waveT = -1; // the time the line to follow was last drawn for
  let focus = CAM_Z; // how far away the lens is focused on the tour
  const flyAim = new THREE.Vector2(0.5, 0.5); // where the pointer is on screen in flight, y up
  const plateAt = new THREE.Vector3();
  let lensClock = performance.now(); // the lens eases by time, so a slow frame does not slow the focus
  let touring = false; // riding the dashed line by scrolling
  let tourS = 0; // how far along the line the camera is
  let tourTo = 0; // how far along the visitor has scrolled it
  let tourShown = -1; // the place on the tour last sent to the flight's roadmap
  let glance = { yaw: 0, pitch: 0 }; // looking aside from the tour's own view, by dragging
  const tourEye = new THREE.Vector3();
  const tourLook = new THREE.Vector3();
  let scenery = null;
  let placed = false;
  const pagePlace = new THREE.Vector3();
  let heldT = performance.now() / 1000; // the sculptures' clock, held while paused in flight
  const keys = new Set();
  const velocity = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const lookM = new THREE.Matrix4();
  const lookQ = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  let view = { w: 10, h: 10 };

  const raycaster = new THREE.Raycaster();

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setSize(w, h);
    }
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAM_Z;
    view = { w: height * camera.aspect, h: height };
    if (!running) render();
  }

  // Screen heights the sculptures are spread over; scrolling wraps inside it. Roughly a
  // screen each, so one sculpture reads at a time. The wrap happens well off screen.
  // place() lengthens it when there are more sculptures than it was first set for (`PER`
  // screens each), so adding a work does not crowd the others.
  let BAND = 3.2;
  const PER = 0.64;
  const BAND_TOP = -1.0;
  // How far a split sculpture's parts sit from their true place: almost put together, just
  // a little exploded. `spread` eases every part straight out from the centre (1 = assembled),
  // `nudge` and `turn` add a trace of disorder. Quinn wants these small.
  const LOOSE = { spread: 1.08, nudge: 0.008, turn: 0.04 };

  function place(sculptures) {
    const k = mobile ? 0.62 : 1; // sizes on a narrow screen
    // Heroes open the composition on the right of the first screen, beside the title.
    // Then the split sculptures, largest first, then the single pieces.
    const heroes = sculptures.filter((s) => s.hero);
    const fronts = sculptures.filter((s) => s.front);
    // Scattered pieces (`scatter` in project.js) are small and sit among the sculptures:
    // they take no place in the column, so they do not push the sculptures apart.
    const scattered = sculptures.filter((s) => s.scatter);
    BAND = Math.max(BAND, sculptures.filter((s) => !s.front && !s.scatter).length * PER);
    // The split sculptures are spaced evenly down the page, with single pieces between.
    const others = sculptures.filter((s) => !s.hero && !s.front && !s.scatter);
    const wholes = others.filter((s) => s.parts.length > 1).sort((a, b) => b.parts.length - a.parts.length);
    const singles = others.filter((s) => s.parts.length === 1).sort(() => random() - 0.5);
    const rest = [];
    const gap = Math.max(1, Math.ceil(others.length / Math.max(1, wholes.length)));
    while (wholes.length || singles.length) {
      if (wholes.length && (rest.length % gap === 0 || !singles.length)) rest.push(wholes.shift());
      else rest.push(singles.shift());
    }

    // Depths for the rest, in turn: all close to the focal plane, so they stay sharp and large.
    const depths = [-0.4, -1.6, 0.8, -2.6, 0.2, -1.2, 1.2, -2.2];
    let frontIndex = 0;
    let heroIndex = 0;
    let wholeSide = 1; // sculptures alternate sides; single pieces keep to the other side
    let scatterIndex = 0;
    // Scattered pieces stand at these depths in turn, near enough to the focal plane to stay sharp.
    const scatterDepths = [-2.4, 0.8, -1.2, 1.8, -3.2, -0.4, 1.2, -1.8];

    [...heroes, ...rest, ...fronts, ...scattered].forEach((s) => {
      const group = new THREE.Group();
      const whole = s.parts.length > 1;
      let base;
      let size;
      if (s.front) {
        // Close to the camera and far larger than the screen there, so the lines cross
        // the whole view and leave by its edges. Each takes a side, spaced down the page.
        const n = Math.max(1, fronts.length);
        const z = 7.2 + (frontIndex % 3) * 0.9;
        const across = ((CAM_Z - z) / CAM_Z) * 14; // rough view width at that depth
        // Wire is thin, so it comes in far larger than a broad loop or a flat drawing does.
        const flat = s.parts[0].flat;
        size = across * (flat ? (mobile ? 1.5 : 1.2) : mobile ? 2.2 : 2.7 + random() * 0.4);
        base = new THREE.Vector3(
          (frontIndex % 2 ? -1 : 1) * (0.1 + random() * 0.16),
          0.35 + ((frontIndex + random() * 0.3) / n) * BAND,
          z,
        );
        frontIndex += 1;
      } else if (s.scatter) {
        // Lightly scattered: spread evenly down the whole column, to either side in turn,
        // anywhere from near the middle to near the edge. Small (see `fill` below).
        const n = Math.max(1, scattered.length);
        size = 3 * k * s.scale; // refitted to the screen below
        base = new THREE.Vector3(
          (scatterIndex % 2 ? -1 : 1) * (mobile ? 0.12 + random() * 0.26 : 0.1 + random() * 0.34),
          0.15 + ((scatterIndex + random() * 0.7) / n) * BAND,
          scatterDepths[scatterIndex % scatterDepths.length],
        );
        s.turn = random() * Math.PI * 2; // any side to the page
        // Cut-out cards with thin lines (strings of beads): coverage keeps the lines whole
        // at this small size, where a plain alpha test thins them to nothing.
        s.parts[0].pivot.traverse((o) => {
          const m = o.isMesh && (Array.isArray(o.material) ? o.material[0] : o.material);
          if (m && m.alphaTest > 0) m.alphaToCoverage = true;
        });
        scatterIndex += 1;
      } else if (s.hero) {
        size = (mobile ? 4.6 : 8.2) * s.scale; // refitted to the screen below
        base = new THREE.Vector3(
          mobile ? 0.18 : 0.26 - heroIndex * 0.5,
          mobile ? 0.62 : 0.4 + heroIndex * 0.6,
          -1.5 - heroIndex * 2,
        );
        heroIndex += 1;
      } else {
        const i = clusters.length - heroes.length;
        const n = Math.max(1, rest.length);
        if (whole) wholeSide = -wholeSide;
        const side = whole ? wholeSide : -wholeSide;
        size = (whole ? 11 + random() * 1.5 : 6 + random() * 1) * k * s.scale; // refitted to the screen below
        base = new THREE.Vector3(
          side * (mobile ? 0.04 + random() * 0.1 : whole ? 0.14 + random() * 0.08 : 0.16 + random() * 0.16), // fraction of view width
          0.7 + ((i + random() * 0.2) / n) * BAND,                          // fraction of view height, wraps
          depths[i % depths.length],
        );
      }
      const nearness = THREE.MathUtils.clamp(1 + base.z / 8, 0, 1.9); // 1 at the focal plane
      const steady = whole || s.front || s.hero || s.scatter; // these keep facing the page and only rock (a scattered flower stays upright)
      const cluster = {
        group,
        base,
        size,
        whole,
        front: !!s.front,
        scatter: !!s.scatter,
        turn: s.turn,
        work: s.work,
        // In the free camera a sculpture can be larger and hang higher than on the page
        // (`flight: { scale, lift }` in project.js).
        flightScale: s.flight?.scale || 1,
        flightLift: s.flight?.lift || 0,
        backdrop: s.flight?.backdrop,
        title: s.title,
        // Single pieces tumble slowly, so every side comes round. Sculptures only rock.
        spin: steady
          ? new THREE.Vector3()
          : new THREE.Vector3((random() - 0.5) * 0.14, (random() - 0.5) * 0.26, (random() - 0.5) * 0.08),
        sway: s.front ? 0.12 : steady ? 0.16 : 0,
        phase: random() * Math.PI * 2,
        nearness,
        parallax: 0.35 + nearness * 0.9, // near sculptures move more with scroll
        lean: new THREE.Vector2(),
      };
      cluster.rot = s.front
        ? new THREE.Vector3((random() - 0.5) * 0.3, cluster.turn + (random() - 0.5) * 0.5, (random() - 0.5) * 0.9)
        : steady
        ? new THREE.Vector3((random() - 0.5) * 0.12, cluster.turn, (random() - 0.5) * 0.1)
        : new THREE.Vector3(random() * Math.PI, random() * Math.PI * 2, (random() - 0.5) * 0.6);

      const extent = 1 / s.unit; // the sculpture's size in its own units
      const placed = [];
      for (const part of s.parts) {
        // A little exploded: eased straight outward, with barely any nudge or turn.
        const home = whole
          ? part.home
              .clone()
              .multiplyScalar(LOOSE.spread)
              .add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(extent * LOOSE.nudge))
          : new THREE.Vector3();
        const rest = whole
          ? new THREE.Euler((random() - 0.5) * LOOSE.turn, (random() - 0.5) * LOOSE.turn, (random() - 0.5) * LOOSE.turn)
          : new THREE.Euler();
        part.pivot.position.copy(home);
        part.pivot.rotation.copy(rest);
        group.add(part.pivot);
        placed.push({ part, home, rest });
      }

      if (s.front) {
        group.traverse((o) => {
          const m = o.isMesh && (Array.isArray(o.material) ? o.material[0] : o.material);
          // A see-through plane must not write depth over its whole rectangle, or the lens
          // would treat the empty part as a wall. Cut-outs (alphaTest) write only where drawn.
          if (m && m.transparent && !(m.alphaTest > 0)) m.depthWrite = false;
        });
      } else {
        // As large as the screen allows with the whole sculpture still in view, so it is
        // recognised: measured as it faces the page, then fitted to the view's height and width.
        group.rotation.set(cluster.rot.x, cluster.rot.y, cluster.rot.z);
        group.scale.setScalar(s.unit);
        group.updateMatrixWorld(true);
        // The extent is the body: where most parts sit (the spread of their centres with the
        // outermost few left out, padded by a typical part) or the largest single part,
        // whichever is greater. A stray orb or a statue set far off may leave the screen;
        // it must not shrink the figure at the centre.
        const biggest = new THREE.Vector3();
        const partBox = new THREE.Box3();
        const partSize = new THREE.Vector3();
        const sizes = [];
        const at = [];
        for (const { part } of placed) {
          partBox.setFromObject(part.pivot);
          at.push(partBox.getCenter(new THREE.Vector3()));
          partBox.getSize(partSize);
          biggest.max(partSize);
          sizes.push(Math.max(partSize.x, partSize.y, partSize.z));
        }
        const typical = sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)];
        const body = (axis) => {
          const v = at.map((p) => p[axis]).sort((a, b) => a - b);
          const middle = v[Math.floor(v.length / 2)];
          const off = v.map((x) => Math.abs(x - middle)).sort((a, b) => a - b);
          return 2 * off[Math.floor((off.length - 1) * 0.85)] + (v.length > 1 ? typical : 0);
        };
        // Never less than 60% of the full bounds, so a loose scene is not blown up past the screen.
        const full = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()).multiplyScalar(0.6);
        const dims = new THREE.Vector3(body('x'), body('y'), body('z')).max(biggest).max(full);
        // single pieces tumble, so they stay smaller; scattered pieces are small on purpose
        const fill = s.scatter ? (mobile ? 0.34 : 0.44) : whole || s.hero ? 1 : 0.6;
        const maxH = view.h * 0.9 * fill;
        const maxW = view.w * (mobile ? 0.92 : 0.64) * fill;
        size = Math.min(maxH / (dims.y || 1), maxW / (dims.x || 1)) * (0.94 + random() * 0.06) * s.scale;
        cluster.size = size;
        // Its width and height on screen, for laying out its zone. A piece that tumbles
        // needs room for its longest side.
        const longest = Math.max(dims.x, dims.y, dims.z);
        cluster.w = (steady ? dims.x : longest) * size;
        cluster.h = (steady ? dims.y : longest) * size;
      }
      group.scale.setScalar(size * s.unit);
      cluster.scale = size * s.unit;

      for (const { part, home, rest } of placed) {
        floaters.push({
          piece: part.pivot,
          cluster,
          home,
          rest,
          radius: (part.longest * size * s.unit) / 2, // world units
          phase: random() * Math.PI * 2,
          axle: part.axle,
          bob: whole ? extent * (0.008 + random() * 0.014) : 0,
          speed: 0.25 + random() * 0.35,
          turnBy: new THREE.Vector3(),
          kick: new THREE.Vector3(),
          push: new THREE.Vector3(),
          swell: 1,
        });
      }
      scene.add(group);
      clusters.push(cluster);
    });
  }

  function layout(t) {
    const scroll = window.scrollY / window.innerHeight; // in screen heights
    const mix = flyMix * flyMix * (3 - 2 * flyMix); // eased
    applyMix(mix);
    if (bed) {
      bed.visible = mix > 0;
      bedGrow.value = mix;
    }
    if (scenery && mix > 0 && t !== waveT) scenery.wave((waveT = t));
    for (const c of clusters) {
      const depthScale = (CAM_Z - c.base.z) / CAM_Z;
      let y = c.base.y - scroll * c.parallax * 0.55; // rise with the page, slower when far
      y = ((((y - BAND_TOP) % BAND) + BAND) % BAND) + BAND_TOP; // wrap inside the band
      const x = c.base.x * view.w * depthScale;
      const yy = (0.5 - y) * view.h * depthScale;
      const still = reducedMotion ? 0 : 1;
      const bob = Math.sin(t * 0.22 + c.phase) * 0.18 * still;
      c.group.position.set(x + c.lean.x, yy + bob + c.lean.y, c.base.z);
      c.group.rotation.set(c.rot.x, c.rot.y + Math.sin(t * 0.13 + c.phase) * c.sway * still, c.rot.z);
      if (mix > 0 && c.zone) {
        // In flight it leaves the page's column for its place in its work's zone, turned
        // to face the centre.
        pagePlace.copy(c.zone.at);
        pagePlace.y += bob;
        c.group.position.lerp(pagePlace, mix);
        c.group.rotation.y += c.zone.yaw * mix;
        c.group.scale.setScalar(c.scale * (1 + (c.flightScale - 1) * mix));
      } else if (c.scatter) {
        // A scattered piece leaves the air as the flight opens: the same flowers stand in
        // the bed along the tour's line there.
        c.group.scale.setScalar(Math.max(c.scale * (1 - mix), 1e-6));
        c.group.visible = mix < 0.999;
      } else if (c.group.scale.x !== c.scale) {
        c.group.scale.setScalar(c.scale);
      }
    }
    for (const f of floaters) {
      const bob = reducedMotion ? 0 : Math.sin(t * f.speed + f.phase) * f.bob;
      f.piece.position.set(f.home.x + f.push.x, f.home.y + f.push.y + bob, f.home.z + f.push.z);
      f.piece.rotation.set(f.rest.x + f.turnBy.x, f.rest.y + f.turnBy.y, f.rest.z + f.turnBy.z);
      if (f.axle && !reducedMotion) f.piece.rotation[f.axle] += t * SPIN;
    }
  }

  /**
   * Gives each work a zone on an arc ahead of the camera, and each of its sculptures a
   * place there: side by side in a row across the zone, facing the centre. The work's
   * foreground parts (wire, spirit lines) hang over the row.
   */
  function planZones() {
    const works = [];
    for (const c of clusters) {
      // Scattered pieces take no zone: in flight they stay where the page has them, round
      // the middle, so a work's small pieces do not become the widest zone and lead the tour.
      if (c.scatter) continue;
      let zone = works.find((z) => z.work === c.work);
      if (!zone) works.push((zone = { work: c.work, title: c.title, members: [], fronts: [] }));
      (c.front ? zone.fronts : zone.members).push(c);
    }
    const found = works.filter((z) => z.members.length);
    for (const z of found) {
      z.width = z.members.reduce((sum, c) => sum + c.w * c.flightScale, 0) + ZONES.gap * (z.members.length - 1);
      z.height = Math.max(...z.members.map((c) => c.h * c.flightScale));
      z.radius = Math.max(9, z.width / 2 + ZONES.pad);
      // The zone hangs as high, or sinks as low, as its member that goes furthest.
      z.backdrop = z.members.find((c) => c.backdrop)?.backdrop;
      z.lift = z.members.map((c) => c.flightLift).reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
      // Where the title goes: just under the sculptures, or just over them when the zone is
      // sunk below the camera, so it is read on the way down.
      z.floor = z.lift < 0 ? z.lift + z.height / 2 + 2 : z.lift - z.height / 2 - 0.8;
    }
    // The widest zone sits straight ahead, the next ones to its right and left in turn.
    // A zone that hangs high or sits low goes after those at eye level, so the first thing
    // the camera faces is a work, not the empty air under or over one.
    const zones = [];
    found
      .sort((a, b) => (a.lift !== 0) - (b.lift !== 0) || b.width - a.width)
      .forEach((z, i) => (i % 2 ? zones.push(z) : zones.unshift(z)));
    // Far enough out that neighbouring zones never touch.
    const step = Math.min(THREE.MathUtils.degToRad(ZONES.step), (Math.PI * 2) / zones.length);
    let reach = ZONES.out;
    for (let i = 1; i < zones.length; i += 1) {
      reach = Math.max(reach, (zones[i - 1].radius + zones[i].radius + ZONES.gap) / (2 * Math.sin(step / 2)));
    }
    const ahead = zones.indexOf(found[0]); // the first in that order faces the camera
    zones.forEach((z, i) => {
      const a = (i - ahead) * step; // 0 is straight ahead
      z.centre = new THREE.Vector3(Math.sin(a) * reach, 0, -Math.cos(a) * reach);
      const across = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      let x = -z.width / 2;
      for (const c of z.members) {
        const w = c.w * c.flightScale;
        c.zone = { at: z.centre.clone().addScaledVector(across, x + w / 2).setY(c.flightLift), yaw: -a };
        x += w + ZONES.gap;
      }
      z.fronts.forEach((c, j) => {
        const at = z.centre.clone().addScaledVector(across, ((j % 3) - 1) * z.radius * 0.45);
        at.y = z.lift + z.height * (-0.25 + ((j * 0.37) % 1) * 0.7);
        c.zone = { at, yaw: -a };
      });
    });
    return zones;
  }

  // The flower bed: in flight, the scattered pieces (the beaded flowers) are planted along
  // the tour's line, so the camera rides over a lush bed and every work is seen across
  // flowers. Quinn asked for the flowers in the foreground on the tour, lush and vibrant,
  // and not placed at random. So it is planted like a garden: rows that follow the line,
  // each row in drifts of one flower at a time, low next to the line and taller further out.
  //   rows: [across, tall]: how far a row runs from the line, toward the works (negative
  //         is the inner side), and how tall its flowers stand. The camera rides `under`
  //         above the line, so the tops stay below its eye and the works show over them.
  //   step: the space between flowers along a row. drift: how far one flower runs along a
  //         row before the next takes over. sink: how far below the line the bed is rooted.
  //   glow: how much of their own colour the beads give off, so they stay vivid in the haze.
  const BED = {
    rows: [[-4.2, 2.1], [-2.4, 1.7], [2.2, 1.5], [3.7, 1.7], [5.3, 1.9], [7.1, 2.1], [9.1, 2.2], [11.4, 2.1], [14, 2.0]],
    step: mobile ? 3 : 1.5,
    drift: 14,
    sink: 1.6,
    glow: 0.4,
  };
  let bed = null;
  const bedGrow = { value: 0 }; // 0 flat on the line, 1 full height: the bed grows as the flight opens
  function plantBed(line) {
    // One kind of flower from each scattered piece: its shape, and its material made brighter.
    const kinds = [];
    for (const c of clusters) {
      if (!c.scatter) continue;
      c.group.traverse((o) => {
        if (!o.isMesh || kinds.some((k) => k.geometry === o.geometry)) return;
        o.geometry.computeBoundingBox();
        const box = o.geometry.boundingBox;
        const material = o.material.clone();
        material.emissive = new THREE.Color(0xffffff);
        material.emissiveMap = material.map;
        material.emissiveIntensity = BED.glow;
        material.alphaToCoverage = true;
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uGrow = bedGrow;
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nuniform float uGrow;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed *= uGrow;');
        };
        // A wide, flat piece (the spray) stands like a banner: it goes in the far rows only.
        const size = box.getSize(new THREE.Vector3());
        kinds.push({ geometry: o.geometry, material, foot: box.min.y, height: size.y, banner: Math.min(size.x, size.z) < size.y * 0.05, at: [] });
      });
    }
    if (!kinds.length) return;
    const plain = kinds.filter((k) => !k.banner);
    const long = line.getLength();
    const place = new THREE.Vector3();
    const along = new THREE.Vector3();
    const out = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const pick = rng(31);
    BED.rows.forEach(([across, tall], r) => {
      const far = r >= BED.rows.length - 2;
      const count = Math.floor(long / BED.step);
      for (let i = 0; i < count; i += 1) {
        const u = (i + (r % 2) * 0.5) / count; // each row half a step on from the last
        line.getPointAt(u % 1, place);
        line.getTangentAt(u % 1, along);
        // Out is away from the middle of the ring, where the works stand.
        out.set(place.x, 0, place.z).normalize();
        // One flower for a drift's length, a different one in the next row.
        const drift = Math.floor((u * long) / BED.drift) + r * 3;
        const list = far ? kinds : plain.length ? plain : kinds;
        const kind = list[drift % list.length];
        const size = (tall / kind.height) * (0.9 + pick() * 0.2);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(place.x, place.y - BED.sink - kind.foot * size, place.z)
            .addScaledVector(out, across + (pick() - 0.5) * 0.3)
            .addScaledVector(along, (pick() - 0.5) * 0.3),
          turn.setFromAxisAngle(up, pick() * Math.PI * 2),
          new THREE.Vector3(size, size, size),
        );
        kind.at.push(m);
      }
    });
    bed = new THREE.Group();
    for (const kind of kinds) {
      if (!kind.at.length) continue;
      const mesh = new THREE.InstancedMesh(kind.geometry, kind.material, kind.at.length);
      kind.at.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.frustumCulled = false; // the bed runs all round the camera
      bed.add(mesh);
    }
    bed.visible = false;
    scene.add(bed);
  }

  /** Builds the zones' titles and the far scenery, once, the first time someone flies. */
  function ensureScenery() {
    if (scenery || !placed || !clusters.length) return;
    scenery = buildScenery({
      zones: planZones(),
      token,
      random: rng(23),
      view: { fov: camera.fov, aspect: camera.aspect },
    });
    plantBed(scenery.line);
    if (motion.get().flyTour) setTour(true);
    scenery.group.visible = false;
    scene.add(scenery.group);
    shownMix = -1;
  }

  /** Sets the haze, the draw distance and the zones' titles for how far into flight it is. */
  function applyMix(mix) {
    if (scenery) {
      for (const o of scenery.facing) o.quaternion.copy(camera.quaternion);
      for (const o of scenery.upright) {
        o.rotation.y = Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z);
      }
    }
    if (dof) {
      const now = performance.now();
      const dt = Math.min((now - lensClock) / 1000, 0.1);
      lensClock = now;
      // On the tour the lens holds the work nearest the middle of the view and eases from one
      // to the next. It focuses between the work and its title plate, which hangs a few units
      // toward the middle of the ring, so the two read sharp together.
      let target = CAM_Z;
      if (mix > 0) {
        camera.getWorldDirection(tmp);
        let best = -Infinity;
        for (const c of clusters) {
          if (c.front || c.scatter) continue;
          const along = pagePlace.copy(c.group.position).sub(camera.position).dot(tmp);
          const aim = along / (pagePlace.length() || 1); // 1 when dead ahead
          if (along > 1 && aim > best) {
            best = aim;
            target = along;
            const plate = scenery?.links.find((p) => p.userData.work === c.work);
            if (plate) {
              const onPlate = plate.getWorldPosition(plateAt).sub(camera.position).dot(tmp);
              if (onPlate > 1) target = (along + onPlate) / 2;
            }
          }
        }
      }
      focus += (target - focus) * (mix > 0 && shownMix > 0 ? 1 - Math.exp(-dt * 3.2) : 1);
      dof.focus.explicit = THREE.MathUtils.lerp(CAM_Z, focus, mix);
      // In free roam the focus follows the pointer, like an autofocus: whatever is under it
      // comes sharp and the rest softens. Quinn asked for this.
      dof.focus.mouse = flying && !touring && mix > 0.5;
      dof.focus.rate = 1 - Math.exp(-dt * 9);
      dof.focus.point.copy(flyAim);
    }
    if (mix === shownMix) return;
    shownMix = mix;
    if (dof) {
      for (const key of Object.keys(LENS.page)) dof.lens[key] = THREE.MathUtils.lerp(LENS.page[key], LENS.flight[key], mix);
    }
    scene.fog.near = THREE.MathUtils.lerp(HAZE.page[0], HAZE.flight[0], mix);
    scene.fog.far = THREE.MathUtils.lerp(HAZE.page[1], HAZE.flight[1], mix);
    const far = mix > 0 ? HAZE.far : 100;
    if (camera.far !== far) {
      camera.far = far;
      camera.updateProjectionMatrix();
    }
    if (scenery) {
      scenery.group.visible = mix > 0;
      for (const g of scenery.zones) g.scale.setScalar(Math.max(mix, 0.0001));
    }
  }

  function render(t = performance.now() / 1000) {
    layout(t);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    // In flight the loop runs even when motion is paused or reduced, because the visitor
    // is moving the camera. The sculptures themselves hold still then.
    const held = flying && (isPaused() || reducedMotion);
    if (!held) heldT = now / 1000;
    const t = heldT;

    tilt.lerp(tiltTarget, 0.08);

    // Opening out into the zones, or closing back to the page.
    const mixTo = flying ? 1 : 0;
    if (flyMix !== mixTo) {
      flyMix += (mixTo - flyMix) * (1 - Math.exp(-dt * 2.4));
      if (Math.abs(mixTo - flyMix) < 0.002) flyMix = mixTo;
    }

    if (flying) {
      flyStep(dt);
    } else {
      // Camera leans toward the pointer, or with the phone.
      const leanX = (pointerActive ? pointer.x : 0) * 0.8 + tilt.x * 1.4;
      const leanY = (pointerActive ? pointer.y : 0) * 0.5 + tilt.y * 1.0;
      const ease = returning ? 0.07 : 0.04;
      camera.position.x += (leanX - camera.position.x) * ease;
      camera.position.y += (leanY - camera.position.y) * ease;
      if (returning) {
        camera.position.z += (CAM_Z - camera.position.z) * ease;
        lookQ.setFromRotationMatrix(lookM.lookAt(camera.position, LOOK_AT, camera.up));
        camera.quaternion.slerp(lookQ, 0.08);
        if (camera.quaternion.angleTo(lookQ) < 0.002 && Math.abs(camera.position.z - CAM_Z) < 0.01) {
          returning = false;
          camera.position.z = CAM_Z;
        }
      } else {
        camera.lookAt(LOOK_AT);
      }
    }

    for (const c of clusters) {
      if (!held) c.rot.addScaledVector(c.spin, dt);
      // Tilt slides sculptures downhill, near ones furthest, like things floating in water.
      const slide = 0.5 + c.nearness * 1.3;
      c.lean.x += (tilt.x * slide - c.lean.x) * 0.05;
      c.lean.y += (tilt.y * slide - c.lean.y) * 0.05;
    }

    const TAU = Math.PI * 2;
    for (const f of floaters) {
      const p = f.piece;
      const g = f.cluster.group;

      // A tapped part spins, slows, then turns back to where it rests.
      f.turnBy.addScaledVector(f.kick, dt);
      f.kick.multiplyScalar(Math.pow(0.35, dt));
      if (f.kick.lengthSq() < 0.05) {
        const back = 1 - Math.exp(-dt * 1.6);
        f.turnBy.x += (Math.round(f.turnBy.x / TAU) * TAU - f.turnBy.x) * back;
        f.turnBy.y += (Math.round(f.turnBy.y / TAU) * TAU - f.turnBy.y) * back;
        f.turnBy.z += (Math.round(f.turnBy.z / TAU) * TAU - f.turnBy.z) * back;
      }

      // Drift away from a nearby pointer, then ease home. Measured at the part's own depth.
      p.getWorldPosition(tmp);
      const depthScale = (CAM_Z - tmp.z) / CAM_Z;
      const scale = g.scale.x;
      const dx = tmp.x - pointer.x * view.w * 0.5 * depthScale;
      const dy = tmp.y - pointer.y * view.h * 0.5 * depthScale;
      const dist = Math.hypot(dx, dy);
      const reach = 1.4 + f.radius;
      tmp.set(0, 0, 0);
      if (pointerActive && !flying && dist < reach) {
        const strength = (1 - dist / reach) * 0.8;
        // World push, turned into the sculpture's own space
        tmp.set((dx / (dist || 1)) * strength, (dy / (dist || 1)) * strength, 0)
          .applyQuaternion(tmpQ.copy(g.quaternion).invert())
          .divideScalar(scale);
      }
      f.push.lerp(tmp, 0.06);

      const swellTo = f === hovered ? 1.12 : 1;
      f.swell += (swellTo - f.swell) * 0.12;
      p.scale.setScalar(f.swell);
    }

    render(t);
  }

  /** In flight the visitor can switch the depth of field off. The page always has it. */
  function setLens() {
    if (!dof) return;
    const on = !flying || motion.get().flyLens;
    if (dof.enabled === on) return;
    dof.enabled = on;
    if (on) dof.snap = true; // it was not following while off: go straight to the focus
    if (!running) render();
  }

  /** Starts or ends the tour. It starts from the nearest place on the line to the camera. */
  function setTour(on) {
    on = on && flying && !!scenery;
    if (on === touring) return;
    touring = on;
    tourShown = -1;
    glide = 0;
    velocity.set(0, 0, 0);
    glance = { yaw: 0, pitch: 0 };
    if (on && flyMix < 0.5) {
      // Coming in from the page: the tour begins at the work straight ahead.
      tourS = tourTo = scenery.tour.start;
    } else if (on) {
      let near = Infinity;
      for (let s = 0; s < scenery.tour.length; s += 2) {
        scenery.tour.poseAt(s, tourEye, tourLook);
        const d = tourEye.distanceToSquared(camera.position);
        if (d < near) {
          near = d;
          tourS = s;
        }
      }
      tourTo = tourS;
    } else {
      // Free flight carries on from where the tour was looking (less the tilt, which is
      // added back each frame).
      euler.setFromQuaternion(camera.quaternion, 'YXZ');
      yaw = euler.y + tilt.x * TILT_LOOK.yaw;
      pitch = euler.x - tilt.y * TILT_LOOK.pitch;
    }
  }

  /** One frame of the tour: along the line by keys or joystick, then ease the camera to it. */
  function tourStep(dt) {
    const down = (...codes) => (codes.some((c) => keys.has(c)) ? 1 : 0);
    const push = Math.max(down('KeyW', 'ArrowUp', 'ArrowRight'), motion.get().flyForward ? 1 : 0) - down('KeyS', 'ArrowDown', 'ArrowLeft') + flyStick.y;
    tourTo += push * TOUR.keys * (down('ShiftLeft', 'ShiftRight') ? FLY.boost : 1) * dt;
    tourS += (tourTo - tourS) * (1 - Math.exp(-dt * TOUR.ease));
    scenery.tour.poseAt(tourS, tourEye, tourLook);
    // The flight's roadmap follows: FlyMode.jsx draws a leg for each work.
    const where = scenery.tour.where(tourS);
    if (Math.abs(where - tourShown) > 0.002) {
      tourShown = where;
      window.dispatchEvent(new CustomEvent('field:tour', { detail: { works: scenery.tour.works, at: where } }));
    }
    camera.position.lerp(tourEye, 1 - Math.exp(-dt * 3.5));
    lookQ.setFromRotationMatrix(lookM.lookAt(camera.position, tourLook, camera.up));
    if (!drag) {
      // A glance aside drifts back to the tour's view once the hand lets go.
      const back = Math.exp(-dt * 1.6);
      glance.yaw *= back;
      glance.pitch *= back;
    }
    euler.setFromQuaternion(lookQ, 'YXZ');
    euler.y += glance.yaw - tilt.x * TILT_LOOK.yaw;
    euler.x = THREE.MathUtils.clamp(euler.x + glance.pitch + tilt.y * TILT_LOOK.pitch, -FLY.pitch, FLY.pitch);
    euler.z = 0;
    lookQ.setFromEuler(euler);
    camera.quaternion.slerp(lookQ, 1 - Math.exp(-dt * 3)); // unhurried, so the view never snaps
  }

  function flyStep(dt) {
    if (touring) {
      tourStep(dt);
      return;
    }
    const down = (...codes) => (codes.some((c) => keys.has(c)) ? 1 : 0);
    const ahead = Math.max(down('KeyW', 'ArrowUp'), motion.get().flyForward ? 1 : 0) - down('KeyS', 'ArrowDown') + flyStick.y;
    const across = down('KeyD') - down('KeyA') + flyStick.x;
    const rise = down('KeyE') - down('KeyQ');
    yaw += (down('ArrowLeft') - down('ArrowRight')) * FLY.turn * dt;
    // Tilting the phone looks aside from where the drag left the view, and comes back level.
    camera.rotation.set(
      THREE.MathUtils.clamp(pitch + tilt.y * TILT_LOOK.pitch, -FLY.pitch, FLY.pitch),
      yaw - tilt.x * TILT_LOOK.yaw,
      0,
      'YXZ',
    );

    // Forward follows the view, up and down included. E and Q rise and sink straight.
    wish.set(across, 0, -ahead).applyQuaternion(camera.quaternion);
    wish.y += rise;
    if (wish.lengthSq() > 1) wish.normalize();
    wish.multiplyScalar(FLY.speed * (down('ShiftLeft', 'ShiftRight') ? FLY.boost : 1));
    velocity.lerp(wish, 1 - Math.exp(-dt * 5));
    camera.position.addScaledVector(velocity, dt);

    // The wheel gives a push that glides out.
    if (Math.abs(glide) > 0.001) {
      const step = glide * (1 - Math.exp(-dt * 7));
      glide -= step;
      camera.position.addScaledVector(tmp.set(0, 0, -1).applyQuaternion(camera.quaternion), step);
    }
    camera.position.clampLength(0, FLY.reach);
  }

  /** Puts the camera back where the page keeps it, at once. */
  function settle() {
    returning = false;
    flyMix = 0;
    camera.position.set(0, 0, CAM_Z);
    camera.lookAt(LOOK_AT);
  }

  function flyHomeNow() {
    velocity.set(0, 0, 0);
    glide = 0;
    const mix = flyMix;
    settle();
    flyMix = mix;
    euler.setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = euler.y;
    pitch = euler.x;
  }

  const onFlyKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Escape') {
      motion.set({ fly: false, flyTour: false });
      return;
    }
    if (e.target.closest?.('input, select, textarea')) return;
    if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|Shift(Left|Right))$/.test(e.code)) {
      keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    }
  };
  const onFlyKeyUp = (e) => keys.delete(e.code);
  const onFlyBlur = () => {
    keys.clear();
    drag = null;
  };
  const onFlyWheel = (e) => {
    if (e.ctrlKey) return; // a pinch on a trackpad: leave the browser's zoom alone
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (touring) {
      // A sideways scroll on a trackpad moves the tour too, the same way a sideways swipe does.
      tourTo += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : px) * TOUR.wheel;
      return;
    }
    // Scrolling down carries on forward, the way it brought the visitor in.
    glide = THREE.MathUtils.clamp(glide + px * FLY.wheel, -12, 12);
  };
  const onFlyDown = (e) => {
    if (drag || e.target.closest?.(INTERACTIVE)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, touch: e.pointerType === 'touch' };
  };
  const onFlyMove = (e) => {
    if (e.pointerType !== 'touch') flyAim.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    if (!drag) {
      // Over a title the cursor says it is a link.
      if (e.pointerType !== 'touch') {
        const over = !e.target.closest?.(INTERACTIVE) && !!pickTitle(e.clientX, e.clientY);
        document.documentElement.classList.toggle('field-hover', over);
      }
      return;
    }
    if (e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
    if (!drag.moved) return;
    if (touring) {
      // On the tour a finger moves along the line. Quinn watched visitors swipe left and
      // right there, as through a carousel, far more than up and down, so both work: the
      // first movement of a swipe settles which way it goes (`axis`), and the camera
      // follows the finger. Swipe left or up to go on, right or down to go back. A sideways
      // swipe then settles on the next work when the finger lifts (onFlyUp). A mouse has
      // the wheel for moving, so its drag looks aside.
      if (drag.touch) {
        if (!drag.axis) {
          drag.axis = Math.abs(e.clientX - drag.x0) > Math.abs(e.clientY - drag.y0) ? 'x' : 'y';
          drag.from = scenery ? Math.round(scenery.tour.where(tourTo)) : 0; // the work in view when the swipe began
        }
        tourTo -= (drag.axis === 'x' ? dx : dy) * TOUR.swipe;
      } else {
        glance.yaw = THREE.MathUtils.clamp(glance.yaw + dx * FLY.look, -1.2, 1.2);
        glance.pitch = THREE.MathUtils.clamp(glance.pitch + dy * FLY.look, -0.9, 0.9);
      }
      return;
    }
    // The view follows the hand, as in the Aabijijiwan viewer: drag right and the scene turns right.
    yaw += dx * FLY.look;
    pitch = THREE.MathUtils.clamp(pitch + dy * FLY.look, -FLY.pitch, FLY.pitch);
  };
  const onFlyUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const tapped = !drag.moved && e.type === 'pointerup';
    const swipe = drag;
    drag = null;
    if (touring && scenery && swipe.touch && swipe.axis === 'x') {
      // A sideways swipe turns the page: it lands on the next work, or the one before, like
      // a carousel. A short one (under `TOUR.flick` pixels) goes back to the work it left.
      const across = e.clientX - swipe.x0;
      const n = scenery.tour.works.length;
      const step = Math.abs(across) < TOUR.flick ? 0 : across < 0 ? 1 : -1;
      tourTo = scenery.tour.stop((((swipe.from + step) % n) + n) % n, tourTo);
    }
    if (!tapped) return;
    // A tap on a work's title opens its page; FlyMode.jsx does the navigating.
    const work = pickTitle(e.clientX, e.clientY);
    if (work) window.dispatchEvent(new CustomEvent('field:open', { detail: work }));
    else spin(e.clientX, e.clientY);
  };

  // A leg of the flight's roadmap was pressed: the tour travels to that work.
  const onTourGoto = (e) => {
    if (touring && scenery) tourTo = scenery.tour.stop(e.detail, tourS);
  };

  function setFly(on) {
    if (on === flying) return;
    flying = on;
    const listen = on ? 'addEventListener' : 'removeEventListener';
    window[listen]('keydown', onFlyKeyDown);
    window[listen]('keyup', onFlyKeyUp);
    window[listen]('blur', onFlyBlur);
    window[listen]('wheel', onFlyWheel, { passive: false });
    window[listen]('pointerdown', onFlyDown);
    window[listen]('pointermove', onFlyMove);
    window[listen]('pointerup', onFlyUp);
    window[listen]('pointercancel', onFlyUp);
    window[listen]('field:goto', onTourGoto);
    if (!on) touring = false;
    if (!on) document.documentElement.classList.remove('field-hover');
    keys.clear();
    drag = null;
    glide = 0;
    velocity.set(0, 0, 0);
    if (on) {
      returning = false;
      onLeave();
      euler.setFromQuaternion(camera.quaternion, 'YXZ');
      yaw = euler.y;
      pitch = euler.x;
      ensureScenery();
      // With motion paused or reduced, the zones are simply there, with no move into them.
      if (isPaused() || reducedMotion) flyMix = 1;
      start();
    } else if (reducedMotion || isPaused() || !running) {
      settle();
      stop();
      render();
    } else {
      returning = true;
    }
  }

  function start() {
    if (running || document.hidden) return;
    if (!flying && (isPaused() || reducedMotion)) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(floaters.map((f) => f.piece), true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !floaters.some((f) => f.piece === o)) o = o.parent;
    return floaters.find((f) => f.piece === o) || null;
  }

  /** The work whose title plate is under the pointer in flight, or null. Titles are links. */
  function pickTitle(clientX, clientY) {
    if (!scenery || flyMix < 0.5) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1),
      camera,
    );
    return raycaster.intersectObjects(scenery.links, false)[0]?.object.userData.work || null;
  }

  const onMove = (e) => {
    if (flying) return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerActive = true;
    const overContent = e.target.closest?.(INTERACTIVE);
    hovered = overContent ? null : pick(e.clientX, e.clientY);
    document.documentElement.classList.toggle('field-hover', !!hovered);
  };
  const onUp = (e) => {
    // A finger lifting is not a pointer resting on the page.
    if (e.pointerType === 'touch') onLeave();
  };
  const onLeave = () => {
    pointerActive = false;
    hovered = null;
    document.documentElement.classList.remove('field-hover');
  };
  function spin(clientX, clientY) {
    const hit = pick(clientX, clientY);
    if (!hit) return;
    hit.kick.set((random() - 0.5) * 6, 5 + random() * 5, (random() - 0.5) * 3);
    hit.swell = 1.25;
    if (!running) render();
  }
  const onDown = (e) => {
    // In flight a press may be the start of a drag, so a part spins on a tap instead.
    if (flying || e.target.closest?.(INTERACTIVE)) return;
    spin(e.clientX, e.clientY);
  };
  const onScroll = () => {
    if (!running) render();
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const onOrientation = (e) => {
    if (e.beta == null || e.gamma == null) return;
    // Map device axes to screen axes for the current orientation.
    const angle = (screen.orientation?.angle ?? window.orientation ?? 0) % 360;
    let x = e.gamma;
    let y = e.beta;
    if (angle === 90) [x, y] = [e.beta, -e.gamma];
    else if (angle === 270 || angle === -90) [x, y] = [-e.beta, e.gamma];
    else if (angle === 180) [x, y] = [-e.gamma, -e.beta];

    if (!baseline) baseline = { x, y };
    // Recentre slowly, so holding the phone at any angle settles back to calm.
    baseline.x += (x - baseline.x) * 0.02;
    baseline.y += (y - baseline.y) * 0.02;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    tiltTarget.set(clamp((x - baseline.x) / 20), clamp(-(y - baseline.y) / 20));
  };

  function setTilt(on) {
    if (on && !tiltListening && !reducedMotion) {
      window.addEventListener('deviceorientation', onOrientation);
      tiltListening = true;
      baseline = null;
    } else if (!on && tiltListening) {
      window.removeEventListener('deviceorientation', onOrientation);
      tiltListening = false;
      tiltTarget.set(0, 0);
    }
  }

  const unsubscribe = motion.subscribe((s) => {
    setTilt(s.tilt);
    setFly(s.fly);
    setTour(s.flyTour);
    setLens();
    if (s.flyHome !== flyHome) {
      flyHome = s.flyHome;
      if (flying && touring) tourTo = tourS = scenery.tour.start; // back to the first work
      else if (flying) flyHomeNow();
    }
    if (flying) return;
    if (isPaused()) {
      // Paused part way back from a flight: finish the return in one step.
      if (returning) {
        settle();
        render();
      }
      stop();
    } else start();
  });
  setTilt(motion.get().tilt);
  setFly(motion.get().fly);

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  resize();

  let disposed = false;
  Promise.all(
    models.map((spec) =>
      loader.loadAsync(spec.src).then(
        (gltf) => (sculptureFrom(gltf, spec, maxParts) || []).map((s) => ({ ...s, work: spec.work, title: spec.title, flight: spec.flight })),
        (err) => {
          console.warn(`Floating field: could not load ${spec.src}`, err);
          return [];
        },
      ),
    ),
  ).then((sculptures) => {
    if (disposed) return;
    place(sculptures.flat().filter(Boolean));
    placed = true;
    if (flying) ensureScenery();
    render();
    container.classList.add('is-ready');
    start();
  });

  return function dispose() {
    disposed = true;
    stop();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    unsubscribe();
    setFly(false);
    setTilt(false);
    document.documentElement.classList.remove('field-hover');
    scene.traverse((o) => {
      if (o.isMesh || o.isSprite) {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          Object.values(m || {}).forEach((v) => v?.isTexture && v.dispose());
          m?.dispose();
        });
      }
    });
    draco.dispose();
    dof?.dispose();
    composer?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
