// The field: a meadow of the beaded flowers, walked at eye height.
// Everything is in metres. The plants are instanced, a few hundred of each, in patches.

// The plants are exported large for the game, 1.6 to 4.3 m tall. Here each is fitted to
// its own height in metres (`tall` in PLANT), between a visitor's knee and hip, so the
// field lies below the eye and you look out over it. A plant varies 15% either way.
const EYE = 1.6;           // the visitor's eye height
const WALK = 24;           // how far from the middle a visitor can walk
const REACH = 36;          // how far out the flowers grow
const SPEED = 2.6;         // metres a second on the keys

// How many of each plant, in how many patches, and how wide a patch spreads (metres).
// Phones get about half.
const PLANT = {
  'asters':         { tall: 0.72, count: 520, patches: 24, spread: 1.7 },
  'coneflowers':    { tall: 0.68, count: 500, patches: 22, spread: 1.8 },
  'wild-rice':      { tall: 0.95, count: 460, patches: 24, spread: 2.0 },
  'blueberry':      { tall: 0.58, count: 600, patches: 22, spread: 1.6 },
  'prairie-crocus': { tall: 0.85, count: 300, patches: 20, spread: 1.9 },
  'wolf-willow':    { tall: 0.8, count: 440, patches: 20, spread: 1.7 },
  'table-flowers':  { tall: 0.75, count: 500, patches: 22, spread: 1.8 },
  'spray':          { tall: 0.95, count: 40, patches: 26, spread: 0.4 },
};
const GRASS = 8000;        // blades of bead grass
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
  scene.environmentIntensity = SKY.room;
  scene.fog = new THREE.FogExp2(new THREE.Color(SKY.haze), SKY.fog);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 220);

  // Light: one strong sun and a much dimmer sky, so every bead has a lit side and a
  // shaded side. At sunset the sun is low and ahead, and the flowers are lit from behind.
  // The sun stands a little to the left of the way the path leads from where the visitor starts.
  const sunDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), SKY.sunTurn)
    .multiplyScalar(Math.sqrt(1 - SKY.sunHeight * SKY.sunHeight));
  sunDir.y = SKY.sunHeight;
  const sun = new THREE.DirectionalLight(new THREE.Color(SKY.sunLight), SKY.sunPower);
  sun.position.copy(sunDir).multiplyScalar(50);
  scene.add(sun, new THREE.HemisphereLight(new THREE.Color(SKY.skyLight), new THREE.Color(SKY.groundLight), SKY.skyPower));

  // Sky: a dome in three bands, horizon to middle to top, with the sun and its glow.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      uniforms: {
        top: { value: new THREE.Color(SKY.top) }, mid: { value: new THREE.Color(SKY.mid) }, horizon: { value: new THREE.Color(SKY.horizon) },
        haze: { value: new THREE.Color(SKY.haze) }, sunCol: { value: new THREE.Color(SKY.sun) }, sunDir: { value: sunDir },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vDir; uniform vec3 top, mid, horizon, haze, sunCol, sunDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          float s = max(dot(d, sunDir), 0.0);
          // the bands sit lower away from the sun, so the colour gathers round it
          float lift = mix(0.55, 1.0, pow(s, 2.0));
          vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22 * lift, h));
          c = mix(c, top, smoothstep(0.12 * lift, 0.62, h));
          c = mix(c, haze, (1.0 - smoothstep(0.0, 0.06, h)) * 0.6);
          c = mix(c, sunCol, clamp(pow(s, 10.0) * 0.55 + pow(s, 90.0) * 0.6 + smoothstep(0.9993, 0.9997, s), 0.0, 1.0));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // Ground: seed beads, drawn in the shader, so there is no picture to repeat and no seams.
  // Each bead is a short tube lying on its side, seen from above as a rounded square, set
  // in straight rows and columns like loom beadwork and packed close. Each takes one
  // colour, and the colours are dark: dark greens, with large patches of dark brown beads
  // for bare earth and of dark grey for stony ground, and now and then one light grey
  // pebble. Where the patches fall comes from `land`, a small map of the field made once
  // here (red: earth, green: stone, blue: tone, which shades beads darker or lighter in
  // drifts). The grass reads it too: thin on earth, none on stone.
  // size: metres across. cells: map cells. bead: metres along a bead, and `across` its
  // width as a part of that. earth, stone: the share of the field each covers.
  // pebble: how many beads in a hundred are light pebbles, on open ground and on stone.
  const LAND = { size: 96, cells: 128, bead: 0.05, across: 0.94, earth: 0.3, stone: 0.08, pebble: [0.7, 5] };
  const land = (() => {
    const r = seeded(4242), G = 64, lattice = new Float32Array(G * G * 2);
    for (let i = 0; i < lattice.length; i++) lattice[i] = r();
    const at = (ch, x, y) => lattice[(((y % G) + G) % G * G + ((x % G) + G) % G) * 2 + ch];
    const smooth = (ch, x, y) => {
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      return (at(ch, x0, y0) * (1 - ux) + at(ch, x0 + 1, y0) * ux) * (1 - uy) + (at(ch, x0, y0 + 1) * (1 - ux) + at(ch, x0 + 1, y0 + 1) * ux) * uy;
    };
    const n = LAND.cells, data = new Uint8Array(n * n * 4), raw = [[], [], []];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n;
      // earth in broad patches 15 to 25 m across, stone in patches 6 to 10 m across, and
      // tone in drifts about 8 m across
      let earth = smooth(0, u * 4, v * 4) * 0.75 + smooth(0, u * 11 + 7, v * 11 + 3) * 0.25;
      const stone = smooth(1, u * 11, v * 11) * 0.75 + smooth(1, u * 27 + 5, v * 27 + 9) * 0.25;
      const tone = smooth(0, u * 12 + 31, v * 12 + 17) * 0.7 + smooth(1, u * 29 + 13, v * 29 + 41) * 0.3;
      // keep the middle, where the visitor starts, green: the patches begin a few steps off
      const mx = (u - 0.5) * LAND.size, mz = (v - 0.5) * LAND.size;
      earth -= 0.35 * Math.exp(-(mx * mx + mz * mz) / (2 * 7 * 7));
      raw[0].push(earth); raw[1].push(stone); raw[2].push(tone);
    }
    // Stretch each to the full 0 to 1, so the shares mean what they say.
    for (let ch = 0; ch < 3; ch++) {
      const lo = Math.min(...raw[ch]), hi = Math.max(...raw[ch]);
      raw[ch].forEach((val, k) => { data[k * 4 + ch] = Math.round(((val - lo) / (hi - lo)) * 255); data[k * 4 + 3] = 255; });
    }
    // The level above which the map counts as earth, or stone: set so each covers its share.
    const levelFor = (ch, share) => {
      const sorted = Array.from({ length: n * n }, (_, k) => data[k * 4 + ch]).sort((p, q) => p - q);
      return sorted[Math.floor(sorted.length * (1 - share))] / 255;
    };
    const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    // The same map for placing things: 0 to 1 at a place in the field.
    const read = (ch, x, z) => {
      const px = (((x / LAND.size + 0.5) % 1) + 1) % 1 * n, py = (((z / LAND.size + 0.5) % 1) + 1) % 1 * n;
      return data[(Math.min(n - 1, Math.floor(py)) * n + Math.min(n - 1, Math.floor(px))) * 4 + ch] / 255;
    };
    return { tex, earth: (x, z) => read(0, x, z), stone: (x, z) => read(1, x, z), earthAt: levelFor(0, LAND.earth), stoneAt: levelFor(1, LAND.stone) };
  })();
  const EARTH_AT = land.earthAt.toFixed(4), STONE_AT = land.stoneAt.toFixed(4);
  const colours = (list) => list.map((c) => new THREE.Color(c));
  const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.3 });
  groundMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uLand: { value: land.tex },
      // each list runs dark to lighter: the land's tone picks along it, so shades gather in drifts
      uGreen: { value: colours(['#0b2214', '#0e2a18', '#12331d', '#163d22', '#1a4727', '#1f522c', '#245c31', '#2c6a36']) },
      uEarth: { value: colours(['#170e08', '#1e130b', '#27190f', '#302013', '#3a2717', '#452e1b', '#50361f', '#5c3f25']) },
      uStone: { value: colours(['#1c1b1a', '#252423', '#2f2e2c', '#3a3836']) },
      uPebble: { value: colours(['#a9a6a0', '#c4c1bb']) },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGround;
        uniform sampler2D uLand; uniform vec3 uGreen[8]; uniform vec3 uEarth[8]; uniform vec3 uStone[4]; uniform vec3 uPebble[2];
        float beadHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `
        // Which bead this point is on. Beads lie in straight rows: one unit along the bead
        // (x, the way its thread runs), a little less across it.
        const vec2 CELL = vec2(1.0, ${LAND.across.toFixed(2)});
        vec2 bp = vGround.xz / ${LAND.bead.toFixed(3)};
        vec2 cell = floor(bp / CELL);
        vec2 centre = (cell + 0.5) * CELL;
        vec2 q = (bp - centre) / (CELL * 0.5);                 // -1 to 1 across the bead, each way
        float h = beadHash(cell), h2 = beadHash(cell + 17.3);
        // What the land is under this bead. A little chance per bead frays the patch edges.
        vec3 landAt = texture2D(uLand, centre * ${LAND.bead.toFixed(3)} / ${LAND.size.toFixed(1)} + 0.5).rgb;
        float isEarth = step(${EARTH_AT}, landAt.r + (h2 - 0.5) * 0.05);
        float isStone = step(${STONE_AT}, landAt.g + (h2 - 0.5) * 0.04);
        // Shade: mostly the land's tone, so neighbours match and colour gathers in large
        // drifts, with a little chance per bead so a drift is not one flat colour.
        float tone = smoothstep(0.2, 0.8, landAt.b);
        float shade = clamp(tone + (h - 0.5) * 0.4, 0.0, 0.999);
        vec3 bead = uGreen[int(shade * 8.0)];
        bead = mix(bead, uEarth[int(clamp(1.0 - tone + (h - 0.5) * 0.4, 0.0, 0.999) * 8.0)], isEarth * step(0.03, h2));
        bead = mix(bead, uStone[int(shade * 4.0)], isStone);
        // now and then a light grey pebble, more of them on stony ground
        float pebbleOdds = mix(${(LAND.pebble[0] / 100).toFixed(4)}, ${(LAND.pebble[1] / 100).toFixed(4)}, isStone);
        bead = mix(bead, uPebble[int(h * 1.999)], step(1.0 - pebbleOdds, fract(h2 * 31.7)));
        // The bead's outline: a rounded square that nearly fills its place, with a soft
        // shadow in the crease between it and its neighbours.
        vec2 box = abs(q) - vec2(0.6);
        float edge = length(max(box, 0.0)) + min(max(box.x, box.y), 0.0);   // distance out from a square with well rounded corners
        float crease = smoothstep(0.2, 0.4, edge);
        vec3 near = bead * (1.0 - crease * 0.5);
        // Far off, where a bead is smaller than a pixel, show the land's colour without the beads.
        vec3 landFar = texture2D(uLand, vGround.xz / ${LAND.size.toFixed(1)} + 0.5).rgb;
        float toneFar = min(smoothstep(0.2, 0.8, landFar.b), 0.999);
        vec3 far = mix(uGreen[int(toneFar * 8.0)], uEarth[int((0.999 - toneFar) * 8.0)], smoothstep(${EARTH_AT} - 0.02, ${EARTH_AT} + 0.02, landFar.r));
        far = mix(far, uStone[int(toneFar * 4.0)], smoothstep(${STONE_AT} - 0.02, ${STONE_AT} + 0.02, landFar.g)) * 0.9;
        float flatten = smoothstep(0.35, 1.1, max(fwidth(bp.x), fwidth(bp.y)));
        diffuseColor.rgb = mix(near, far, flatten);`)
      // The bump: each bead is a tube on its side. Across the tube the normal swings from
      // one side over the top to the other, so the sun lights one flank, shades the other
      // and draws a line of light along the top. At the two ends the tube rounds off.
      // Far off, where beads are smaller than a pixel, the ground goes back to flat.
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float across = clamp(q.y, -0.98, 0.98);                       // round the tube
          float along = sign(q.x) * smoothstep(0.55, 1.0, abs(q.x));    // and round its ends
          vec3 tube = normalize(vec3(along * 0.9, sqrt(1.0 - across * across), across));
          tube = normalize(mix(tube, vec3(0.0, 1.0, 0.0), flatten));
          normal = normalize((viewMatrix * vec4(tube, 0.0)).xyz);
        }`);
  };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(170, 48).rotateX(-Math.PI / 2), groundMat);
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
  const heightOf = (id) => { const g = geometries[id]; g.computeBoundingBox(); return g.boundingBox.max.y; };
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [id, cfg] of Object.entries(PLANT)) {
    const count = Math.round(cfg.count * (small ? 0.5 : 1));
    const centres = [];
    for (let i = 0; i < cfg.patches; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (REACH - 4);
      centres.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    // A few of each beside the path near the start, so every flower is met on the walk.
    for (let i = 0; i < 5; i++) {
      const p = curve.getPointAt(0.25 + rand() * 0.5);
      centres.push([p.x + (rand() < 0.5 ? -1 : 1) * (1.3 + rand() * 2.6), p.z + gauss() * 1.4]);
    }
    const mesh = new THREE.InstancedMesh(geometries[id], materials[id], count);
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 30) {
      const c = centres[Math.floor(rand() * centres.length)];
      const x = c[0] + gauss() * cfg.spread, z = c[1] + gauss() * cfg.spread;
      if (Math.hypot(x, z) > REACH) continue;
      if (nearPath(x, z) < 1.1) continue;
      const s = (cfg.tall / heightOf(id)) * (0.85 + rand() * 0.3);
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
      // thin on earth, none on stone
      if (land.stone(x, z) > land.stoneAt - 0.02) continue;
      if (land.earth(x, z) > land.earthAt - 0.02 && rand() < 0.85) continue;
      const w = 0.4 + rand() * 0.3, h = 0.12 + rand() * 0.2;   // ankle to shin
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
      uniforms: { uTime: ctx.wind.time, uSize: { value: 1 }, uCol: { value: new THREE.Color(SKY.motes) } },
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
  let yaw = Math.atan2(-(ahead.x - start.x), -(ahead.z - start.z)), pitch = -0.16;
  let goal = null;                         // where a tap sent the visitor
  const keys = new Set();
  const stick = { x: 0, y: 0 };            // -1 to 1 each way, set by the joystick in main.js
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
    // the joystick on touch screens: up walks forward, sideways steps sideways
    if (stick.x || stick.y) { fw -= stick.y; sd += stick.x; goal = null; }
    if (fw || sd) { pos.addScaledVector(f, fw * SPEED * dt).addScaledVector(r, sd * SPEED * dt); keepIn(pos); }
    if (goal) {
      const d = pos.distanceTo(goal);
      if (d < 0.05) goal = null; else pos.lerp(goal, Math.min(1, (SPEED * 1.3 * dt) / d));
    }
    camera.position.copy(pos);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    sky.position.copy(pos);
    renderer.setClearColor(SKY.haze, 1);
    renderer.render(scene, camera);
  }
  function resize(w, h) {
    camera.aspect = w / h;
    camera.fov = w < h ? 74 : 62;          // a taller view on a phone held upright
    camera.updateProjectionMatrix();
    motes.material.uniforms.uSize.value = renderer.getPixelRatio() * h / 800;
  }

  return { update, resize, pointer, key, wheel, clearKeys: () => keys.clear(), setStick: (x, y) => { stick.x = x; stick.y = y; }, scene, camera };
}
