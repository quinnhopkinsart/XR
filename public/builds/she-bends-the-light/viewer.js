import { OrbitControls } from 'three/addons/OrbitControls.js';

// The 3D view: a dark stage in the colours of the work's opening picture. The pointer
// stands in for the phone: the mouse, one finger or the arrow keys move the star.
export function startViewer(ctx) {
  const { THREE, scene, aim, setAim, $, NIGHT } = ctx;
  const canvas = $('stage');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(NIGHT, 1);
  scene.fog = new THREE.Fog(NIGHT, 5, 16);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.minDistance = 2.5;
  orbit.maxDistance = 9;
  orbit.minPolarAngle = 0.25;
  orbit.maxPolarAngle = Math.PI / 2 - 0.08;
  orbit.target.set(0, 0.7, -0.4);
  // One finger belongs to the light. Two fingers look around and zoom.
  orbit.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
  if (window.SBL_FRAMED) {
    // Inside the work page the wheel scrolls the page. Hold ctrl, or pinch, to zoom.
    canvas.addEventListener('wheel', (e) => { if (!e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  const portrait = innerWidth < innerHeight;
  camera.position.set(0, portrait ? 3.9 : 2.7, portrait ? 7.6 : 4.6);
  orbit.update();

  // The pointer aims the light.
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const fingers = new Set();
  const aimed = (x, z) => { setAim(x, z); $('hint').classList.add('gone'); };

  function aimAt(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) aimed(hit.x, hit.z);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') fingers.add(e.pointerId);
    if (fingers.size < 2) aimAt(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && fingers.size !== 1) return;
    if (e.pointerType === 'mouse' && e.buttons) return; // dragging looks around
    aimAt(e.clientX, e.clientY);
  });
  ['pointerup', 'pointercancel'].forEach((n) => addEventListener(n, (e) => fingers.delete(e.pointerId)));
  canvas.addEventListener('keydown', (e) => {
    const move = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.25], ArrowDown: [0, 0.25] }[e.key];
    if (!move) return;
    e.preventDefault();
    aimed(aim.x + move[0], aim.z + move[1]);
  });

  // Enter is the tap that lets the sound start.
  const start = $('start');
  ctx.ready.then(() => {
    start.disabled = false;
    start.textContent = 'Enter';
    window.SBL_LOADED = true;
  }).catch((err) => {
    console.error(err);
    start.textContent = 'Could not load. Reload to try again.';
  });
  start.addEventListener('click', () => {
    $('splash').classList.add('done');
    $('top-actions').hidden = false;
    $('hint').hidden = false;
    setTimeout(() => $('hint').classList.add('gone'), 10000);
    ctx.setSound(true);
    canvas.focus({ preventScroll: true });
    ctx.enter();
    window.SBL_READY = true;
  });

  renderer.setAnimationLoop(() => {
    ctx.step();
    orbit.update();
    renderer.render(scene, camera);
  });
}
