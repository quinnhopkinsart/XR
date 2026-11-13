// Sacred Tags, the web version. The graffitied side of a shipping container is the
// picture. Under the paint is rock, and on the rock are the seven teachings in
// Anishinaabemowin, each with its relative. A mouse, a finger or movement in front of a
// webcam wears the paint away. Staying on a word opens it fully and brings up what the
// word is built from.
//
// Three layers, as in the installation's fx_reveal:
//   1. the wall      assets/container.jpg, English tags on steel
//   2. the rock      assets/rock.jpg with the words and relatives painted on (buildRock)
//   3. the caption   the word, its English and its parts, in the page
// A small feedback texture (the trail) remembers where the paint has been worn. It fades,
// so the wall closes again.

import { TEACHINGS, ASPECT } from './teachings.js';
import { createCamera, GRID_W, GRID_H } from './camera.js';

// ---- numbers worth tuning ---------------------------------------------------------------
const TRAIL_W = 640; // the trail texture, in the wall's proportions
const TRAIL_STEP = 1 / 60; // the trail updates at most this often, on any display
const FADE_MUL = 0.994; // each step the trail keeps this much...
const FADE_SUB = 0.0042; // ...and loses this much, so a mark is gone in about 3.5 seconds
const BLOB = 0.105; // radius of a pointer's mark, as a fraction of the wall's height
const OPEN_TIME = 0.55; // seconds for a word to open once something is on it
const CLOSE_TIME = 2.6; // seconds for it to close again
const FOUND = 0.8; // how open a word is when its caption shows
const CAPTION_HOLD = 7; // seconds the caption stays after its word closes
const IDLE = 5;
// Smoke, after fx_reveal's Stream page.
const SMOKE_RISE = 0.22; // wall heights per second
const SMOKE_TURB = 2.0; // swirl
const SMOKE_LIFE = 2.0; // half-life in seconds. Longer is taller smoke
const SMOKE_DIFFUSION = 0.12;
const SMOKE_PUFFS = 0.35; // 0 is a solid column, 1 is separate wreaths
const SMOKE_TENDRIL = 0.22; // density where the crisp, outlined edge sits
const SMOKE_HAZE = 0.35; // faint smoke below that
const SMOKE_NOISE = 6; // noise scale
const SMOKE_FLOW = 0.06; // how fast the swirl changes
const SMOKE_WISPS = 0.65; // how much the smoke breaks into threads
const OUTLINE = [0.15, 0.45, 1.0]; // the line on every opening and on the portal
const OUTLINE_REVEAL = 1.0; // 0 takes the line off the worn paint and smoke
// The portal, after fx_portal. It opens on its own. Presence only hurries it.
const PORTAL_FIRST = 16; // seconds after Enter before the first opening
const PORTAL_PERIOD = 45; // mean wait between openings...
const PORTAL_JITTER = 12; // ...give or take this
const PORTAL_PRESENCE = 2; // the countdown runs this fast while someone is on the wall
const PORTAL_OPEN = 24; // seconds it stays open
const PORTAL_RISE = 3.5;
const PORTAL_FALL = 3; // seconds of stillness before the wall starts to stir on its own
const ROCK_W = 2048; // the rock layer is painted at this width
const WORD_SIZE = 0.052; // letter height on the rock, as a fraction of the wall's height
const UNDER = 180; // pixels kept clear under the wall for the caption and the buttons
const INK = '#f4dfb6'; // the words and relatives on the rock
// ------------------------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const framed = !!window.ST_FRAMED;
const mobile = document.documentElement.classList.contains('is-mobile');

const loadImage = (src) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error('Could not load ' + src));
  im.src = src;
});

