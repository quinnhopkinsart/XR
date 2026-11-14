import { useEffect, useId, useRef, useState } from 'react';

// The roadmap: one slim line down the right edge of the screen, from top to bottom, in a few
// lengths with a small gap between them, a length for each leg. It winds in a gentle S. A
// leg fills along the line in its own colour, and its name pops out beside it under the
// pointer or the keyboard.
//
// It comes and goes like smoke. It drifts in when there is something to show (the page is
// scrolled, the tour moves on, the pointer or the keyboard comes to it) and, left alone,
// it thins out, blurs, rises a little and is gone. A turbulence filter pulls the line into
// wisps as it goes. With reduced motion it stays where it is and never fades.
//
// How it got here: Quinn's first roadmap was a straight capsule of blocks with the names in
// it, which he found clunky. He wanted it integrated, meaning it feels like a part of the
// page, subtle but clear: organic, an S curve, top to bottom, thin, titles popping out on
// hover. A Woodland spirit line with divided circles and hairs followed, which he did not
// like in the end: he asked for something more modern that appears and disappears like
// smoke, and no orbs. So: no circles, no hairs, no taper, no black outline round it. Keep
// it one plain slim line.
//
// Sizes are in pixels: the line is drawn to the height its CSS gives it. `wide` is the
// line's width, `sway` how far the S swings to each side, `gap` the space between two
// legs, `type` the size of the names, `pad` the room at the two ends. `slim` is for
// phones, where the margin is narrow.
const FULL = { wide: 4, sway: 7, gap: 7, type: 11, pad: 10 };
const SLIM = { wide: 3, sway: 3, gap: 6, type: 10, pad: 8 };
// About one whole S for every `PERIOD` pixels of length, always a whole number of them.
const PERIOD = 420;
// How far apart the points of the drawn curve are: close, so it reads as one smooth line.
const STEP = 2;
// The smoke. `linger` is how long the line stays once nothing is happening (ms), `first`
// how long it stays when it is first drawn, `wisp` how far the turbulence pulls the line
// about when it is gone (0 while it is here), `blur` how soft it gets for each unit of that
// pull, `ease` how fast the pull follows, per second.
const SMOKE = { linger: 1900, first: 3200, wisp: 40, blur: 0.07, ease: 2 };
const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * legs: [{ key, label, weight, colour, className, href, onPress }]
 *   `weight` is the leg's share of the line's length, `colour` a token name (`--saffron`).
 *   A leg with `href` is a link; any other is a button that calls `onPress`.
 * Each leg's fill is its `--fill` custom property (0 to 1), set from outside. Whoever sets
 * it sends the roadmap's element a `stir` event when something has moved, which brings the
 * line back; the class `is-held` on the element keeps it from fading. `onDraw` is called
 * each time the line is drawn afresh.
 */
