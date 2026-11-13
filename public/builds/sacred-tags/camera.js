// The webcam as a sensor. The installation reads bodies with a depth camera; a webcam has
// no depth, so this reads movement: each frame is compared with the one before it and
// whatever changed becomes the mark on the wall. The picture is mirrored, so moving right
// moves the mark right. Nothing is recorded or sent anywhere: frames are drawn to a tiny
// canvas in the page, compared, and thrown away.

import { ASPECT } from './teachings.js';

export const GRID_W = 96;
export const GRID_H = Math.round(GRID_W / ASPECT); // 41

const THRESHOLD = 14; // change in brightness (0 to 255) that counts as movement
const RANGE = 46; // change above the threshold that counts as full movement
const HOLD = 0.72; // how much of the last frame's movement carries into this one

export function createCamera() {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');

  const canvas = document.createElement('canvas');
  canvas.width = GRID_W;
  canvas.height = GRID_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const motion = new Uint8Array(GRID_W * GRID_H); // what the wall reads
  let last = null; // brightness of the frame before
  let stream = null;
  let lastTime = -1;
  let fresh = false;

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('unsupported');
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
    });
    video.srcObject = stream;
    await video.play();
  }

  function stop() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    last = null;
    motion.fill(0);
    fresh = true;
  }

  // Call once a frame. Returns true when `motion` changed.
  function update() {
    if (!stream || video.readyState < 2 || video.currentTime === lastTime) {
      const f = fresh;
      fresh = false;
      return f;
    }
    lastTime = video.currentTime;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return false;

    // Cover the container's band with the camera picture: full width, the middle of its height.
    let sw = vw;
    let sh = vw / ASPECT;
    if (sh > vh) { sh = vh; sw = vh * ASPECT; }
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    ctx.save();
    ctx.translate(GRID_W, 0);
    ctx.scale(-1, 1); // mirror
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, GRID_W, GRID_H);
    ctx.restore();

    const px = ctx.getImageData(0, 0, GRID_W, GRID_H).data;
    const now = new Uint8Array(GRID_W * GRID_H);
    for (let i = 0, j = 0; i < now.length; i++, j += 4) {
      now[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
    }
    if (last) {
      for (let i = 0; i < now.length; i++) {
        const d = Math.abs(now[i] - last[i]) - THRESHOLD;
        const m = d > 0 ? Math.min(255, (d / RANGE) * 255) : 0;
        motion[i] = Math.max(m, motion[i] * HOLD);
      }
    }
    last = now;
    return true;
  }

  // How much movement there is inside a box, 0 to 1. Centre and half size as fractions.
  function energy(cx, cy, hw, hh) {
    const x0 = Math.max(0, Math.floor((cx - hw) * GRID_W));
    const x1 = Math.min(GRID_W - 1, Math.ceil((cx + hw) * GRID_W));
    const y0 = Math.max(0, Math.floor((cy - hh) * GRID_H));
    const y1 = Math.min(GRID_H - 1, Math.ceil((cy + hh) * GRID_H));
    let sum = 0;
    let n = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) { sum += motion[y * GRID_W + x]; n++; }
    }
    return n ? sum / (n * 255) : 0;
  }

  // Where across the wall the movement is, 0 to 1, or null when it is still.
  function centre() {
    let sum = 0;
    let sx = 0;
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const m = motion[y * GRID_W + x];
        sum += m;
        sx += m * x;
      }
    }
    return sum > GRID_W * GRID_H * 4 ? sx / sum / (GRID_W - 1) : null;
  }

  return { start, stop, update, energy, centre, motion, get on() { return !!stream; } };
}
