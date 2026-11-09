// The floating field: models from every work drift behind the site.
// Plain three.js, loaded on demand by <FloatingField />, so the first paint
// never waits on WebGL.
//
// Interaction, kept slight on purpose:
//   - the camera leans toward the pointer
//   - pieces near the pointer drift away from it and swell a little
//   - tapping a piece (on open page, not on text or links) sets it spinning
//   - scrolling moves near pieces faster than far ones

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

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

/** Wraps a mesh or scene in a pivot centred on its bounds, scaled to unit size. */
function toPiece(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z) || 1;

  const inner = new THREE.Group();
  inner.add(object);
  object.position.sub(centre);

  const pivot = new THREE.Group();
  pivot.add(inner);
  pivot.userData.unit = 1 / longest;
  pivot.userData.weight = 0;
  object.traverse((o) => {
    if (o.isMesh) pivot.userData.weight += o.geometry.attributes.position?.count || 0;
  });
  return pivot;
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

/** Turns one model spec from a project.js into floating pieces. */
function piecesFrom(gltf, spec) {
  const exclude = (spec.exclude || []).map((s) => s.toLowerCase());
  const skip = (name = '') => exclude.some((s) => name.toLowerCase().includes(s));
  const pieces = [];

  gltf.scene.updateMatrixWorld(true);

  if (spec.split) {
    const meshes = [];
    gltf.scene.traverse((o) => {
      if (o.isMesh && !skip(o.name) && !skip(o.parent?.name)) meshes.push(o);
    });
    for (const mesh of meshes) {
      const copy = mesh.clone();
      // Bake the world transform so each piece keeps its authored shape.
      copy.applyMatrix4(mesh.matrixWorld);
      copy.matrixAutoUpdate = true;
      pieces.push(toPiece(copy));
    }
  } else {
    pieces.push(toPiece(gltf.scene));
  }

  for (const p of pieces) {
    if (spec.recolor) recolor(p, token(spec.recolor, '#3e1470'));
    p.userData.hero = !!spec.hero;
    p.userData.scale = spec.scale || 1;
  }
  return pieces;
}

