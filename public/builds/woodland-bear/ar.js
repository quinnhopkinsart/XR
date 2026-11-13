// The AR view: world tracking on the self-hosted 8th Wall engine (external/xr/), drawn with
// the same three.js scene as the 3D view. No calls to 8th Wall's servers.
//
// The engine owns the canvas and the camera picture. This file adds one pipeline module that
// draws the scene over that picture with the pose the engine reports each frame.
//
// Scale: the engine's world has the floor at y = 0 and the phone starting at EYE metres up,
// so one unit is about a metre when the phone is held at chest height.
const EYE = 1.4;
const START = 2.4; // metres in front of the visitor, where the sculpture first stands

export function startAR(ctx, ready) {
  const { THREE, scene, controls, state, $ } = ctx;
  const canvas = $('stage');
  const go = $('ar-go');
  const text = $('ar-text');
  const status = $('status');
  const say = (msg) => { status.hidden = !msg; if (msg) status.textContent = msg; };

  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  camera.matrixAutoUpdate = true;
  let renderer = null;
  let tracking = false;
  window.WB_DEBUG = { camera, ctx };
  let placed = false;

  function lens(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // --- the engine ------------------------------------------------------------------------
  const engine = new Promise((resolve, reject) => {
    if (window.XR8) return resolve();
    window.addEventListener('xrloaded', () => resolve(), { once: true });
    const s = document.createElement('script');
    s.src = './external/xr/xr.js';
    s.async = true;
    s.setAttribute('data-preload-chunks', 'slam');
    s.onerror = () => reject(new Error('engine'));
    document.head.appendChild(s);
  });

  Promise.all([engine, ready]).then(() => {
    if (!window.XR8.XrDevice.isDeviceBrowserCompatible({ allowedDevices: window.XR8.XrConfig.device().MOBILE })) {
      text.textContent = 'AR needs a phone or tablet with a camera and motion sensors. On this device, open the 3D view.';
      go.hidden = true;
      return;
    }
    go.disabled = false;
    go.textContent = 'Start AR';
  }).catch(() => {
    text.textContent = 'AR could not load. Check your connection and reload, or open the 3D view.';
    go.hidden = true;
  });

  const sceneModule = () => ({
    name: 'woodland-bear-scene',
    onStart: ({ canvas: c, GLctx, canvasWidth, canvasHeight }) => {
      renderer = new THREE.WebGLRenderer({ canvas: c, context: GLctx, alpha: false, antialias: true });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(1);
      renderer.setSize(canvasWidth, canvasHeight, false);
      lens(canvasWidth, canvasHeight);
      ctx.dress(renderer);
      renderer.resetState();

      camera.position.set(0, EYE, 0);
      camera.quaternion.identity();
      window.XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion,
      });
      // First position: in front of the visitor, facing them.
      ctx.sculpture.anchor.position.set(0, 0, -START);
      state.facing = 0;
      controls.apply();
    },
    onUpdate: ({ processCpuResult }) => {
      const r = processCpuResult && processCpuResult.reality;
      if (!r) return;
      const { rotation, position, intrinsics, trackingStatus } = r;
      // The engine's lens model. If it has none for this device, keep a plain 60 degree lens.
      if (intrinsics && Number.isFinite(intrinsics[0]) && Number.isFinite(intrinsics[5])) {
        camera.projectionMatrix.fromArray(intrinsics);
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      }
      if (rotation) camera.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      if (position) camera.position.set(position.x, position.y, position.z);
      const now = trackingStatus === 'NORMAL';
      if (now !== tracking) {
        tracking = now;
        window.WB_TRACKING = trackingStatus;
        if (tracking) { say(''); if (!placed) showHint(); } else say('Move your phone slowly from side to side so it can find the floor.');
      }
      ctx.tick();
    },
    onCanvasSizeChange: ({ canvasWidth, canvasHeight }) => {
      if (renderer) renderer.setSize(canvasWidth, canvasHeight, false);
      lens(canvasWidth, canvasHeight);
    },
    onRender: () => {
      if (!renderer) return;
      renderer.resetState();
      renderer.clearDepth();
      renderer.render(scene, camera);
      window.WB_FRAMES = (window.WB_FRAMES || 0) + 1;
    },
    onCameraStatusChange: ({ status: s }) => {
      window.WB_CAMERA = s;
      if (s === 'requesting') say('Starting the camera.');
      else if (s === 'hasVideo') { $('ar-start').hidden = true; onLive(); }
      else if (s === 'failed') fail('The camera is blocked. Allow the camera for this site in your browser settings, then reload.');
    },
    onException: (err) => {
      console.error(err);
      fail('AR stopped working on this device. Reload to try again, or open the 3D view.');
    },
  });

  function fail(msg) {
    $('ar-start').hidden = false;
    text.textContent = msg;
    go.hidden = true;
    say('');
  }

  // The canvas fills the window at the screen's own pixels, capped so older phones keep up.
  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = 'Starting';
    // iOS only hands out motion data after a tap asks for it. Other browsers answer
    // 'granted' or 'prompt' and carry on.
    try {
      const ask = window.DeviceMotionEvent && window.DeviceMotionEvent.requestPermission;
      if (ask && (await ask.call(window.DeviceMotionEvent)) === 'denied') {
        return fail('Motion sensors are blocked. In Safari, allow Motion and Orientation Access for this site, then reload.');
      }
    } catch (e) { /* not iOS, or already granted */ }

    const { XR8 } = window;
    fit();
    addEventListener('resize', fit);
    addEventListener('orientationchange', () => setTimeout(fit, 300));
    XR8.XrController.configure({ disableWorldTracking: false });
    XR8.CanvasScreenshot.configure({ maxDimension: 1920, jpegCompression: 92 });
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      sceneModule(),
      XR8.XrController.pipelineModule(),
      XR8.CanvasScreenshot.pipelineModule(),
    ]);
    XR8.run({ canvas, allowedDevices: XR8.XrConfig.device().MOBILE });
  });

  // --- once the camera is live -----------------------------------------------------------
  function showHint() {
    $('hint').hidden = false;
    $('hint').classList.remove('gone');
    setTimeout(() => $('hint').classList.add('gone'), 9000);
  }

  function onLive() {
    $('controls').hidden = false;
    $('shutter').hidden = false;
    if (!tracking) say('Move your phone slowly from side to side so it can find the floor.');
    window.WB_READY = true;
  }

  // Touch: a tap on the ground moves the sculpture there. One finger dragging turns it.
  // Two fingers pinch to resize and twist to turn.
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const pointers = new Map();
  let gesture = null;

  function place(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(ground, hit)) return;
    // Keep it within reach of the room, not off at the horizon.
    const flat = Math.hypot(hit.x - camera.position.x, hit.z - camera.position.z);
    if (flat > 12) return;
    const a = ctx.sculpture.anchor;
    a.position.set(hit.x, 0, hit.z);
    state.facing = Math.atan2(camera.position.x - hit.x, camera.position.z - hit.z);
    state.turn = 0;
    placed = true;
    controls.apply();
    $('hint').classList.add('gone');
  }

  const pair = () => {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) gesture = { type: 'one', x0: e.clientX, y0: e.clientY, x: e.clientX, t: performance.now(), moved: false };
    else if (pointers.size === 2) gesture = { type: 'two', ...pair(), size: state.size, turn: state.turn };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.type === 'one') {
      if (Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 10) gesture.moved = true;
      if (gesture.moved) { controls.turnBy(((e.clientX - gesture.x) / innerWidth) * Math.PI * 1.6); }
      gesture.x = e.clientX;
    } else if (gesture.type === 'two' && pointers.size === 2) {
      const p = pair();
      state.size = gesture.size * (p.d / Math.max(gesture.d, 1));
      let da = p.a - gesture.a;
      if (da > Math.PI) da -= Math.PI * 2; else if (da < -Math.PI) da += Math.PI * 2;
      state.turn = gesture.turn - da;
      controls.apply();
    }
  });
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (gesture && gesture.type === 'one' && e.type === 'pointerup' && !gesture.moved && performance.now() - gesture.t < 400) {
      place(e.clientX, e.clientY);
    }
    gesture = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // --- the camera button -----------------------------------------------------------------
  // The photo is the camera picture with the sculpture on it. Buttons and text are not in it.
  const photo = $('photo');
  const img = $('photo-img');
  const share = $('photo-share');
  let file = null;
  let url = null;

  $('shutter').addEventListener('click', async () => {
    const flash = document.createElement('div');
    flash.id = 'flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
    try {
      const b64 = await window.XR8.CanvasScreenshot.takeScreenshot();
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      file = new File([bytes], `woodland-bear-${stamp}.jpg`, { type: 'image/jpeg' });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(file);
      img.src = url;
      $('photo-save').href = url;
      $('photo-save').download = file.name;
      share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      photo.hidden = false;
      (share.hidden ? $('photo-save') : share).focus();
      window.WB_PHOTO = bytes.length;
    } catch (err) {
      console.error(err);
      say('The photo could not be taken. Try again.');
      setTimeout(() => say(''), 3000);
    }
  });
  share.addEventListener('click', () => {
    navigator.share({ files: [file], title: 'Woodland Be[AR]' }).catch(() => {});
  });
  const close = () => { photo.hidden = true; $('shutter').focus(); };
  $('photo-close').addEventListener('click', close);
  photo.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  return {
    reset() {
      if (!window.XR8 || !renderer) return;
      // Reset also puts the sculpture back in front of the visitor.
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      dir.y = 0;
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
      dir.normalize().multiplyScalar(START);
      ctx.sculpture.anchor.position.set(camera.position.x + dir.x, 0, camera.position.z + dir.z);
      state.facing = Math.atan2(-dir.x, -dir.z);
      controls.apply();
    },
  };
}
