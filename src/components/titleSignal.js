// The landing title as a signal: the letters are drawn on a canvas so a scan line can
// run through them. Moving the pointer (or tilting a phone) across the title carries a
// light through the letters and knocks the rows under the scan line sideways, with
// colour fringes, like a camera finding an image target. Left alone, it holds still.
//
// Colours are read from the --title-* tokens in src/brand/tokens.css.

import { motion } from '../field/motion.js';

const STROKE = 0.1; // of the font size, the same weight as the DOM title
const CORE = 0.035; // how far the lit core spreads into that stroke
const REST = 0.5; // light level when nobody is near
const BANDS = 56; // rows the scan can displace
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function tokenColours(el) {
  const css = getComputedStyle(el);
  const probe = document.createElement('canvas').getContext('2d');
  const read = (name) => {
    probe.fillStyle = css.getPropertyValue(name).trim() || '#000';
    const hex = probe.fillStyle; // normalised to #rrggbb
    const n = parseInt(hex.slice(1), 16);
    const rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
    return { solid: `rgb(${rgb})`, clear: `rgba(${rgb}, 0)` };
  };
  return {
    ink: read('--title-ink'),
    scan: read('--title-scan'),
    lights: ['--title-light-1', '--title-light-2', '--title-light-3', '--title-light-4'].map(read),
  };
}

