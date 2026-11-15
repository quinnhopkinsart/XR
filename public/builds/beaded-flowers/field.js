// The field: a meadow of the beaded flowers, walked at eye height.
// Everything is in metres. The plants are instanced, a few hundred of each, in patches.

// The exported plants stand about 2 m tall, modelled large for the game. SIZE brings them
// to chest height so a visitor walks among them.
const SIZE = 0.68;
const EYE = 1.35;          // the visitor's eye height
const WALK = 30;           // how far from the middle a visitor can walk
const REACH = 46;          // how far out the flowers grow
const SPEED = 2.6;         // metres a second on the keys

// How many of each plant, in how many patches, and how wide a patch spreads (metres).
// Phones get about half.
const PLANT = {
  'asters':         { count: 150, patches: 16, spread: 3.2 },
  'coneflowers':    { count: 130, patches: 14, spread: 3.4 },
  'wild-rice':      { count: 160, patches: 18, spread: 4.5 },
  'blueberry':      { count: 150, patches: 14, spread: 3.0 },
  'prairie-crocus': { count: 70,  patches: 12, spread: 3.6 },
  'wolf-willow':    { count: 120, patches: 12, spread: 3.0 },
  'table-flowers':  { count: 120, patches: 14, spread: 3.2 },
  'spray':          { count: 14,  patches: 14, spread: 0.5 },
};
const GRASS = 6000;        // blades of bead grass
const MOTES = 420;         // drifting points of light

// The bead path winds through the middle. Points are x, z.
const PATH = [[-34, 10], [-22, 4], [-12, 7], [-3, 1], [6, -3], [14, 2], [24, -2], [35, -9]];
const PATH_WIDTH = 2.6;    // scale of the path tile: 0.4 m wide as exported

