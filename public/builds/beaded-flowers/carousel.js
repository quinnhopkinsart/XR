// Each flower: one plant at a time on a round of beads, with its name and a few lines.
// Drag turns the flower. Previous, Next, the row of names and the arrow keys change it.

export function buildCarousel(ctx, flowers, onChange) {
  const { THREE, renderer, canvas, environment, materials, geometries, SKY } = ctx;

  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = SKY.room + 0.1;
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  // Lit like the field: a strong low sun from behind and to one side, a dim sky, and a
  // small light from the front so the beads facing the visitor still read.
  const sun = new THREE.DirectionalLight(new THREE.Color(SKY.sunLight), SKY.sunPower);
  sun.position.set(-4, 1.2 + SKY.sunHeight * 6, -3);
  const front = new THREE.DirectionalLight(new THREE.Color('#ffffff'), 1.2);
  front.position.set(2, 3, 5);
  scene.add(sun, front, new THREE.HemisphereLight(new THREE.Color(SKY.skyLight), new THREE.Color(SKY.groundLight), SKY.skyPower + 0.25));

  // The same sky as the field, as a backdrop: the horizon's colour low, the top's high.
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { top: { value: new THREE.Color(SKY.top) }, mid: { value: new THREE.Color(SKY.mid) }, low: { value: new THREE.Color(SKY.horizon) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 top, mid, low;
        void main(){ vec3 c = mix(low, mid, smoothstep(0.0, 0.45, vUv.y)); c = mix(c, top, smoothstep(0.35, 1.0, vUv.y));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  backdrop.frustumCulled = false; backdrop.renderOrder = -1;
  scene.add(backdrop);

  // The round the flower stands on.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#16331f', roughness: 0.7 }),
  );
  scene.add(disc);

  // One turntable per flower, built the first time it is shown.
  const stands = new Map();
  function stand(f) {
    if (stands.has(f.id)) return stands.get(f.id);
    const geo = geometries[f.id];
    geo.computeBoundingBox();
    const box = geo.boundingBox, size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const mesh = new THREE.Mesh(geo, materials[f.id]);
    mesh.position.set(-mid.x, -box.min.y, -mid.z);        // centred, standing on the round
    const group = new THREE.Group();
    group.add(mesh);
    group.visible = false;
    scene.add(group);
    const s = { group, height: size.y, radius: Math.max(size.x, size.z) / 2 };
    stands.set(f.id, s);
    return s;
  }

  let index = 0, shown = null, leaving = null, slide = 1, dir = 1;
  let spin = 0, vel = 0, idle = 0;
  let view = { w: 1, h: 1 };

  const el = {
    count: document.getElementById('card-count'), name: document.getElementById('card-name'),
    text: document.getElementById('card-text'), meta: document.getElementById('card-meta'),
    picks: document.getElementById('picks'), card: document.getElementById('card'),
  };
  flowers.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = f.name; b.dataset.id = f.id;
    b.addEventListener('click', () => go(i));
    el.picks.append(b);
  });
  document.getElementById('prev').addEventListener('click', () => go(index - 1, -1));
  document.getElementById('next').addEventListener('click', () => go(index + 1, 1));

  function write() {
    const f = flowers[index];
    el.count.textContent = `${index + 1} of ${flowers.length}`;
    el.name.textContent = f.name;
    el.text.textContent = f.text;
    el.meta.textContent = `Game asset: ${f.tris} triangles`;
    [...el.picks.children].forEach((b, i) => {
      b.setAttribute('aria-pressed', String(i === index));
      if (i === index) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function go(i, way) {
    const n = flowers.length, next = ((i % n) + n) % n;
    if (shown && next === index) return;
    dir = way || (next > index ? 1 : -1);
    index = next;
    if (leaving) leaving.group.visible = false;
    leaving = shown;
    shown = stand(flowers[index]);
    shown.group.visible = true;
    slide = leaving ? 0 : 1;
    spin = 0.5; vel = 0; idle = 0;
    write(); frame(); onChange();
  }

  // Fit the camera to the flower, and keep the flower clear of the card: beside it on a
  // wide screen, above it on a narrow one.
  function frame() {
    if (!shown) return;
    const { w, h } = view;
    const cardRect = el.card.parentElement.getBoundingClientRect();
    const wide = w > 760;
    const freeW = wide ? w - cardRect.width - 32 : w;
    const freeH = wide ? h : Math.max(h * 0.35, cardRect.top - 70);
    const top = wide ? 0 : 70;
    const half = Math.max(shown.height / 2, shown.radius) * 1.18;
    const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
    // distance so the flower fits the free area, by height and by width
    const dH = half / Math.tan(fov) * (h / freeH);
    const dW = shown.radius * 1.18 / (Math.tan(fov) * camera.aspect) * (w / freeW);
    const dist = Math.max(dH, dW, 2.5);
    camera.position.set(0, shown.height * 0.5 + dist * 0.16, dist);
    camera.lookAt(0, shown.height * 0.5, 0);
    // shift the picture so its middle is the middle of the free area
    const cx = wide ? freeW / 2 : w / 2, cy = top + freeH / 2;
    camera.setViewOffset(w, h, Math.round(w / 2 - cx), Math.round(h / 2 - cy), w, h);
    disc.scale.setScalar(Math.max(shown.radius * 0.8, 0.7));
  }

  const drag = { on: false, id: null, x: 0 };
  function pointer(type, e) {
    if (type === 'pointerdown') {
      canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
      Object.assign(drag, { on: true, id: e.pointerId, x: e.clientX }); vel = 0;
    } else if (type === 'pointermove' && drag.on && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      spin += dx * 0.008; vel = dx * 0.008 * 60; idle = 0;
    } else if ((type === 'pointerup' || type === 'pointercancel') && e.pointerId === drag.id) drag.on = false;
  }
  function key(e, down) {
    if (!down) return false;
    if (e.code === 'ArrowRight') { go(index + 1, 1); return true; }
    if (e.code === 'ArrowLeft') { go(index - 1, -1); return true; }
    return false;
  }

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function update(dt, motion) {
    if (!drag.on) {
      spin += vel * dt; vel *= Math.pow(0.02, dt);
      idle += dt;
      if (motion && idle > 1.2) spin += 0.22 * dt;        // a slow turn when left alone
    }
    if (slide < 1) slide = motion ? Math.min(1, slide + dt * 2.2) : 1;
    const k = ease(slide), span = shown ? Math.max(4, shown.radius * 4) : 4;
    if (shown) { shown.group.rotation.y = spin; shown.group.position.x = (1 - k) * span * dir; }
    if (leaving) {
      leaving.group.position.x = -k * span * dir;
      if (slide >= 1) { leaving.group.visible = false; leaving.group.position.x = 0; leaving = null; }
    }
    disc.visible = slide >= 1 || !motion;
    renderer.setClearColor(SKY.haze, 1);
    renderer.render(scene, camera);
  }
  function resize(w, h) {
    view = { w, h };
    camera.aspect = w / h; camera.updateProjectionMatrix();
    frame();
  }

  return {
    update, resize, pointer, key, wheel: () => false,
    current: () => flowers[index],
    show(id) {
      const i = id ? flowers.findIndex((f) => f.id === id) : index;
      if (!shown || i !== index) { shown ? go(i) : (index = Math.max(0, i), go(index)); }
      frame();
    },
  };
}