// ---- the rock layer ----------------------------------------------------------------------
// Painted once into a canvas: the rock photo, then each word and its relative.
function buildRock(rock, marks) {
  const c = document.createElement('canvas');
  c.width = ROCK_W;
  c.height = Math.round(ROCK_W / ASPECT);
  const W = c.width;
  const H = c.height;
  const g = c.getContext('2d');
  g.drawImage(rock, 0, 0, W, H);
  // A little darker, so the paint on it reads.
  g.fillStyle = 'rgba(12,6,4,.34)';
  g.fillRect(0, 0, W, H);

  const tint = document.createElement('canvas');
  const tg = tint.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${Math.round(H * WORD_SIZE)}px "Finger Paint", "Sora", sans-serif`;

  TEACHINGS.forEach((t, i) => {
    // Keep the word on the wall, and make its opening wide enough to show all of it.
    const half = g.measureText(t.word.toUpperCase()).width / W / 2;
    t.at[0] = Math.min(0.985 - half, Math.max(0.015 + half, t.at[0]));
    const left = Math.min(t.at[0] - half, t.mark[0] - t.w / 2) - 0.02;
    const right = Math.max(t.at[0] + half, t.mark[0] + t.w / 2) + 0.02;
    t.open[0] = (left + right) / 2;
    t.open[2] = (right - left) / 2;

    // The relative, recoloured to the same paint as the word.
    const im = marks[i];
    const w = t.w * W;
    const h = (w * im.height) / im.width;
    tint.width = Math.ceil(w);
    tint.height = Math.ceil(h);
    tg.clearRect(0, 0, tint.width, tint.height);
    tg.globalCompositeOperation = 'source-over';
    tg.drawImage(im, 0, 0, tint.width, tint.height);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = INK;
    tg.fillRect(0, 0, tint.width, tint.height);

    g.save();
    g.shadowColor = 'rgba(0,0,0,.75)';
    g.shadowBlur = H * 0.022;
    g.globalAlpha = 0.94;
    g.drawImage(tint, t.mark[0] * W - w / 2, t.mark[1] * H - h / 2);
    g.fillStyle = INK;
    g.fillText(t.word.toUpperCase(), t.at[0] * W, t.at[1] * H);
    g.restore();
  });
  return c;
}

// ---- WebGL --------------------------------------------------------------------------------
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false }) ||
  canvas.getContext('webgl', { antialias: false, alpha: false });

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
// The trail is drawn into a texture, and a texture's first row is the bottom of what was
// drawn. So the trail pass counts rows the texture's way. With the screen's flip here, every
// step read the last one upside down and each mark showed twice, mirrored top to bottom.
const VERT_TRAIL = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const NOISE = `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.; a *= .5; } return s / .9375; }`;

// The trail texture holds two things. Red: where the paint has been worn, faded a little
// each step. Green: smoke, carried up and sideways along a curl-noise field, thinned to a
// half-life, with whatever is touching the wall now stamped back in, in puffs. After the
// installation's smoke_glsl.
const TRAIL = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev, uMotion;
uniform vec2 uTexel;
uniform vec4 uBlob[6];   // u, v, radius, strength
uniform vec4 uWord[7];   // u, v, half width, half height
uniform float uAmt[7];
uniform float uAspect, uCam, uMul, uSub, uTime;
uniform vec4 uSmoke;     // rise per step, swirl per step, keep per step, puffs
uniform vec3 uSmoke2;    // noise scale, flow speed, diffusion
${NOISE}
vec2 curl(vec2 p){
  float e = .06;
  return vec2(noise(p + vec2(0., e)) - noise(p - vec2(0., e)), noise(p - vec2(e, 0.)) - noise(p + vec2(e, 0.))) / (2. * e);
}
void main(){
  float c = texture2D(uPrev, vUv).r;
  float n = (texture2D(uPrev, vUv + vec2(uTexel.x, 0.)).r + texture2D(uPrev, vUv - vec2(uTexel.x, 0.)).r
           + texture2D(uPrev, vUv + vec2(0., uTexel.y)).r + texture2D(uPrev, vUv - vec2(0., uTexel.y)).r) * .25;
  float v = max(mix(c, n, .35) * uMul - uSub, 0.);
  float body = 0.;   // what is on the wall this moment: pointers and the camera
  for (int i = 0; i < 6; i++) {
    vec4 b = uBlob[i];
    float d = length((vUv - b.xy) * vec2(uAspect, 1.));
    body = max(body, b.w * (1. - smoothstep(b.z * .3, b.z, d)));
  }
  if (uCam > .5) {
    vec2 t = uTexel * 3.;
    float m = texture2D(uMotion, vUv).r * .4
      + (texture2D(uMotion, vUv + vec2(t.x, 0.)).r + texture2D(uMotion, vUv - vec2(t.x, 0.)).r
       + texture2D(uMotion, vUv + vec2(0., t.y)).r + texture2D(uMotion, vUv - vec2(0., t.y)).r) * .15;
    body = max(body, smoothstep(.1, .55, m));
  }
  float s = body;
  for (int i = 0; i < 7; i++) {
    vec4 w = uWord[i];
    float a = uAmt[i];
    vec2 q = (vUv - w.xy) / w.zw; q *= q;
    float r = sqrt(length(q)) / (.3 + .7 * a);   // a rounded box, so a long word fits to its ends
    s = max(s, a * (1. - smoothstep(.72, 1.12, r)));
  }

  // Smoke. This place's smoke was lower down a step ago.
  vec2 p = vUv * vec2(uAspect, 1.);
  vec2 flow = curl(p * uSmoke2.x + vec2(0., uTime * uSmoke2.y * 6.)) * uSmoke.y;
  vec2 from = vUv + vec2(-flow.x / uAspect, uSmoke.x - flow.y);
  float g = texture2D(uPrev, from).g;
  float gn = (texture2D(uPrev, from + vec2(uTexel.x, 0.)).g + texture2D(uPrev, from - vec2(uTexel.x, 0.)).g
            + texture2D(uPrev, from + vec2(0., uTexel.y)).g + texture2D(uPrev, from - vec2(0., uTexel.y)).g) * .25;
  g = max(mix(g, gn, uSmoke2.z) * uSmoke.z - .0012, 0.);
  float puff = mix(1., smoothstep(.3, .7, noise(p * 3. + vec2(0., uTime * 1.6))), uSmoke.w);
  g = max(g, body * puff);
  gl_FragColor = vec4(max(v, s), g, body, 1.);
}`;

