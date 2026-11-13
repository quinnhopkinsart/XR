import { OrbitControls } from 'three/addons/OrbitControls.js';
import { HEIGHT } from './sculpture.js';

// The 3D view: the sculpture on a saffron stage. Drag to look around it, pinch or scroll
// to zoom. Left alone, it turns slowly, unless motion is off.
export function startViewer(ctx, ready) {
  const { THREE, scene, controls, state, $, reduced } = ctx;
  const canvas = $('stage');
  const framed = window.WB_FRAMED;

  const css = getComputedStyle(document.documentElement);
  const token = (name) => new THREE.Color(css.getPropertyValue(name).trim());
  const STAGE = token('--saffron');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(STAGE, 1);
  ctx.dress(renderer);
  scene.fog = new THREE.Fog(STAGE, 6, 16);

  // The stage floor: the same saffron, with a one-metre grid so size reads at a glance.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshBasicMaterial({ color: STAGE, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  scene.add(floor);
  const grid = new THREE.GridHelper(40, 40, 0x000000, 0x000000);
  grid.material.transparent = true;
  grid.material.opacity = 0.16;
  grid.material.toneMapped = false;
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.minDistance = 1.2;
  orbit.maxDistance = 12;
  orbit.maxPolarAngle = Math.PI / 2 - 0.03; // stay above the floor
  orbit.target.set(0, HEIGHT * 0.5, 0);

  // Inside the work page, the wheel scrolls the page. Hold ctrl (or pinch a trackpad) to zoom.
  if (framed) {
    canvas.addEventListener('wheel', (e) => { if (!e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });
  }

  function home() {
    const portrait = innerWidth < innerHeight;
    const d = portrait ? 5.6 : 4.1;
    camera.position.set(d * 0.42, HEIGHT * 0.72, d * 0.9);
    orbit.target.set(0, HEIGHT * 0.5 * state.size, 0);
    orbit.update();
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  home();

  // A slow turn while nobody is touching it.
  let idleAt = performance.now();
  const touched = () => { idleAt = performance.now(); $('hint').classList.add('gone'); };
  orbit.addEventListener('start', touched);

  ready.then(() => {
    $('loader').classList.add('done');
    $('controls').hidden = false;
    $('hint').hidden = false;
    setTimeout(() => $('hint').classList.add('gone'), 9000);
    window.WB_READY = true;
  });

  renderer.setAnimationLoop(() => {
    const dt = ctx.tick();
    if (state.motion && !reduced && performance.now() - idleAt > 4000) {
      state.turn += dt * 0.12;
      controls.apply();
    }
    orbit.update();
    renderer.render(scene, camera);
  });

  return { touched, reset: home };
}