export default function Roadmap({ legs, slim = false, arrow = false, className = '', label, innerRef, onDraw }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const own = useRef(null);
  const warp = useRef(null);
  const haze = useRef(null);
  const [tall, setTall] = useState(0);
  const [here, setHere] = useState(true);
  useEffect(() => {
    const el = own.current;
    if (!el) return undefined;
    const measure = () => setTall(Math.round(el.clientHeight));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  // The line is drawn once its height is known, and again when that changes: whoever sets
  // the legs' fills from outside is told, so a fresh drawing is never left empty.
  useEffect(() => {
    if (tall) onDraw?.();
  }, [tall, legs.length]);

  // Coming and going. A stir brings the line back and starts the wait again; when the wait
  // runs out it goes, unless something is holding it (the pointer, the keyboard, `is-held`).
  useEffect(() => {
    const el = own.current;
    if (!el || still) return undefined;
    let timer = 0;
    const held = () => el.classList.contains('is-held') || el.matches(':hover, :focus-within');
    const rest = (after) => {
      clearTimeout(timer);
      timer = setTimeout(() => (held() ? rest(SMOKE.linger) : setHere(false)), after);
    };
    const stir = () => {
      setHere(true);
      rest(SMOKE.linger);
    };
    rest(SMOKE.first);
    el.addEventListener('stir', stir);
    el.addEventListener('pointerenter', stir);
    el.addEventListener('focusin', stir);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('stir', stir);
      el.removeEventListener('pointerenter', stir);
      el.removeEventListener('focusin', stir);
    };
  }, []);
  // The wisps: the turbulence's pull follows whether the line is here, and the filter is
  // taken off altogether once the line is whole again, so it is crisp and costs nothing.
  useEffect(() => {
    if (still) return undefined;
    let raf = 0;
    let last = performance.now();
    const step = (now) => {
      const map = warp.current;
      const drawing = map?.closest('svg')?.querySelector('.fly-map__smoke');
      if (!map || !drawing) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const to = here ? 0 : SMOKE.wisp;
      const at = Number(map.getAttribute('scale')) || 0;
      const next = Math.abs(to - at) < 0.3 ? to : at + (to - at) * Math.min(1, dt * SMOKE.ease);
      map.setAttribute('scale', next.toFixed(2));
      haze.current?.setAttribute('stdDeviation', (next * SMOKE.blur).toFixed(2));
      drawing.style.filter = next === 0 ? '' : `url(#${id}-smoke)`;
      if (next !== to) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [here, tall]);
  const hold = (el) => {
    own.current = el;
    if (innerRef) innerRef.current = el;
  };

  const s = slim ? SLIM : FULL;
  const width = 2 * (s.sway + s.wide + 4);
  const total = Math.max(0, tall - 2 * s.pad - (arrow ? 20 : 0));
  const turns = Math.max(1, Math.round(total / PERIOD));
  const x = (y) => width / 2 + s.sway * Math.sin((2 * Math.PI * turns * y) / (total || 1));
  const point = (y) => `${x(y).toFixed(2)} ${(y + s.pad).toFixed(2)}`;
  const curve = (from, to) => {
    const points = [];
    for (let y = from; y < to; y += STEP) points.push(point(y));
    points.push(point(to));
    return `M${points.join('L')}`;
  };
  const weights = legs.reduce((sum, leg) => sum + (leg.weight || 1), 0);
  let at = 0;
  const drawn = legs.map((leg, i) => {
    const from = at;
    at += (total * (leg.weight || 1)) / weights;
    // Each leg stops a little short of its neighbours, which leaves the gaps.
    const a = from + (i ? s.gap / 2 : 0);
    const b = at - (i < legs.length - 1 ? s.gap / 2 : 0);
    return { ...leg, from: a, d: curve(a, b), reach: curve(from, at) };
  });
  const press = (leg) => (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    leg.onPress(e);
  };
  const foot = point(total);

  return (
    <nav className={`fly-map ${here ? '' : 'is-gone'} ${className}`} ref={hold} aria-label={label} style={{ width, '--wide': `${s.wide}px` }}>
      {total > 40 && (
        <svg width={width} height={tall} viewBox={`0 0 ${width} ${tall}`} focusable="false">
          <defs>
            <filter id={`${id}-smoke`} x="-400%" y="-10%" width="900%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05 0.03" numOctaves="3" seed="7" result="noise" />
              <feDisplacementMap ref={warp} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="wisps" />
              <feGaussianBlur ref={haze} in="wisps" stdDeviation="0" />
            </filter>
          </defs>
          <g className="fly-map__smoke">
            {drawn.map((leg) => {
              const Leg = leg.href ? 'a' : 'g';
              const how = leg.href
                ? { href: leg.href, onClick: leg.onPress }
                : { role: 'button', tabIndex: 0, onClick: press(leg), onKeyDown: press(leg) };
              return (
                <Leg key={leg.key} className={`fly-map__leg ${leg.className || ''}`} style={{ '--leg': `var(${leg.colour})` }} {...how}>
                  {/* Unseen and much wider than the line: what the pointer presses. */}
                  <path className="fly-map__reach" d={leg.reach} strokeWidth={width} />
                  <path className="fly-map__track" d={leg.d} />
                  <path className="fly-map__fill" d={leg.d} pathLength="1" />
                  {/* The name pops out beside the top of the leg, on a plate that is the
                      letters' own thick black outline. */}
                  <text className="fly-map__tag" x={(x(leg.from) - s.wide - 12).toFixed(2)} y={(leg.from + s.pad + 8).toFixed(2)} fontSize={s.type} dy="0.35em" textAnchor="end">
                    {leg.label}
                  </text>
                </Leg>
              );
            })}
            {arrow && (
              <g className="fly-map__on" aria-hidden="true">
                {/* Black under blue, so it shows on the red ground and over the black footer. */}
                <path className="fly-map__on-rim" d={`M${foot}m-5 8l5 5 5-5`} />
                <path className="fly-map__on-line" d={`M${foot}m-5 8l5 5 5-5`} />
              </g>
            )}
          </g>
        </svg>
      )}
    </nav>
  );
}