export function createField(container, { models, reducedMotion }) {
  const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const maxPieces = mobile ? 10 : 22;
  const random = rng(11);

  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // Lit pieces take the site's palette: purple from above, forest from below.
  scene.add(new THREE.HemisphereLight(token('--purple-hi', '#8a3fd1'), token('--forest-hi', '#3c8a4e'), 2.4));
  const key = new THREE.DirectionalLight(0xfff1e6, 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);

  // three.js bundles its own Draco decoder (fingerprinted by Vite), so no path is needed.
  const draco = new DRACOLoader();
  const loader = new GLTFLoader().setDRACOLoader(draco);

  const floaters = [];
  const pointer = new THREE.Vector2(0, 0);
  const pointerWorld = new THREE.Vector3();
  let pointerActive = false;
  let hovered = null;
  let paused = false;
  let running = false;
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
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view = { w: height * camera.aspect, h: height };
    if (!running) render();
  }

  function place(pieces) {
    // Heroes always float. The rest: favour pieces with enough geometry to read.
    const heroes = pieces.filter((p) => p.userData.hero);
    const rest = pieces
      .filter((p) => !p.userData.hero)
      .sort((a, b) => b.userData.weight - a.userData.weight)
      .slice(0, Math.max(0, maxPieces * 2))
      .sort(() => random() - 0.5)
      .slice(0, Math.max(0, maxPieces - heroes.length));
    const chosen = [...heroes, ...rest];

    // Spread across a band taller than the screen so scrolling never empties it.
    // Heroes open the composition on the right of the first screen, beside the title.
    const cols = mobile ? 2 : 4;
    let heroIndex = 0;
    chosen.forEach((piece, i) => {
      const hero = piece.userData.hero;
      const depth = hero ? -1.5 - heroIndex * 2 : -1 - random() * 7; // 0 is the focal plane
      const size = (hero ? (mobile ? 3.2 : 4.6) : 1.4 + random() * 1.8) * piece.userData.scale;
      piece.scale.setScalar(size * piece.userData.unit);
      const col = (i % cols) + random() * 0.8;
      const base = hero
        ? new THREE.Vector3(mobile ? 0.18 : 0.26 - heroIndex * 0.5, mobile ? 0.62 : 0.4 + heroIndex * 0.6, depth)
        : new THREE.Vector3(
            (col / cols - 0.5) * 1.15,               // fraction of view width
            random() * 1.6 - 0.3,                    // fraction of view height, wraps
            depth,
          );
      if (hero) heroIndex += 1;
      const f = {
        piece,
        base,
        size,
        phase: random() * Math.PI * 2,
        bob: 0.15 + random() * 0.35,
        speed: 0.25 + random() * 0.35,
        spin: new THREE.Vector3((random() - 0.5) * 0.2, (random() - 0.5) * 0.35, (random() - 0.5) * 0.1),
        kick: new THREE.Vector3(),
        push: new THREE.Vector3(),
        swell: 1,
        parallax: 0.35 + (1 + depth / 8) * 0.9,   // near pieces move more with scroll
      };
      piece.rotation.set(random() * Math.PI, random() * Math.PI * 2, (random() - 0.5) * 0.6);
      scene.add(piece);
      floaters.push(f);
    });
  }

  function layout(t) {
    const scroll = window.scrollY / window.innerHeight; // in screen heights
    const band = 1.6;
    for (const f of floaters) {
      const depthScale = (camera.position.z - f.base.z) / camera.position.z;
      let y = f.base.y - scroll * f.parallax * 0.55; // rise with the page, slower when far
      y = ((((y + 0.3) % band) + band) % band) - 0.3; // wrap inside the band
      const x = f.base.x * view.w * depthScale;
      const yy = (0.5 - y) * view.h * depthScale;
      const bob = reducedMotion ? 0 : Math.sin(t * f.speed + f.phase) * f.bob;
      f.piece.position.set(x + f.push.x, yy + bob + f.push.y, f.base.z);
    }
  }

  function render(t = performance.now() / 1000) {
    layout(t);
    renderer.render(scene, camera);
  }

  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    // Camera leans toward the pointer.
    camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 0.5 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -3);

    // Where the pointer sits on the focal plane.
    pointerWorld.set(pointer.x * view.w * 0.5, pointer.y * view.h * 0.5, 0);

    for (const f of floaters) {
      const p = f.piece;
      p.rotation.x += (f.spin.x + f.kick.x) * dt;
      p.rotation.y += (f.spin.y + f.kick.y) * dt;
      p.rotation.z += (f.spin.z + f.kick.z) * dt;
      f.kick.multiplyScalar(Math.pow(0.35, dt)); // spins settle over a few seconds

      // Drift away from a nearby pointer, then ease home.
      const dx = p.position.x - f.push.x - pointerWorld.x;
      const dy = p.position.y - f.push.y - pointerWorld.y;
      const dist = Math.hypot(dx, dy);
      const reach = 2.4 + f.size * 0.6;
      const target = new THREE.Vector2();
      if (pointerActive && dist < reach) {
        const strength = (1 - dist / reach) * 0.9;
        target.set((dx / (dist || 1)) * strength, (dy / (dist || 1)) * strength);
      }
      f.push.x += (target.x - f.push.x) * 0.06;
      f.push.y += (target.y - f.push.y) * 0.06;

      const swellTo = f === hovered ? 1.12 : 1;
      f.swell += (swellTo - f.swell) * 0.12;
      p.scale.setScalar(f.size * p.userData.unit * f.swell);
    }

    render(t);
  }

  function start() {
    if (running || paused || reducedMotion || document.hidden) return;
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
  const onPause = (e) => {
    paused = !!e.detail?.paused;
    if (paused) stop();
    else start();
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('noodin:field', onPause);

  resize();

  let disposed = false;
  Promise.all(
    models.map((spec) =>
      loader.loadAsync(spec.src).then(
        (gltf) => piecesFrom(gltf, spec),
        (err) => {
          console.warn(`Floating field: could not load ${spec.src}`, err);
          return [];
        },
      ),
    ),
  ).then((groups) => {
    if (disposed) return;
    place(groups.flat());
    render();
    container.classList.add('is-ready');
    start();
  });

  return function dispose() {
    disposed = true;
    stop();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('noodin:field', onPause);
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
    renderer.dispose();
    renderer.domElement.remove();
  };
}
