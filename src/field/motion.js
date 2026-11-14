// Shared motion state for the floating field.
// The field, the Pause/Tilt controls and the build embed all read and write here.
//   userPaused   the visitor pressed Pause (remembered between visits)
//   embedPaused  a build is on screen, so the field steps aside
//   tilt         phone tilt drives the field (gyroscope)
//   fly          free camera: the page steps aside and the visitor flies through the field
//                (landing page only, see FlyMode.jsx)
//   flyForward   the Fly button is held down (screens without touch)
//   flyHome      a count; each change puts the flying camera back at its start
//   flyTour      in the free camera, scrolling carries the camera along the dashed line
//                from work to work, in place of flying freely
//   flyLens      depth of field in the free camera (remembered between visits). Only
//                screens that have the lens show its button: see `hasLens`

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

// The lens (depth of field) is left off on small and touch screens, for speed.
export const hasLens =
  typeof window !== 'undefined' && !window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let state = {
  userPaused: read('noodin-motion') === 'paused',
  embedPaused: false,
  tilt: tiltSupported && !tiltNeedsPermission && !reducedMotion && read('noodin-tilt') !== 'off',
  fly: false,
  flyForward: false,
  flyHome: 0,
  flyTour: false,
  flyLens: read('noodin-lens') !== 'off',
};

// The touch joystick in the free camera: x is right (1) and left (-1), y is forward (1)
// and back (-1). The field reads it every frame, so it is a plain object and moving the
// stick tells no listener.
export const flyStick = { x: 0, y: 0 };

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
    if ('flyLens' in patch) write('noodin-lens', state.flyLens ? 'on' : 'off');
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
