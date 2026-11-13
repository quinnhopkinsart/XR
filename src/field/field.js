// The floating field: models from every work drift behind the site.
// Plain three.js, loaded on demand by <FloatingField />, so the first paint
// never waits on WebGL.
//
// Each model is one sculpture. A split model keeps its parts roughly where the
// sculpture has them, each a little out of place, like a ruin: the whole still
// hints at what it was. Sculptures sit at different depths, some in front of the
// focal plane and some far behind, and the lens blurs whatever is off that plane.
//
// Interaction, kept slight on purpose:
//   - the camera leans toward the pointer
//   - parts near the pointer drift away from it and swell a little
//   - tapping a part (on open page, not on text or links) sets it spinning; it settles back
//   - scrolling moves near sculptures faster than far ones
//   - on phones, tilting leans the camera and slides near sculptures further than far ones

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { motion } from './motion.js';

const INTERACTIVE = 'a, button, input, select, textarea, iframe, label, summary, [role="button"]';

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
 * Turns one model spec from a project.js into a sculpture: its parts, where each sat
 * in the original (relative to the sculpture's centre), and the scale that brings the
 * whole to unit size.
 */
function sculptureFrom(gltf, spec, maxParts) {
  const exclude = (spec.exclude || []).map((s) => s.toLowerCase());
  const skip = (name = '') => exclude.some((s) => name.toLowerCase().includes(s));
  let parts = [];

  gltf.scene.updateMatrixWorld(true);

  if (spec.split) {
    const meshes = [];
    gltf.scene.traverse((o) => {
      if (o.isMesh && !skip(o.name) && !skip(o.parent?.name)) meshes.push(o);
    });
    for (const mesh of meshes) {
      const copy = mesh.clone();
      // Bake the world transform so each part keeps its authored shape and place.
      copy.applyMatrix4(mesh.matrixWorld);
      copy.matrixAutoUpdate = true;
      parts.push(toPart(copy));
    }
    // On small screens only the largest parts are kept; they carry the shape.
    parts = parts.sort((a, b) => b.longest - a.longest).slice(0, maxParts);
  } else {
    parts.push(toPart(gltf.scene));
  }
  if (!parts.length) return null;

  // The sculpture's extent: where its parts sit, padded by a typical part. Measured
  // from centres so one oversized part cannot shrink everything else.
  const bounds = new THREE.Box3();
  parts.forEach((p) => bounds.expandByPoint(p.centre));
  const centre = bounds.getCenter(new THREE.Vector3());
  const spread = bounds.getSize(new THREE.Vector3());
  const typical = parts.map((p) => p.longest).sort((a, b) => a - b)[Math.floor(parts.length / 2)];
  const longest =
    parts.length === 1 ? parts[0].longest : Math.max(spread.x, spread.y, spread.z) + typical;

  for (const part of parts) {
    if (spec.recolor) recolor(part.pivot, token(spec.recolor, '#000000'));
    part.home = part.centre.clone().sub(centre);
  }
  return {
    parts,
    unit: 1 / longest,
    hero: !!spec.hero,
    scale: spec.scale || 1,
    turn: THREE.MathUtils.degToRad(spec.turn || 0),
  };
}

export function createField(container, { models, reducedMotion }) {
  const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const maxParts = mobile ? 14 : 60; // per split sculpture
  const lens = !mobile; // depth of field; phones get the haze only
  const random = rng(11);
  const ground = new THREE.Color(token('--ground', '#ff3314'));

  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // Haze: sculptures further back sink into the ground colour.
  scene.fog = new THREE.Fog(ground, 17, 46);

  // Lens: sharp at the focal plane (z = 0), softer in front of it and behind.
  let composer = null;
  let bokeh = null;
  if (lens) {
    composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }),
    );
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.addPass(new RenderPass(scene, camera));
    bokeh = new BokehPass(scene, camera, { focus: camera.position.z, aperture: 0.0011, maxblur: 0.009 });
    // With the lens on, the canvas paints the ground itself: the blur needs an opaque
    // frame. The depth pass must not see that colour, so it is lifted while it runs.
    scene.background = ground;
    const renderBokeh = bokeh.render.bind(bokeh);
    bokeh.render = (...args) => {
      scene.background = null;
      renderBokeh(...args);
      scene.background = ground;
    };
    composer.addPass(bokeh);
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
      bokeh.uniforms.aspect.value = camera.aspect;
    }
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view = { w: height * camera.aspect, h: height };
    if (!running) render();
  }

  const BAND = 2.5; // screen heights the sculptures are spread over; scrolling wraps inside it
  const BAND_TOP = -0.6;

  function place(sculptures) {
    const k = mobile ? 0.62 : 1; // sizes on a narrow screen
    // Heroes open the composition on the right of the first screen, beside the title.
    // Then the split sculptures, largest first, then the single pieces.
    const heroes = sculptures.filter((s) => s.hero);
    // The split sculptures are spaced evenly down the page, with single pieces between.
    const others = sculptures.filter((s) => !s.hero);
    const wholes = others.filter((s) => s.parts.length > 1).sort((a, b) => b.parts.length - a.parts.length);
    const singles = others.filter((s) => s.parts.length === 1).sort(() => random() - 0.5);
    const rest = [];
    const gap = Math.max(1, Math.ceil(others.length / Math.max(1, wholes.length)));
    while (wholes.length || singles.length) {
      if (wholes.length && (rest.length % gap === 0 || !singles.length)) rest.push(wholes.shift());
      else rest.push(singles.shift());
    }

    // Depths for the rest, in turn: near the focal plane, in front of it, far behind.
    const depths = [-0.5, -2.5, 3.6, -6, 1.2, -8.5, 4.6, -4, -7, 2.4];
    let heroIndex = 0;
    let wholeSide = 1; // sculptures alternate sides; single pieces keep to the other side

    [...heroes, ...rest].forEach((s) => {
      const group = new THREE.Group();
      const whole = s.parts.length > 1;
      let base;
      let size;
      if (s.hero) {
        size = (mobile ? 3.8 : 6.6) * s.scale;
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
        size = (whole ? 8.5 + random() * 2 : 3.8 + random() * 2) * k * s.scale;
        base = new THREE.Vector3(
          side * (mobile ? 0.08 + random() * 0.18 : whole ? 0.16 + random() * 0.08 : 0.14 + random() * 0.28), // fraction of view width
          BAND_TOP + 0.75 + ((i + random() * 0.6) / n) * BAND,              // fraction of view height, wraps
          depths[i % depths.length],
        );
      }
      const nearness = THREE.MathUtils.clamp(1 + base.z / 8, 0, 1.6); // 1 at the focal plane
      const cluster = {
        group,
        base,
        size,
        whole,
        turn: s.turn,
        // Single pieces tumble slowly, so every side comes round. Sculptures only rock.
        spin: whole
          ? new THREE.Vector3()
          : new THREE.Vector3((random() - 0.5) * 0.14, (random() - 0.5) * 0.26, (random() - 0.5) * 0.08),
        sway: whole ? 0.2 : 0,
        phase: random() * Math.PI * 2,
        nearness,
        parallax: 0.35 + nearness * 0.9, // near sculptures move more with scroll
        lean: new THREE.Vector2(),
      };
      group.scale.setScalar(size * s.unit);
      cluster.rot = whole
        ? new THREE.Vector3((random() - 0.5) * 0.25, cluster.turn, (random() - 0.5) * 0.2)
        : new THREE.Vector3(random() * Math.PI, random() * Math.PI * 2, (random() - 0.5) * 0.6);

      const extent = 1 / s.unit; // the sculpture's size in its own units
      for (const part of s.parts) {
        // Out of place: pushed outward from the centre, nudged and turned a little.
        const home = whole
          ? part.home
              .clone()
              .multiplyScalar(1.22)
              .add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(extent * 0.09))
          : new THREE.Vector3();
        const rest = whole
          ? new THREE.Euler((random() - 0.5) * 0.5, (random() - 0.5) * 0.6, (random() - 0.5) * 0.5)
          : new THREE.Euler();
        part.pivot.position.copy(home);
        part.pivot.rotation.copy(rest);
        group.add(part.pivot);
        floaters.push({
          piece: part.pivot,
          cluster,
          home,
          rest,
          radius: (part.longest * size * s.unit) / 2, // world units
          phase: random() * Math.PI * 2,
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
    for (const c of clusters) {
      const depthScale = (camera.position.z - c.base.z) / camera.position.z;
      let y = c.base.y - scroll * c.parallax * 0.55; // rise with the page, slower when far
      y = ((((y - BAND_TOP) % BAND) + BAND) % BAND) + BAND_TOP; // wrap inside the band
      const x = c.base.x * view.w * depthScale;
      const yy = (0.5 - y) * view.h * depthScale;
      const still = reducedMotion ? 0 : 1;
      const bob = Math.sin(t * 0.22 + c.phase) * 0.18 * still;
      c.group.position.set(x + c.lean.x, yy + bob + c.lean.y, c.base.z);
      c.group.rotation.set(c.rot.x, c.rot.y + Math.sin(t * 0.13 + c.phase) * c.sway * still, c.rot.z);
    }
    for (const f of floaters) {
      const bob = reducedMotion ? 0 : Math.sin(t * f.speed + f.phase) * f.bob;
      f.piece.position.set(f.home.x + f.push.x, f.home.y + f.push.y + bob, f.home.z + f.push.z);
      f.piece.rotation.set(f.rest.x + f.turnBy.x, f.rest.y + f.turnBy.y, f.rest.z + f.turnBy.z);
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
    const t = now / 1000;

    tilt.lerp(tiltTarget, 0.08);

    // Camera leans toward the pointer, or with the phone.
    const leanX = (pointerActive ? pointer.x : 0) * 0.8 + tilt.x * 1.4;
    const leanY = (pointerActive ? pointer.y : 0) * 0.5 + tilt.y * 1.0;
    camera.position.x += (leanX - camera.position.x) * 0.04;
    camera.position.y += (leanY - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -3);

    for (const c of clusters) {
      c.rot.addScaledVector(c.spin, dt);
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
      const depthScale = (camera.position.z - tmp.z) / camera.position.z;
      const scale = g.scale.x;
      const dx = tmp.x - pointer.x * view.w * 0.5 * depthScale;
      const dy = tmp.y - pointer.y * view.h * 0.5 * depthScale;
      const dist = Math.hypot(dx, dy);
      const reach = 1.4 + f.radius;
      tmp.set(0, 0, 0);
      if (pointerActive && dist < reach) {
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

  function start() {
    if (running || isPaused() || reducedMotion || document.hidden) return;
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

  const onMove = (e) => {
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
  const onDown = (e) => {
    if (e.target.closest?.(INTERACTIVE)) return;
    const hit = pick(e.clientX, e.clientY);
    if (!hit) return;
    hit.kick.set((random() - 0.5) * 6, 5 + random() * 5, (random() - 0.5) * 3);
    hit.swell = 1.25;
    if (!running) render();
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
    if (isPaused()) stop();
    else start();
  });
  setTilt(motion.get().tilt);

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
        (gltf) => sculptureFrom(gltf, spec, maxParts),
        (err) => {
          console.warn(`Floating field: could not load ${spec.src}`, err);
          return null;
        },
      ),
    ),
  ).then((sculptures) => {
    if (disposed) return;
    place(sculptures.filter(Boolean));
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
    setTilt(false);
    document.documentElement.classList.remove('field-hover');
    scene.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          Object.values(m || {}).forEach((v) => v?.isTexture && v.dispose());
          m?.dispose();
        });
      }
    });
    draco.dispose();
    composer?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
