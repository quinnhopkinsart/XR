import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, reducedMotion } from '../field/motion.js';
import { createTitleSignal } from './titleSignal.js';

// A one-line title set as large as the page allows, then stretched horizontally
// so it spans the full width of the content column exactly, at any screen size.
// STRETCH is how much wider than its natural proportions the type is drawn.
const STRETCH = 1.85;

// The badge (XR) floats in front of the title's bottom-right corner on its own
// depth: it drifts against the pointer, the phone's tilt and the scroll, so the
// title reads as a layer behind it. Values are the badge's maximum travel in px.
const DEPTH = { pointerX: 22, pointerY: 12, tiltX: 26, tiltY: 16, scroll: 0.28 };

export default function WideTitle({ children, badge, label, className = '' }) {
  const box = useRef(null);
  const text = useRef(null);
  const tag = useRef(null);
  const screen = useRef(null);

  // The signal: the letters redrawn on a canvas that answers the pointer and tilt
  // (titleSignal.js). The DOM text stays underneath for layout and as the fallback.
  useEffect(() => {
    const h1 = box.current;
    if (!h1 || !text.current || !screen.current) return undefined;
    const signal = createTitleSignal({
      box: h1,
      text: text.current,
      canvas: screen.current,
      still: reducedMotion,
    });
    if (!signal) return undefined;
    h1.classList.add('is-live');

    // While the title is on screen it leads, and the floating pieces sit back.
    const root = document.documentElement;
    const io = new IntersectionObserver(
      ([entry]) => root.classList.toggle('title-leads', entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(h1);

    return () => {
      io.disconnect();
      root.classList.remove('title-leads');
      h1.classList.remove('is-live');
      signal.destroy();
    };
  }, []);

  useLayoutEffect(() => {
    const h1 = box.current;
    const span = text.current;
    if (!h1 || !span) return undefined;

    const fit = () => {
      const width = h1.clientWidth;
      if (!width) return;
      span.style.transform = 'none';
      // Width per pixel of font size, measured at a reference size.
      span.style.fontSize = '100px';
      const perPx = span.offsetWidth / 100;
      const size = width / (perPx * STRETCH);
      span.style.fontSize = `${size}px`;
      const sx = width / span.offsetWidth;
      span.style.transform = `scaleX(${sx})`;
      // The badge sizes and stretches from the same numbers.
      h1.style.setProperty('--title-size', `${size}px`);
      h1.style.setProperty('--title-sx', String(sx));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h1);
    // Re-fit once Nova Round has loaded; the fallback face has different widths.
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  // Parallax for the badge.
  useEffect(() => {
    const el = tag.current;
    if (!el || reducedMotion) return undefined;

    const pointer = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    let baseline = null;
    const now = { x: 0, y: 0 };
    let frame = 0;
    let last = performance.now();

    const onPointer = (e) => {
      if (e.pointerType === 'touch') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    const onOrientation = (e) => {
      if (e.beta == null || e.gamma == null) return;
      if (!baseline) baseline = { x: e.gamma, y: e.beta };
      baseline.x += (e.gamma - baseline.x) * 0.02;
      baseline.y += (e.beta - baseline.y) * 0.02;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      tilt.x = clamp((e.gamma - baseline.x) / 20);
      tilt.y = clamp((e.beta - baseline.y) / 20);
    };

    let listeningTilt = false;
    const syncTilt = (s) => {
      const want = s.tilt && !s.userPaused;
      if (want && !listeningTilt) {
        window.addEventListener('deviceorientation', onOrientation);
        listeningTilt = true;
        baseline = null;
      } else if (!want && listeningTilt) {
        window.removeEventListener('deviceorientation', onOrientation);
        listeningTilt = false;
        tilt.x = 0;
        tilt.y = 0;
      }
    };

    const tick = (t) => {
      frame = requestAnimationFrame(tick);
      // Time-based easing, so the drift feels the same at any frame rate.
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      const ease = 1 - Math.exp(-dt * 5);
      const paused = motion.get().userPaused;
      // The nearest layer moves against the viewer: opposite the pointer and tilt.
      const tx = paused ? 0 : -pointer.x * DEPTH.pointerX - tilt.x * DEPTH.tiltX;
      const ty = paused ? 0 : -pointer.y * DEPTH.pointerY - tilt.y * DEPTH.tiltY;
      now.x += (tx - now.x) * ease;
      now.y += (ty - now.y) * ease;
      // Scroll: the badge lifts away faster than the title it sits on.
      const sy = -window.scrollY * DEPTH.scroll;
      el.style.setProperty('--px', `${now.x.toFixed(2)}px`);
      el.style.setProperty('--py', `${(now.y + sy).toFixed(2)}px`);
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    const unsubscribe = motion.subscribe(syncTilt);
    syncTilt(motion.get());
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onOrientation);
      unsubscribe();
    };
  }, []);

  return (
    <h1 className={`wide-title ${className}`} ref={box} aria-label={label}>
      <span className="wide-title__text" ref={text} aria-hidden={label ? true : undefined}>
        {children}
      </span>
      <canvas className="wide-title__screen" ref={screen} aria-hidden="true" />
      {/* Splotches of gaussian blur laid over the title and whatever floats behind it */}
      <span className="wide-title__blur" aria-hidden="true" />
      {badge && (
        <span className="wide-title__badge" ref={tag} aria-hidden={label ? true : undefined}>
          {badge}
        </span>
      )}
    </h1>
  );
}
