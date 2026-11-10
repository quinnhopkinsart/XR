// Shared motion state for the floating field.
// The field, the Pause/Tilt controls and the build embed all read and write here.
//   userPaused   the visitor pressed Pause (remembered between visits)
//   embedPaused  a build is on screen, so the field steps aside
//   tilt         phone tilt drives the field (gyroscope)

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
};

export const tiltSupported =
  typeof window !== 'undefined' &&
  'DeviceOrientationEvent' in window &&
  window.matchMedia('(pointer: coarse)').matches;

// iOS 13+ asks permission from a tap. Android grants it to any HTTPS page.
export const tiltNeedsPermission =
  tiltSupported && typeof window.DeviceOrientationEvent.requestPermission === 'function';

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let state = {
  userPaused: read('noodin-motion') === 'paused',
  embedPaused: false,
  tilt: tiltSupported && !tiltNeedsPermission && !reducedMotion && read('noodin-tilt') !== 'off',
};

const listeners = new Set();

export const motion = {
  get: () => state,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(patch) {
    state = { ...state, ...patch };
    if ('userPaused' in patch) write('noodin-motion', state.userPaused ? 'paused' : 'playing');
    if ('tilt' in patch) write('noodin-tilt', state.tilt ? 'on' : 'off');
    listeners.forEach((fn) => fn(state));
  },
};

/** Asks for gyroscope access where the browser requires it. Must run inside a tap. */
export async function requestTilt() {
  if (!tiltSupported) return false;
  if (!tiltNeedsPermission) return true;
  try {
    return (await window.DeviceOrientationEvent.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}