// The picture: night ground, the container standing on it, the rock where the paint is
// worn or the smoke passes, and the portal. The portal is the installation's open line: a
// seam across the wall with seven orbs on it that opens into a band, and the land shows
// through as points. Whatever is touching the wall holds the other land.
const SHOW = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSteel, uRock, uTrail, uLandA, uLandB;
uniform vec4 uRect;      // the wall on screen: left, top, width, height, as fractions
uniform float uTime, uAspect, uOpen;
uniform vec3 uLine;      // outline colour
uniform vec4 uLook;      // smoke tendril level, haze, wisps, outline strength
${NOISE}
float seam(float x){
  float idle = (1. - uOpen) * (1. - uOpen);
  float t = uTime * .2 * 6.2832;
  float w = .5 * sin(6.2832 * x * 2.5 + t) + .3 * sin(6.2832 * x * 5.75 - 2. * t) + .2 * sin(6.2832 * x * 9.25 + 3. * t);
  float n = noise(vec2(x * 5., uTime * .2)) * 2. - 1.;
  return .5 + .07 * idle * mix(w, n, .55);
}
vec3 cloud(sampler2D tex, vec2 c, float n, float gain){
  vec2 g = c * vec2(uAspect, 1.) * n;
  vec2 id = floor(g);
  vec3 col = texture2D(tex, (id + .5) / n / vec2(uAspect, 1.)).rgb;
  float l = dot(col, vec3(.3, .59, .11));
  float r = (.2 + .34 * l) * (.85 + .15 * sin(uTime * 2. + hash(id) * 6.2832));
  return col * gain * (1. - smoothstep(r - .1, r, length(fract(g) - .5)));
}
vec3 wall(vec2 c){
  vec3 tr = texture2D(uTrail, c).rgb;
  vec2 q = c * vec2(uAspect, 1.);
  float t = tr.r;
  float e = t + (fbm(q * 7. + vec2(0., uTime * .04)) - .5) * .34 * smoothstep(0., .25, t)
              + (fbm(q * 46.) - .5) * .12 * smoothstep(0., .2, t);
  // Smoke, thinned into threads. Above the tendril level it cuts a crisp edge.
  float veil = tr.g * mix(1., smoothstep(.2, .8, fbm(q * vec2(11., 5.) + vec2(0., uTime * .3))) * 1.7, uLook.z);
  e = max(e, .365 + (veil - uLook.x) * .45);
  float m = smoothstep(.34, .39, e);                              // rock shows
  float haze = uLook.y * smoothstep(.02, uLook.x, veil) * (1. - m);
  float line = smoothstep(.295, .335, e) * (1. - m);              // the line outside every opening
  float glow = smoothstep(.16, .34, e) * (1. - m);
  vec3 steel = texture2D(uSteel, c).rgb * (1. - .35 * line);
  vec3 rock = texture2D(uRock, c).rgb * mix(.45, 1., smoothstep(.39, .62, e));
  vec3 col = mix(steel, rock, max(m, haze * .5));
  col += uLine * uLook.w * (line + glow * .3);

  // The portal.
  float tear = (fbm(q * 3.5 + vec2(uTime * .05, 0.)) - .5) * 1.5;
  float halfH = .0035 + uOpen * .26 * (1. + tear * smoothstep(0., .2, uOpen));
  float sd = abs(c.y - seam(c.x)) - halfH;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float x = (fi + .5) / 7.;
    float r = .045 * (1. + .45 * (hash(vec2(fi, 3.)) * 2. - 1.)) * (1. + .3 * sin(6.2832 * uTime * .13 + fi * 1.7));
    sd = min(sd, length((c - vec2(x, seam(x))) * vec2(uAspect, 1.)) - r);
  }
  float pm = 1. - smoothstep(0., .005, sd);
  if (pm > 0.) {
    vec3 land = mix(cloud(uLandA, c, 92., 1.7), cloud(uLandB, c, 150., 2.1), m);
    col = mix(col, land, pm);
  }
  float edge = smoothstep(0., .004, sd) * (1. - smoothstep(.009, .014, sd));
  col += uLine * (edge + exp(-max(sd, 0.) * 55.) * .35 * (1. - pm));
  return col;
}
void main(){
  vec2 c = (vUv - uRect.xy) / uRect.zw;
  vec3 col = mix(vec3(.028, .03, .04), vec3(.06, .062, .075), vUv.y);
  bool across = c.x > 0. && c.x < 1.;
  if (across && c.y > 0. && c.y < 1.) {
    col = wall(c);
  } else if (c.y >= 1.) {
    float d = c.y - 1.;
    // The ground: a contact shadow, and the painted wall's light lying on it.
    if (across && d < .5) col += texture2D(uSteel, vec2(c.x, 1. - d * 1.6)).rgb * .1 * (1. - smoothstep(0., .5, d));
    col *= mix(.55, 1., smoothstep(0., .05, d));
  }
  col += (hash(vUv * 931. + uTime) - .5) * .012;
  gl_FragColor = vec4(col, 1.);
}`;

function program(fs, vs = VERT) {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const pr = gl.createProgram();
  gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(pr, 0, 'p');
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  const u = {};
  const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(pr, i).name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(pr, name);
  }
  return { pr, u };
}

function texture(source, w, h, format) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  else gl.texImage2D(gl.TEXTURE_2D, 0, format || gl.RGBA, w, h, 0, format || gl.RGBA, gl.UNSIGNED_BYTE, null);
  return t;
}

// A picture wider than the device can hold is drawn smaller first.
function fit(img) {
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const w = img.width;
  if (w <= max) return img;
  const c = document.createElement('canvas');
  c.width = max;
  c.height = Math.round((img.height * max) / w);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// ---- state --------------------------------------------------------------------------------
const pointers = new Map(); // pointerId -> { u, v }
const key = { u: 0.5, v: 0.5, until: 0 }; // the arrow keys' mark
const amt = TEACHINGS.map(() => 0); // how open each word is
const forced = TEACHINGS.map(() => 0); // a button holds its word open until this time
let rect = { x: 0, y: 0, w: 1, h: 1 }; // the wall on screen, in CSS pixels
let pan = 0.5; // which part of the wall a narrow screen shows, 0 to 1
let panTo = 0.5;
let panRoom = 0; // how far the wall runs past the screen, in pixels
let lastInput = -100;
let shown = -1; // the teaching in the caption
let shownAt = 0;
let running = false;
const camera = createCamera();
// The portal: how open it is, seconds left open, seconds until it opens, which land is outside.
const portal = { o: 0, left: 0, wait: PORTAL_FIRST, swap: false };
const portalBtn = $('portal-btn');
function openPortal() {
  portal.left = PORTAL_OPEN;
  portalBtn.textContent = 'Close portal';
  portalBtn.setAttribute('aria-pressed', 'true');
  found.textContent = portal.swap
    ? 'The wall opens along a seam. A city at dusk shows through, drawn in points of light.'
    : 'The wall opens along a seam. A river and its green bank show through, drawn in points of light.';
}
function closePortal() {
  portal.left = 0;
  portal.wait = PORTAL_PERIOD + (Math.random() * 2 - 1) * PORTAL_JITTER;
}

function layout() {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  const pw = Math.round(W * dpr);
  const ph = Math.round(H * dpr);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  const edge = W * 0.03;
  const top = framed ? 56 : 76;
  const room = H - top - UNDER; // what is left between the buttons above and the caption below
  let w = Math.min(W - edge * 2, room * ASPECT);
  let h = w / ASPECT;
  // On a tall screen the whole wall would be a thin strip. Show part of it, larger.
  if (h < H * 0.36) { h = H * 0.48; w = h * ASPECT; }
  panRoom = Math.max(0, w - (W - edge * 2));
  const x = panRoom ? edge - pan * panRoom : (W - w) / 2;
  const y = top + Math.max(0, room - h) * 0.3;
  rect = { x, y, w, h, W, H };
}

// The pan that puts a place on the wall in the middle of a narrow screen.
const panFor = (u) => (panRoom ? Math.min(1, Math.max(0, (u * rect.w - (rect.W - rect.W * 0.06) / 2) / panRoom)) : 0.5);

const toWall = (e) => {
  const b = canvas.getBoundingClientRect();
  return { u: (e.clientX - b.left - rect.x) / rect.w, v: (e.clientY - b.top - rect.y) / rect.h, sx: (e.clientX - b.left) / b.width };
};
const touched = (t) => { lastInput = t; };

canvas.addEventListener('pointerdown', (e) => {
  if (!running) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
  const p = toWall(e);
  pointers.set(e.pointerId, p);
  steer(p.sx);
  touched(performance.now() / 1000);
});
canvas.addEventListener('pointermove', (e) => {
  if (!running) return;
  // A mouse marks the wall wherever it is. A finger marks it while it is down.
  if (e.pointerType !== 'mouse' && !pointers.has(e.pointerId)) return;
  const p = toWall(e);
  pointers.set(e.pointerId, p);
  steer(p.sx);
  touched(performance.now() / 1000);
});
const lift = (e) => { pointers.delete(e.pointerId); };
canvas.addEventListener('pointerup', lift);
canvas.addEventListener('pointercancel', lift);
canvas.addEventListener('pointerleave', lift);

// On a narrow screen, a pointer near either side slides the wall that way.
function steer(sx) {
  if (!panRoom) return;
  if (sx > 0.8) panTo = Math.min(1, panTo + (sx - 0.8) * 0.12);
  else if (sx < 0.2) panTo = Math.max(0, panTo - (0.2 - sx) * 0.12);
}

canvas.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 0.06 : 0.025;
  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step * ASPECT], ArrowDown: [0, step * ASPECT] }[e.key];
  if (!d || !running) return;
  e.preventDefault();
  key.u = Math.min(1, Math.max(0, key.u + d[0]));
  key.v = Math.min(1, Math.max(0, key.v + d[1]));
  key.until = performance.now() / 1000 + 4;
  panTo = panFor(key.u);
  touched(performance.now() / 1000);
});

// ---- the caption and the seven buttons ----------------------------------------------------
const caption = $('caption');
const capWord = $('cap-word');
const capEnglish = $('cap-english');
const capGloss = $('cap-gloss');
const found = $('found');
const list = $('teachings');

TEACHINGS.forEach((t, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = t.english;
  b.setAttribute('aria-label', `${t.english}: open this word on the wall`);
  b.addEventListener('click', () => {
    const now = performance.now() / 1000;
    forced[i] = now + 8;
    panTo = panFor(t.open[0]);
    touched(now);
  });
  const li = document.createElement('li');
  li.appendChild(b);
  list.appendChild(li);
});
const chips = [...list.querySelectorAll('button')];

function show(i, now) {
  shownAt = now;
  if (i === shown) return;
  shown = i;
  const t = TEACHINGS[i];
  capWord.textContent = t.word;
  capEnglish.textContent = t.english;
  capGloss.textContent = t.gloss;
  caption.hidden = false;
  caption.classList.remove('gone');
  $('hint').classList.add('gone');
  chips.forEach((c, j) => c.classList.toggle('on', j === i));
  found.textContent = `${t.word}, ${t.english}. ${t.gloss} Painted beside it, a ${t.relative}.`;
}
function hideCaption() {
  shown = -1;
  caption.classList.add('gone');
  chips.forEach((c) => c.classList.remove('on'));
}

portalBtn.addEventListener('click', () => (portal.left > 0 ? closePortal() : openPortal()));

// ---- camera button ------------------------------------------------------------------------
const camBtn = $('cam-btn');
const status = $('status');
let statusTimer = 0;
function say(text) {
  status.textContent = text;
  status.hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.hidden = true; }, 6000);
}
camBtn.addEventListener('click', async () => {
  if (camera.on) {
    camera.stop();
    camBtn.setAttribute('aria-pressed', 'false');
    camBtn.textContent = 'Camera off';
    document.documentElement.classList.remove('cam-on');
    return;
  }
  camBtn.disabled = true;
  try {
    await camera.start();
    camBtn.setAttribute('aria-pressed', 'true');
    camBtn.textContent = 'Camera on';
    document.documentElement.classList.add('cam-on');
    $('hint').classList.remove('gone');
    say('Camera on. Nothing is recorded or sent anywhere.');
  } catch (err) {
    say(err && err.name === 'NotAllowedError'
      ? 'The camera was not allowed. Your mouse or finger still works.'
      : 'No camera found. Your mouse or finger still works.');
  }
  camBtn.disabled = false;
});

// ---- start --------------------------------------------------------------------------------
async function init() {
  if (!gl) throw new Error('WebGL is not available');
  const [steelImg, rockImg, bushImg, cityImg, ...marks] = await Promise.all([
    loadImage('./assets/container.jpg'),
    loadImage('./assets/rock.jpg'),
    loadImage('./assets/land-bush.jpg'),
    loadImage('./assets/land-city.jpg'),
    ...TEACHINGS.map((t) => loadImage('./assets/' + t.img)),
    document.fonts.load('48px "Finger Paint"').catch(() => {}),
  ]).then((r) => r.slice(0, 4 + TEACHINGS.length));

  const trailH = Math.round(TRAIL_W / ASPECT);
  const pTrail = program(TRAIL, VERT_TRAIL);
  const pShow = program(SHOW);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const tSteel = texture(fit(steelImg));
  const tRock = texture(fit(buildRock(rockImg, marks)));
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const tMotion = texture(null, GRID_W, GRID_H, gl.LUMINANCE);
  const lands = [texture(fit(bushImg)), texture(fit(cityImg))];
  // The trail is half-float where the device can draw to one, so thin smoke fades smoothly.
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  let half = gl2 && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  const target = () => {
    const t = { tex: texture(null, TRAIL_W, trailH), fb: gl.createFramebuffer() };
    if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, TRAIL_W, trailH, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    if (half && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      half = false;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TRAIL_W, trailH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return t;
  };
  let a = target();
  let b = target();

  const blobs = new Float32Array(6 * 4);
  const words = new Float32Array(TEACHINGS.flatMap((t) => t.open)); // after buildRock, which sizes them
  const amts = new Float32Array(7);
  let prev = performance.now() / 1000;
  let owed = 0;
  let time = 0;

  function frame(ms) {
    requestAnimationFrame(frame);
    const now = ms / 1000;
    const dt = Math.min(0.1, Math.max(0, now - prev));
    prev = now;
    if (!reduced) time += dt;
    pan += (panTo - pan) * Math.min(1, dt * 4);
    layout();

    // Who is touching the wall.
    blobs.fill(0);
    let n = 0;
    const marksNow = [];
    for (const p of pointers.values()) if (n < 4) { blobs.set([p.u, p.v, BLOB, 1], n++ * 4); marksNow.push(p); }
    if (now < key.until) { blobs.set([key.u, key.v, BLOB, 1], n++ * 4); marksNow.push(key); }
    const camMoved = camera.on && camera.update();
    if (camera.on) {
      const c = camera.centre();
      if (c !== null) { touched(now); if (panRoom) panTo += (panFor(c) - panTo) * Math.min(1, dt * 1.5); }
    }
    // Left alone, the wall stirs on its own so there is something to notice.
    if (running && !reduced && pointers.size === 0 && now - lastInput > IDLE) {
      const k = Math.min(1, (now - lastInput - IDLE) / 2);
      blobs.set([0.5 + 0.44 * Math.sin(time * 0.11), 0.5 + 0.36 * Math.sin(time * 0.173 + 1.3), BLOB * 0.8, 0.8 * k], n++ * 4);
    }

    // How open each word is.
    let top = -1;
    TEACHINGS.forEach((t, i) => {
      const [cx, cy, hw, hh] = t.open;
      let target = now < forced[i] ? 1 : 0;
      for (const p of marksNow) {
        const d = Math.hypot((p.u - cx) / hw, (p.v - cy) / hh);
        target = Math.max(target, 1 - Math.min(1, Math.max(0, (d - 0.55) / 0.6)));
      }
      if (camera.on) target = Math.max(target, Math.min(1, camera.energy(cx, cy, hw * 0.8, hh * 0.8) * 5));
      amt[i] += target > amt[i] ? (dt / OPEN_TIME) * target : -dt / CLOSE_TIME;
      amt[i] = Math.min(1, Math.max(0, amt[i]));
      amts[i] = amt[i] * amt[i] * (3 - 2 * amt[i]);
      if (amt[i] > FOUND && (top < 0 || amt[i] > amt[top])) top = i;
    });
    if (top >= 0 && (shown < 0 || amt[shown] <= FOUND || top === shown || now < forced[top])) show(top, now);
    else if (shown >= 0 && amt[shown] > FOUND) shownAt = now;
    if (shown >= 0 && now - shownAt > CAPTION_HOLD) hideCaption();

    // The portal keeps its own time.
    if (running) {
      if (portal.left > 0) {
        portal.left -= dt;
        if (portal.left <= 0) portal.wait = PORTAL_PERIOD + (Math.random() * 2 - 1) * PORTAL_JITTER;
      } else {
        portal.wait -= dt * (now - lastInput < 1.5 ? PORTAL_PRESENCE : 1);
        if (portal.wait <= 0) openPortal();
      }
      const was = portal.o;
      portal.o = Math.min(1, Math.max(0, portal.o + (portal.left > 0 ? dt / PORTAL_RISE : -dt / PORTAL_FALL)));
      // Once it has shut, the two lands trade places for next time.
      if (was > 0 && portal.o === 0) portal.swap = !portal.swap;
    }
    if (portal.left <= 0 && portalBtn.getAttribute('aria-pressed') === 'true') {
      portalBtn.textContent = 'Open portal';
      portalBtn.setAttribute('aria-pressed', 'false');
    }
    const open = portal.o * portal.o * (3 - 2 * portal.o);

    // The trail.
    gl.disable(gl.BLEND);
    owed = Math.min(owed + dt, TRAIL_STEP * 3);
    if (camMoved) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, tMotion);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, GRID_W, GRID_H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, camera.motion);
    }
    while (owed >= TRAIL_STEP) {
      owed -= TRAIL_STEP;
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb);
      gl.viewport(0, 0, TRAIL_W, trailH);
      gl.useProgram(pTrail.pr);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, tMotion);
      gl.uniform1i(pTrail.u.uPrev, 0);
      gl.uniform1i(pTrail.u.uMotion, 2);
      gl.uniform2f(pTrail.u.uTexel, 1 / TRAIL_W, 1 / trailH);
      gl.uniform4fv(pTrail.u.uBlob, blobs);
      gl.uniform4fv(pTrail.u.uWord, words);
      gl.uniform1fv(pTrail.u.uAmt, amts);
      gl.uniform1f(pTrail.u.uAspect, ASPECT);
      gl.uniform1f(pTrail.u.uCam, camera.on ? 1 : 0);
      gl.uniform1f(pTrail.u.uMul, FADE_MUL);
      gl.uniform1f(pTrail.u.uSub, FADE_SUB);
      gl.uniform1f(pTrail.u.uTime, time);
      gl.uniform4f(pTrail.u.uSmoke, SMOKE_RISE * TRAIL_STEP, SMOKE_TURB * 0.035 * TRAIL_STEP,
        Math.pow(0.5, TRAIL_STEP / SMOKE_LIFE), SMOKE_PUFFS);
      gl.uniform3f(pTrail.u.uSmoke2, SMOKE_NOISE, SMOKE_FLOW, SMOKE_DIFFUSION);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      [a, b] = [b, a];
    }

    // The picture.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(pShow.pr);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tSteel);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tRock);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.uniform1i(pShow.u.uSteel, 0);
    gl.uniform1i(pShow.u.uRock, 1);
    gl.uniform1i(pShow.u.uTrail, 3);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, lands[portal.swap ? 1 : 0]);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, lands[portal.swap ? 0 : 1]);
    gl.uniform1i(pShow.u.uLandA, 4);
    gl.uniform1i(pShow.u.uLandB, 5);
    gl.uniform1f(pShow.u.uOpen, open);
    gl.uniform3fv(pShow.u.uLine, OUTLINE);
    gl.uniform4f(pShow.u.uLook, SMOKE_TENDRIL, SMOKE_HAZE, SMOKE_WISPS, OUTLINE_REVEAL);
    gl.uniform4f(pShow.u.uRect, rect.x / rect.W, rect.y / rect.H, rect.w / rect.W, rect.h / rect.H);
    gl.uniform1f(pShow.u.uTime, time);
    gl.uniform1f(pShow.u.uAspect, ASPECT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(frame);

  // Enter.
  const start = $('start');
  start.disabled = false;
  start.textContent = 'Enter';
  start.addEventListener('click', () => {
    running = true;
    lastInput = performance.now() / 1000 - IDLE + 1.5;
    $('splash').classList.add('done');
    $('top-actions').hidden = false;
    $('hint').hidden = false;
    list.hidden = false;
    canvas.focus({ preventScroll: true });
    setTimeout(() => { if (shown < 0) $('hint').classList.add('gone'); }, 14000);
  }, { once: true });
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) camBtn.hidden = true;

  // For tests: the state, read only.
  window.ST = { amt, rect: () => rect, camera, portal, teachings: TEACHINGS, get half() { return half; } };
}

init().catch((err) => {
  console.error(err);
  const start = $('start');
  start.textContent = 'This work needs WebGL';
});