// A small seeded random, so the field is the same field on every visit.
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function buildField(ctx) {
  const { THREE, renderer, canvas, environment, materials, geometries, small, SKY, addWind } = ctx;
  const rand = seeded(20261114);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 0.35;
  scene.fog = new THREE.FogExp2(new THREE.Color(SKY.horizon), 0.024);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 220);

  // Light: a low warm sun behind haze, and a soft sky.
  const sunDir = new THREE.Vector3(-0.55, 0.32, -0.77).normalize();
  const sun = new THREE.DirectionalLight(new THREE.Color(SKY.sun), 1.5);
  sun.position.copy(sunDir).multiplyScalar(50);
  scene.add(sun, new THREE.HemisphereLight(new THREE.Color('#ffe9d6'), new THREE.Color('#3d6b45'), 0.95));

  // Sky: a dome that goes from the haze at the horizon up to a dusty rose, with the sun's glow.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      uniforms: {
        top: { value: new THREE.Color(SKY.top) }, horizon: { value: new THREE.Color(SKY.horizon) },
        sunCol: { value: new THREE.Color(SKY.sun) }, sunDir: { value: sunDir },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vDir; uniform vec3 top, horizon, sunCol, sunDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(horizon, top, pow(h, 0.55));
          float s = max(dot(d, sunDir), 0.0);
          c = mix(c, sunCol, pow(s, 6.0) * 0.75 + pow(s, 60.0) * 0.5);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // Ground: packed green beads, drawn once on a small canvas and repeated.
  function beadTile() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#143820'; g.fillRect(0, 0, 256, 256);
    const greens = ['#2d7a3d', '#3c9148', '#256b38', '#4aa256', '#1f5f33', '#6bb04c'];
    const r = seeded(7);
    const step = 16;
    for (let y = -1; y < 17; y++) for (let x = -1; x < 17; x++) {
      const cx = x * step + (y % 2 ? step / 2 : 0) + 8, cy = y * step * 0.88 + 8;
      const grad = g.createRadialGradient(cx - 2, cy - 2.5, 1, cx, cy, 7.4);
      const col = greens[Math.floor(r() * greens.length)];
      grad.addColorStop(0, '#d9f2c8'); grad.addColorStop(0.25, col); grad.addColorStop(1, '#0f2a18');
      g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, 7.2, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(360, 360);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(170, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: beadTile(), roughness: 0.6, color: '#7fa87c' }),
  );
  scene.add(ground);

  // The path: the bead path tile laid end to end along a curve.
  const curve = new THREE.CatmullRomCurve3(PATH.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
  const pathPoints = curve.getSpacedPoints(400);
  const nearPath = (x, z) => {
    let best = Infinity;
    for (let i = 0; i < pathPoints.length; i += 2) {
      const dx = pathPoints[i].x - x, dz = pathPoints[i].z - z, d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  {
    const geo = geometries['bead-path'];
    const tile = 0.864 * PATH_WIDTH * 0.985;
    const n = Math.floor(curve.getLength() / tile);
    const mesh = new THREE.InstancedMesh(geo, materials['bead-path'], n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const u = (i * tile) / curve.getLength();
      const p = curve.getPointAt(u), t = curve.getTangentAt(Math.min(1, u + 0.5 * tile / curve.getLength()));
      q.setFromAxisAngle(up, Math.atan2(-t.z, t.x));
      m.compose(new THREE.Vector3(p.x, 0.012, p.z), q, new THREE.Vector3(PATH_WIDTH, 1, PATH_WIDTH));
      mesh.setMatrixAt(i, m);
    }
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  const start = curve.getPointAt(0.42), ahead = curve.getPointAt(0.5);

  // The flowers, in patches.
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [id, cfg] of Object.entries(PLANT)) {
    const count = Math.round(cfg.count * (small ? 0.5 : 1));
    const centres = [];
    for (let i = 0; i < cfg.patches; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (REACH - 4);
      centres.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    // A few of each beside the path near the start, so every flower is met on the walk.
    for (let i = 0; i < 2; i++) {
      const p = curve.getPointAt(0.3 + rand() * 0.4);
      centres.push([p.x + (rand() < 0.5 ? -1 : 1) * (2.5 + rand() * 3), p.z + gauss() * 2]);
    }
    const mesh = new THREE.InstancedMesh(geometries[id], materials[id], count);
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 30) {
      const c = centres[Math.floor(rand() * centres.length)];
      const x = c[0] + gauss() * cfg.spread, z = c[1] + gauss() * cfg.spread;
      if (Math.hypot(x, z) > REACH) continue;
      if (nearPath(x, z) < (id === 'spray' ? 2.4 : 1.5)) continue;
      const s = SIZE * (0.78 + rand() * 0.5);
      q4.setFromAxisAngle(up, rand() * Math.PI * 2);
      m4.compose(new THREE.Vector3(x, 0, z), q4, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(placed++, m4);
    }
    mesh.count = placed;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  // Bead grass: strands of green beads, two crossed cards a tuft. The picture is drawn here.
  function grassCard() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const g = c.getContext('2d');
    const r = seeded(11);
    const greens = ['#2f9440', '#3fa84a', '#237a38', '#5fae45', '#1f6b45', '#86b83f'];
    const odd = ['#ffb31a', '#ff5a8a', '#f4f0d8', '#5aa7ff'];
    for (let s = 0; s < 7; s++) {
      let x = 30 + s * 33 + (r() - 0.5) * 14, lean = (r() - 0.5) * 0.5;
      const top = 30 + r() * 170, bead = 9 + r() * 3;
      for (let y = 512; y > top; y -= bead * 1.25) {
        const k = 1 - (y - top) / (512 - top);
        const cx = x + lean * k * k * 90;
        const rad = bead * (1 - k * 0.45);
        const col = r() < 0.035 ? odd[Math.floor(r() * odd.length)] : greens[Math.floor(r() * greens.length)];
        const grad = g.createRadialGradient(cx - rad * 0.3, y - rad * 0.35, 0.5, cx, y, rad);
        grad.addColorStop(0, '#d8f5c0'); grad.addColorStop(0.22, col); grad.addColorStop(1, '#0f2a18');
        g.fillStyle = grad; g.beginPath(); g.ellipse(cx, y, rad, rad * 0.8, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // Give the clear pixels a green of their own, so the small far-off versions of the
    // picture do not mix in black.
    const img = g.getImageData(0, 0, 256, 512), d = img.data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 8) { d[i] = 52; d[i + 1] = 150; d[i + 2] = 68; d[i + 3] = 0; }
    const t = new THREE.DataTexture(d, 256, 512, THREE.RGBAFormat);
    t.flipY = true; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }
  {
    const geo = new THREE.BufferGeometry();
    const P = [], U = [], W = [], N = [], I = [];
    for (let k = 0; k < 2; k++) {
      const a = k * Math.PI / 2 + 0.4, cx = Math.cos(a) * 0.5, cz = Math.sin(a) * 0.5, o = k * 4;
      P.push(-cx, 0, -cz, cx, 0, cz, cx, 1, cz, -cx, 1, -cz);
      U.push(0, 0, 1, 0, 1, 1, 0, 1); W.push(0, 0, 1, 1);
      for (let i = 0; i < 4; i++) N.push(0, 1, 0);          // lit as ground, so tufts do not flicker dark and light
      I.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    geo.setAttribute('_wind', new THREE.Float32BufferAttribute(W, 1));
    geo.setIndex(I);
    const mat = addWind(new THREE.MeshStandardMaterial({
      map: grassCard(), roughness: 0.55, side: THREE.DoubleSide, alphaTest: 0.4, alphaToCoverage: true,
    }));
    const count = Math.round(GRASS * (small ? 0.4 : 1));
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 6) {
      // more grass near the middle, where the visitor is
      const a = rand() * Math.PI * 2, r = Math.pow(rand(), 0.8) * (REACH - 2);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (nearPath(x, z) < 0.75) continue;
      const w = 0.5 + rand() * 0.4, h = 0.22 + rand() * 0.36;
      q4.setFromAxisAngle(up, rand() * Math.PI * 2);
      m4.compose(new THREE.Vector3(x, 0, z), q4, new THREE.Vector3(w, h, w));
      mesh.setMatrixAt(placed++, m4);
    }
    mesh.count = placed;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  // Motes: small lights drifting over the field.
  let motes;
  {
    const n = Math.round(MOTES * (small ? 0.5 : 1));
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 34;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.3 + rand() * 4.2; pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = rand() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    motes = new THREE.Points(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: ctx.wind.time, uSize: { value: 1 }, uCol: { value: new THREE.Color(SKY.sun) } },
      vertexShader: `attribute float seed; uniform float uTime, uSize; varying float vA;
        void main(){
          vec3 p = position;
          p.x += sin(uTime * 0.21 + seed) * 0.9; p.y += sin(uTime * 0.33 + seed * 1.7) * 0.35; p.z += cos(uTime * 0.17 + seed * 0.6) * 0.9;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = uSize * (0.5 + fract(seed) * 0.9) * 46.0 / max(d, 0.6);
          vA = (0.55 + 0.45 * sin(uTime * 1.3 + seed * 3.0)) * smoothstep(40.0, 12.0, d);
        }`,
      fragmentShader: `uniform vec3 uCol; varying float vA;
        void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(uCol * a * vA, 1.0); }`,
    }));
    motes.frustumCulled = false;
    scene.add(motes);
  }

  // ---- The visitor ------------------------------------------------------------------
  const pos = new THREE.Vector3(start.x, EYE, start.z);
  let yaw = Math.atan2(-(ahead.x - start.x), -(ahead.z - start.z)), pitch = -0.04;
  let goal = null;                         // where a tap sent the visitor
  const keys = new Set();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();

  function keepIn(p) {
    const r = Math.hypot(p.x, p.z);
    if (r > WALK) { p.x *= WALK / r; p.z *= WALK / r; }
  }
  function walkTo(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(floor, hit)) return;
    const d = Math.hypot(hit.x - pos.x, hit.z - pos.z);
    if (d > 16) { hit.x = pos.x + (hit.x - pos.x) * 16 / d; hit.z = pos.z + (hit.z - pos.z) * 16 / d; }
    goal = new THREE.Vector3(hit.x, EYE, hit.z);
    keepIn(goal);
  }

  const drag = { on: false, id: null, x: 0, y: 0, moved: 0 };
  function pointer(type, e) {
    if (type === 'pointerdown') {
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      Object.assign(drag, { on: true, id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 });
    } else if (type === 'pointermove' && drag.on && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      // Dragging pulls the view with the finger, as in the Aabijijiwan viewer.
      yaw += dx * 0.0042; pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.0042));
    } else if ((type === 'pointerup' || type === 'pointercancel') && e.pointerId === drag.id) {
      if (type === 'pointerup' && drag.moved < 8) walkTo(e.clientX, e.clientY);
      drag.on = false;
    }
  }
  const MOVE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  function key(e, down) {
    if (!MOVE.has(e.code)) return false;
    if (down) { keys.add(e.code); goal = null; } else keys.delete(e.code);
    return true;
  }
  function wheel(e) {
    const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const to = (goal || pos).clone().addScaledVector(f, -e.deltaY * 0.006);
    to.y = EYE; keepIn(to); goal = to;
    return true;
  }

  const f = new THREE.Vector3(), r = new THREE.Vector3();
  function update(dt) {
    f.set(-Math.sin(yaw), 0, -Math.cos(yaw)); r.set(Math.cos(yaw), 0, -Math.sin(yaw));
    let fw = 0, sd = 0, turn = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) fw += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fw -= 1;
    if (keys.has('KeyD')) sd += 1;
    if (keys.has('KeyA')) sd -= 1;
    if (keys.has('ArrowLeft')) turn += 1;
    if (keys.has('ArrowRight')) turn -= 1;
    yaw += turn * 1.6 * dt;
    if (fw || sd) { pos.addScaledVector(f, fw * SPEED * dt).addScaledVector(r, sd * SPEED * dt); keepIn(pos); }
    if (goal) {
      const d = pos.distanceTo(goal);
      if (d < 0.05) goal = null; else pos.lerp(goal, Math.min(1, (SPEED * 1.3 * dt) / d));
    }
    camera.position.copy(pos);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    sky.position.copy(pos);
    renderer.setClearColor(SKY.horizon, 1);
    renderer.render(scene, camera);
  }
  function resize(w, h) {
    camera.aspect = w / h;
    camera.fov = w < h ? 74 : 62;          // a taller view on a phone held upright
    camera.updateProjectionMatrix();
    motes.material.uniforms.uSize.value = renderer.getPixelRatio() * h / 800;
  }

  return { update, resize, pointer, key, wheel, clearKeys: () => keys.clear(), scene, camera };
}