export function createTitleSignal({ box, text, canvas, still }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const layer = () => document.createElement('canvas');
  const ink = layer(); // black letters, full weight
  const core = layer(); // the part of each letter that takes the light
  const lit = layer(); // ink plus this frame's light
  const fringeA = layer();
  const fringeB = layer();

  let colours = tokenColours(box);
  let dpr = 1;
  let W = 0; // title box, css px
  let H = 0;
  let padX = 0;
  let padY = 0;
  let ready = false;

  // State. Positions are in css px inside the title box.
  const light = { x: 0, y: 0, tx: 0, ty: 0 };
  let energy = REST;
  let energyTarget = REST;
  let glitch = 0;
  let turn = 0.6; // the lights wheel around the pointer as it travels
  let noise = Array.from({ length: BANDS }, () => Math.random() * 2 - 1);
  let travelled = 0;
  let phase = 0; // the scan line's wave runs while the line is showing
  let frame = 0;
  let last = 0;
  let dirty = true;

  const tilt = { x: 0, y: 0, on: false, base: null };

  function build() {
    W = box.clientWidth;
    H = box.clientHeight;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    padX = Math.round(W * 0.05);
    padY = Math.round(H * 0.3);
    const cw = W + padX * 2;
    const ch = H + padY * 2;
    canvas.style.left = `${-padX}px`;
    canvas.style.top = `${-padY}px`;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    for (const c of [canvas, ink, core, lit, fringeA, fringeB]) {
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
    }

    const style = getComputedStyle(text);
    const size = parseFloat(style.fontSize) || 100;
    const font = `400 ${size}px ${style.fontFamily}`;
    const chars = [...text.textContent.trim().toUpperCase()];
    const spacing = -0.01 * size;

    const draw = (target, strokeWidth) => {
      const c = target.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, target.width, target.height);
      c.font = font;
      c.textBaseline = 'alphabetic';
      c.lineJoin = 'round';
      c.fillStyle = colours.ink.solid;
      c.strokeStyle = colours.ink.solid;
      const widths = chars.map((ch2) => c.measureText(ch2).width);
      const natural =
        widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1) + STROKE * size;
      const sx = W / natural;
      const cap = c.measureText('N').actualBoundingBoxAscent || size * 0.7;
      const baseline = padY + (H + cap) / 2;
      // Stretched sideways only, like the DOM title, so the stroke stretches with it.
      c.setTransform(dpr * sx, 0, 0, dpr, dpr * padX, 0);
      c.lineWidth = strokeWidth * size;
      let x = (STROKE * size) / 2;
      chars.forEach((ch2, i) => {
        if (strokeWidth) c.strokeText(ch2, x, baseline);
        c.fillText(ch2, x, baseline);
        x += widths[i] + spacing;
      });
    };
    draw(ink, STROKE);
    draw(core, CORE);

    const tint = (target, colour) => {
      const c = target.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, target.width, target.height);
      c.drawImage(ink, 0, 0);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = colour.solid;
      c.fillRect(0, 0, target.width, target.height);
    };
    tint(fringeA, colours.lights[0]);
    tint(fringeB, colours.lights[1]);

    if (!ready) {
      // The light starts over the right of the title, under XR.
      light.x = light.tx = W * 0.68;
      light.y = light.ty = H * 0.5;
    }
    ready = true;
    dirty = true;
    if (still) render();
  }

  function paintLight() {
    const c = lit.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, lit.width, lit.height);
    c.drawImage(core, 0, 0);
    // Light only lands on the letters' cores.
    c.globalCompositeOperation = 'source-atop';
    c.setTransform(dpr, 0, 0, dpr, dpr * padX, dpr * padY);
    const reach = Math.max(H * 1.5, W * 0.2);
    colours.lights.forEach((col, i) => {
      const a = turn + (i * Math.PI * 2) / colours.lights.length;
      const x = light.x + Math.cos(a) * reach * 0.62;
      const y = light.y + Math.sin(a) * H * 0.3;
      const g = c.createRadialGradient(x, y, 0, x, y, reach);
      g.addColorStop(0, col.solid);
      g.addColorStop(0.55, col.solid);
      g.addColorStop(1, col.clear);
      c.globalAlpha = clamp(energy * 1.15);
      c.fillStyle = g;
      c.fillRect(-padX, -padY, W + padX * 2, H + padY * 2);
    });
    // A hot centre where the scan is pointing
    const hot = c.createRadialGradient(light.x, light.y, 0, light.x, light.y, H * 0.55);
    hot.addColorStop(0, colours.scan.solid);
    hot.addColorStop(1, colours.scan.clear);
    c.globalAlpha = clamp((energy - REST) * 1.7);
    c.fillStyle = hot;
    c.fillRect(-padX, -padY, W + padX * 2, H + padY * 2);
    c.globalAlpha = 1;
    // Ink underneath: the black rim of every letter stays, whatever the light does.
    c.globalCompositeOperation = 'destination-over';
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(ink, 0, 0);
    c.globalCompositeOperation = 'source-over';
  }

  function render() {
    if (!ready) return;
    paintLight();
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const bandH = Math.ceil(ch / BANDS);
    const scanY = (light.y + padY) * dpr;
    const sigma = H * 0.3 * dpr;
    const maxShift = W * 0.045 * dpr;
    let runStart = 0; // undisplaced rows are drawn in one piece
    const flush = (end) => {
      if (end > runStart) ctx.drawImage(lit, 0, runStart, cw, end - runStart, 0, runStart, cw, end - runStart);
    };
    for (let i = 0; i < BANDS; i += 1) {
      const y0 = i * bandH;
      if (y0 >= ch) break;
      const d = (y0 + bandH / 2 - scanY) / sigma;
      const dx = glitch > 0.01 ? Math.round(glitch * Math.exp(-d * d) * noise[i] * maxShift) : 0;
      if (dx === 0) continue;
      flush(y0);
      runStart = y0 + bandH;
      const hgt = Math.min(bandH, ch - y0);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(fringeA, 0, y0, cw, hgt, dx * 2.1, y0, cw, hgt);
      ctx.drawImage(fringeB, 0, y0, cw, hgt, -dx * 1.3, y0, cw, hgt);
      ctx.globalAlpha = 1;
      ctx.drawImage(lit, 0, y0, cw, hgt, dx, y0, cw, hgt);
    }
    flush(ch);

    // Scan line and the corner marks of a tracked target
    ctx.setTransform(dpr, 0, 0, dpr, dpr * padX, dpr * padY);
    const lift = clamp((energy - REST) / (1 - REST));
    if (lift > 0.02) {
      const span = W * 0.5;
      const g = ctx.createLinearGradient(light.x - span, 0, light.x + span, 0);
      g.addColorStop(0, colours.scan.clear);
      g.addColorStop(0.5, colours.scan.solid);
      g.addColorStop(1, colours.scan.clear);
      // A sine wave that runs along the line, tallest at the pointer and flat at the ends
      const amp = H * 0.07 * lift;
      const wavelength = Math.max(48, H * 0.55);
      ctx.beginPath();
      for (let x = -span; x <= span; x += 3) {
        const taper = Math.cos((x / span) * (Math.PI / 2)) ** 2;
        const y = light.y + Math.sin((x / wavelength) * Math.PI * 2 - phase) * amp * taper;
        if (x === -span) ctx.moveTo(light.x + x, y);
        else ctx.lineTo(light.x + x, y);
      }
      ctx.globalAlpha = lift * 0.95;
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1.5, H * 0.012);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const arm = Math.max(10, H * 0.14);
    const out = Math.max(6, H * 0.12) * (1 - lift * 0.7); // the marks close in as it locks
    ctx.strokeStyle = colours.ink.solid;
    ctx.lineWidth = Math.max(1.5, H * 0.012);
    ctx.lineCap = 'square';
    ctx.globalAlpha = 0.35 + lift * 0.65;
    ctx.beginPath();
    [
      [-out, -out, 1, 1],
      [W + out, -out, -1, 1],
      [-out, H + out, 1, -1],
      [W + out, H + out, -1, -1],
    ].forEach(([x, y, sx, sy]) => {
      ctx.moveTo(x + arm * sx, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + arm * sy);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function aim(x, y, near) {
    const dx = x - light.tx;
    const dy = y - light.ty;
    const moved = Math.hypot(dx, dy);
    light.tx = x;
    light.ty = clamp(y, -H * 0.1, H * 1.1);
    energyTarget = REST + (1 - REST) * near;
    if (near > 0) {
      glitch = clamp(glitch + (moved / W) * 5 * near);
      turn += (dx / W) * 2.4;
      travelled += moved;
      if (travelled > H * 0.12) {
        travelled = 0;
        noise = noise.map(() => Math.random() * 2 - 1);
      }
    }
    dirty = true;
  }

  const onPointer = (e) => {
    if (motion.get().userPaused || !ready) return;
    const r = box.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    // Full strength over the title, fading out over about a title's height around it
    const away = Math.hypot(Math.max(-x, 0, x - W), Math.max(-y, 0, y - H));
    const near = clamp(1 - away / (H * 1.2));
    if (near > 0 || energyTarget > REST) aim(clamp(x, 0, W), y, near);
  };
  const onLeave = () => {
    energyTarget = REST;
    dirty = true;
  };
  const onOrientation = (e) => {
    if (e.beta == null || e.gamma == null || !ready) return;
    if (!tilt.base) tilt.base = { x: e.gamma, y: e.beta };
    tilt.base.x += (e.gamma - tilt.base.x) * 0.02;
    tilt.base.y += (e.beta - tilt.base.y) * 0.02;
    const tx = clamp((e.gamma - tilt.base.x) / 20, -1, 1);
    const ty = clamp((e.beta - tilt.base.y) / 20, -1, 1);
    if (Math.abs(tx - tilt.x) + Math.abs(ty - tilt.y) < 0.004) return;
    tilt.x = tx;
    tilt.y = ty;
    const r = box.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    aim(W * (0.5 + tx * 0.5), H * (0.5 + ty * 0.6), clamp(Math.hypot(tx, ty) * 2.5));
  };
  const syncTilt = (s) => {
    const want = s.tilt && !s.userPaused;
    if (want && !tilt.on) {
      window.addEventListener('deviceorientation', onOrientation);
      tilt.base = null;
    } else if (!want && tilt.on) {
      window.removeEventListener('deviceorientation', onOrientation);
    }
    tilt.on = want;
    if (s.userPaused) onLeave();
  };

  const tick = (t) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((t - last) / 1000, 0.1);
    last = t;
    if (!ready) return;
    const follow = 1 - Math.exp(-dt * 9);
    const mx = (light.tx - light.x) * follow;
    const my = (light.ty - light.y) * follow;
    const me = (energyTarget - energy) * (1 - Math.exp(-dt * 4));
    const before = glitch;
    glitch *= Math.exp(-dt * 5);
    if (glitch < 0.01) glitch = 0;
    // The wave keeps running for as long as the scan line shows
    const scanning = energy - REST > 0.02 || energyTarget > REST;
    if (scanning) phase += dt * 7;
    if (!dirty && !scanning && Math.abs(mx) + Math.abs(my) < 0.05 && Math.abs(me) < 0.002 && before === 0) return;
    light.x += mx;
    light.y += my;
    energy += me;
    dirty = false;
    render();
  };

  build();
  const ro = new ResizeObserver(build);
  ro.observe(box);
  document.fonts?.ready.then(build);

  let unsubscribe = () => {};
  if (!still) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    unsubscribe = motion.subscribe(syncTilt);
    syncTilt(motion.get());
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  return {
    refresh() {
      colours = tokenColours(box);
      build();
    },
    destroy() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onOrientation);
      unsubscribe();
    },
  };
}
