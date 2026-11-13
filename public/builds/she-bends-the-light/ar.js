// The AR view: world tracking on the self-hosted 8th Wall engine (external/xr/), drawn with
// the same three.js scene as the 3D view. No calls to 8th Wall's servers.
//
// It follows the 8th Wall project: the phone starts at (0, 2, 2) facing the moon at
// (0, 2, 0), the camera picture is black and white, darkened, with a vignette, and the
// star sits on the floor where the phone points. Tapping the screen recentres the scene.
const EYE = { x: 0, y: 2, z: 2 };   // a-camera position in the project's body.html
const PULL = 3;                     // ground-cursor: the star sits 3 units nearer than the point aimed at
const FAR = 14;                     // the star stays within this of the moon

// The project's camera-shader, unchanged: greyscale, vignette, half brightness.
const CAMERA_FILTER = `
  precision mediump float;
  varying vec2 texUv;
  uniform sampler2D sampler;
  void main() {
    float x = texUv.x - 0.5;
    float y = texUv.y - 0.5;
    float v = 1.5 - sqrt(x*x + y*y) * 2.5;
    vec4 c = texture2D(sampler, texUv);
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 bw = vec3(lum);
    float mask = (v > 1.0 ? 1.0 : v);
    float darkness = 0.5;
    gl_FragColor = vec4(bw * mask * darkness, c.a);
  }
`;

export function startAR(ctx) {
  const { THREE, scene, stage, moon, setAim, $ } = ctx;
  const canvas = $('stage');
  const go = $('ar-go');
  const text = $('ar-text');
  const status = $('status');
  const say = (msg) => { status.hidden = !msg; if (msg) status.textContent = msg; };

  stage.visible = false; // the room is the ground

  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  let renderer = null;
  let tracking = false;
  window.SBL_DEBUG = { camera, ctx }; // for automated tests

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

  Promise.all([engine, ctx.ready]).then(() => {
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

  // The star: where the phone points on the floor, pulled back toward the visitor.
  const ray = new THREE.Raycaster();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const back = new THREE.Vector3();
  const centre = new THREE.Vector2(0, 0);
  function aimStar() {
    camera.updateMatrixWorld();
    ray.setFromCamera(centre, camera);
    if (!ray.ray.intersectPlane(floor, hit)) return; // pointing at the sky: the star waits
    // In the project the pull is along +z, toward a visitor who faces the moon from the
    // start position. Here it follows the visitor as they turn.
    back.set(camera.position.x - hit.x, 0, camera.position.z - hit.z);
    const d = back.length();
    if (d > 1e-4) hit.addScaledVector(back, Math.min(PULL, d) / d);
    setAim(hit.x, hit.z, FAR);
  }

  const sceneModule = () => ({
    name: 'she-bends-the-light-scene',
    onStart: ({ canvas: c, GLctx, canvasWidth, canvasHeight }) => {
      renderer = new THREE.WebGLRenderer({ canvas: c, context: GLctx, alpha: false, antialias: true });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(1);
      renderer.setSize(canvasWidth, canvasHeight, false);
      lens(canvasWidth, canvasHeight);
      renderer.resetState();

      camera.position.set(EYE.x, EYE.y, EYE.z);
      camera.quaternion.identity();
      window.XR8.XrController.updateCameraProjectionMatrix({ origin: camera.position, facing: camera.quaternion });
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
        window.SBL_TRACKING = trackingStatus;
        say(tracking ? '' : 'Move your phone slowly from side to side so it can find the floor.');
      }
      aimStar();
      ctx.step();
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
      window.SBL_FRAMES = (window.SBL_FRAMES || 0) + 1;
    },
    onCameraStatusChange: ({ status: s }) => {
      window.SBL_CAMERA = s;
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
    ctx.setSound(false);
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
    // The tap also lets the sound start, as it does on "Start AR" in the project.
    ctx.setSound(true);
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
    XR8.GlTextureRenderer.configure({ fragmentSource: CAMERA_FILTER });
    XR8.CanvasScreenshot.configure({ maxDimension: 1920, jpegCompression: 92 });
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      sceneModule(),
      XR8.XrController.pipelineModule(),
      XR8.CanvasScreenshot.pipelineModule(),
    ]);
    XR8.run({ canvas, allowedDevices: XR8.XrConfig.device().MOBILE });
  });

  function onLive() {
    $('top-actions').hidden = false;
    $('shutter').hidden = false;
    $('hint').hidden = false;
    setTimeout(() => $('hint').classList.add('gone'), 12000);
    if (!tracking) say('Move your phone slowly from side to side so it can find the floor.');
    ctx.enter();
    window.SBL_READY = true;
  }

  // A tap puts the scene back in front of you (xrextras-tap-recenter in the project).
  // A drag across the screen turns the moon (xrextras-one-finger-rotate).
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, last: e.clientX, t: performance.now(), moved: false }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) down.moved = true;
    if (down.moved) moon.rotation.y += ((e.clientX - down.last) / innerWidth) * Math.PI * 2;
    down.last = e.clientX;
  });
  canvas.addEventListener('pointerup', () => {
    if (down && !down.moved && performance.now() - down.t < 400 && renderer) {
      window.XR8.XrController.recenter();
      window.SBL_RECENTRED = (window.SBL_RECENTRED || 0) + 1;
    }
    down = null;
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  // --- the camera button -----------------------------------------------------------------
  // The photo is the filtered camera picture with the moon, the light and the words on it.
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
      // The project's file name prefix, kept.
      file = new File([bytes], `She-bends-the-light-by-Feather-${stamp}.jpg`, { type: 'image/jpeg' });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(file);
      img.src = url;
      $('photo-save').href = url;
      $('photo-save').download = file.name;
      share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      photo.hidden = false;
      (share.hidden ? $('photo-save') : share).focus();
      window.SBL_PHOTO = bytes.length;
    } catch (err) {
      console.error(err);
      say('The photo could not be taken. Try again.');
      setTimeout(() => say(''), 3000);
    }
  });
  share.addEventListener('click', () => {
    navigator.share({ files: [file], title: 'She Bends the Light to Her Will' }).catch(() => {});
  });
  const close = () => { photo.hidden = true; $('shutter').focus(); };
  $('photo-close').addEventListener('click', close);
  photo.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
