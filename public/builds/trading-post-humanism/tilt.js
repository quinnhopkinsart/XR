// Tilt to look, for the 3D view on phones and tablets.
//
// The 3D view (bundle.js) turns each artwork toward a look point it reads from
// pointermove events on the window, the same way the mouse works on desktop.
// This script turns the phone's tilt into that look point, so the bundle itself
// is untouched. Loaded after bundle.js from index.html, with the #tilt-btn button.
//
// - Android and older iOS: tilt starts on its own once the visitor enters.
// - iOS 13+ and recent Chrome: the Tilt button asks for motion access first.
// - The choice is remembered. Dragging with a finger still works: tilt steps
//   aside while a finger is down and for a moment after.
(function () {
  var root = document.documentElement;
  if (window.TPH_MODE === 'ar' || !window.TPH_MOBILE) return;
  if (!('DeviceOrientationEvent' in window)) return;

  var btn = document.getElementById('tilt-btn');
  if (!btn) return;

  var STORE = 'tph-tilt';
  var RANGE = 20; // degrees of tilt for a full look to one side
  var needsPermission = typeof DeviceOrientationEvent.requestPermission === 'function';

  var on = false;
  var baseline = null;
  var target = { x: 0, y: 0 };
  var now = { x: 0, y: 0 };
  var fingerUntil = 0;
  var frame = 0;
  var last = 0;

  function read() {
    try { return localStorage.getItem(STORE); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(STORE, v); } catch (e) { /* private mode */ }
  }

  function clamp(v) {
    return Math.max(-1, Math.min(1, v));
  }

  function onOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    // Device axes to screen axes for the current orientation.
    var angle = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) % 360;
    var x = e.gamma;
    var y = e.beta;
    if (angle === 90) { x = e.beta; y = -e.gamma; }
    else if (angle === 270 || angle === -90) { x = -e.beta; y = e.gamma; }
    else if (angle === 180) { x = -e.gamma; y = -e.beta; }

    if (!baseline) baseline = { x: x, y: y };
    // Recentre slowly, so any comfortable holding angle settles to looking straight on.
    baseline.x += (x - baseline.x) * 0.015;
    baseline.y += (y - baseline.y) * 0.015;
    target.x = clamp((x - baseline.x) / RANGE);
    target.y = clamp(-(y - baseline.y) / RANGE); // tip the top away to look up
  }

  function tick(t) {
    frame = requestAnimationFrame(tick);
    var dt = last ? Math.min((t - last) / 1000, 0.1) : 0.016;
    last = t;
    if (t < fingerUntil || root.querySelector('#splash-screen')) return;
    var ease = 1 - Math.exp(-dt * 8);
    now.x += (target.x - now.x) * ease;
    now.y += (target.y - now.y) * ease;

    var canvas = document.querySelector('canvas');
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    // The bundle maps clientX/Y across the canvas to -1..1, y up.
    window.dispatchEvent(new PointerEvent('pointermove', {
      clientX: r.left + ((now.x + 1) / 2) * r.width,
      clientY: r.top + ((1 - now.y) / 2) * r.height,
      pointerType: 'mouse',
      bubbles: true
    }));
  }

  function start() {
    if (on) return;
    on = true;
    baseline = null;
    window.addEventListener('deviceorientation', onOrientation);
    last = 0;
    frame = requestAnimationFrame(tick);
    btn.setAttribute('aria-pressed', 'true');
  }

  function stop() {
    if (!on) return;
    on = false;
    window.removeEventListener('deviceorientation', onOrientation);
    cancelAnimationFrame(frame);
    target.x = target.y = now.x = now.y = 0;
    btn.setAttribute('aria-pressed', 'false');
  }

  // A finger on the screen takes over from tilt.
  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') fingerUntil = Infinity;
  }, { passive: true });
  window.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'touch') fingerUntil = performance.now() + 1500;
  }, { passive: true });
  window.addEventListener('pointercancel', function () {
    fingerUntil = performance.now() + 1500;
  }, { passive: true });

  btn.addEventListener('click', function () {
    if (on) {
      stop();
      write('off');
      return;
    }
    var ask = needsPermission
      ? DeviceOrientationEvent.requestPermission().then(function (s) { return s === 'granted'; }, function () { return false; })
      : Promise.resolve(true);
    ask.then(function (ok) {
      if (ok) {
        start();
        write('on');
      } else {
        btn.classList.add('is-denied');
        btn.setAttribute('aria-label', 'Tilt needs motion access. Allow it in your browser settings.');
      }
    });
  });

  root.classList.add('has-tilt');
  btn.setAttribute('aria-pressed', 'false');

  // Where no permission is needed, tilt starts by itself unless turned off before.
  if (!needsPermission && read() !== 'off') start();
})();
