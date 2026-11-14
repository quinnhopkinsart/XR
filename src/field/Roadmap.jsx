import { useEffect, useId, useRef, useState } from 'react';

// The roadmap: a Woodland spirit line down the right edge of the screen, from top to bottom.
// It is drawn the way the spirit lines in Quinn's Woodland work are: one black line that
// winds in an S, swelling and thinning along its length and coming to a point at its foot,
// with a divided circle where each leg begins and a few short hairs off its side. A leg
// fills as a core of colour inside the black line, and its circle's two halves take
// colour when the visitor reaches it. A leg's name pops out beside its circle under the
// pointer or the keyboard.
//
// Quinn asked for this look. The first roadmap was a straight capsule of blocks with the
// names written in it, which he found clunky. He wanted it integrated, by which he means
// it feels like a part of the page, subtle but clear: organic, an S curve, stretching from
// the top of the screen to the bottom, and thin, with the section's title popping out on
// hover so the line can stay thin. Then he asked for it to look like a Woodland spirit
// line. Keep it one slim flowing black line, never blocks, and keep the type off it until
// it is asked for.
//
// Sizes are in pixels: the line is drawn to the height its CSS gives it. `wide` is the
// black line's width at its thinnest and thickest, `core` the width of the colour inside
// it, `sway` how far the S swings to each side, `bead` a circle's radius, `hair` the
// length of the short hairs, `type` the size of the names, `pad` the room at the two
// ends, `point` the length of the taper at the foot. `slim` is for phones, where the
// margin is narrow.
const FULL = { wide: [4.5, 7.5], core: 2.6, sway: 11, bead: 6.5, hair: 6, type: 11, pad: 12, point: 46 };
const SLIM = { wide: [3.5, 5.5], core: 2, sway: 4, bead: 5, hair: 4, type: 10, pad: 9, point: 34 };
// About one whole S for every `PERIOD` pixels of length, always a whole number of them.
const PERIOD = 380;
const STEP = 4;

/**
 * legs: [{ key, label, weight, colour, second, className, href, onPress }]
 *   `weight` is the leg's share of the line's length, `colour` a token name (`--saffron`),
 *   `second` the token for the other half of its circle (white if left out).
 *   A leg with `href` is a link; any other is a button that calls `onPress`.
 * Each leg's fill is its `--fill` custom property (0 to 1), set from outside, and the
 * classes `is-on` (reached) and `is-here` (where the visitor is) colour its circle and
 * thicken its ring. `onDraw` is called each time the line is drawn afresh.
 */
export default function Roadmap({ legs, slim = false, arrow = false, className = '', label, innerRef, onDraw }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const own = useRef(null);
  const [tall, setTall] = useState(0);
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
  const hold = (el) => {
    own.current = el;
    if (innerRef) innerRef.current = el;
  };

  const s = slim ? SLIM : FULL;
  const width = 2 * (s.sway + s.bead * 1.4 + s.hair + 2);
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
  const drawn = legs.map((leg) => {
    const from = at;
    at += (total * (leg.weight || 1)) / weights;
    return { ...leg, from, d: curve(from, at) };
  });
  const press = (leg) => (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    leg.onPress(e);
  };
  const foot = point(total);

  // The black line itself, as a shape: it swells and thins along the way and tapers to a
  // point over its last stretch.
  const half = (y) => {
    const swell = 0.5 + 0.5 * Math.sin((2 * Math.PI * (turns * 2 + 1) * y) / (total || 1) + 1);
    const taper = Math.min(1, (total - y) / s.point);
    return ((s.wide[0] + (s.wide[1] - s.wide[0]) * swell) / 2) * Math.max(0, taper) ** 0.7;
  };
  const side = (y, sign) => {
    const slope = (x(y + 1) - x(y - 1)) / 2;
    const n = Math.hypot(1, slope);
    return `${(x(y) + (sign * half(y)) / n).toFixed(2)} ${(y + s.pad - (sign * half(y) * slope) / n).toFixed(2)}`;
  };
  const ys = [];
  for (let y = 0; y < total; y += STEP) ys.push(y);
  ys.push(total);
  const body = `M${ys.map((y) => side(y, 1)).join('L')}L${ys.reverse().map((y) => side(y, -1)).join('L')}Z`;
  // Three short hairs off one side of the line, part way down each leg.
  const hairs = (leg, i) => {
    const sign = i % 2 ? -1 : 1;
    const mid = leg.from + ((total * (leg.weight || 1)) / weights) * 0.55;
    return [-7, 0, 7]
      .map((dy) => {
        const y = mid + dy;
        const slope = (x(y + 1) - x(y - 1)) / 2;
        const n = Math.hypot(1, slope);
        const out = (d) => `${(x(y) + (sign * d) / n).toFixed(2)} ${(y + s.pad - (sign * d * slope) / n).toFixed(2)}`;
        return `M${out(half(y) - 0.5)}L${out(half(y) + s.hair * (dy ? 0.75 : 1))}`;
      })
      .join('');
  };

  return (
    <nav className={`fly-map ${className}`} ref={hold} aria-label={label} style={{ width }}>
      {total > 40 && (
        <svg width={width} height={tall} viewBox={`0 0 ${width} ${tall}`} focusable="false">
          <defs>
            <clipPath id={`${id}-body`}>
              <path d={body} />
            </clipPath>
          </defs>
          <path className="fly-map__line" d={body} />
          {drawn.map((leg, i) => (
            <path key={leg.key} className="fly-map__hair" d={hairs(leg, i)} />
          ))}
          {drawn.map((leg, i) => {
            const Leg = leg.href ? 'a' : 'g';
            const how = leg.href
              ? { href: leg.href, onClick: leg.onPress }
              : { role: 'button', tabIndex: 0, onClick: press(leg), onKeyDown: press(leg) };
            const cx = x(leg.from);
            const cy = leg.from + s.pad;
            const r = s.bead;
            return (
              <Leg
                key={leg.key}
                className={`fly-map__leg ${leg.className || ''}`}
                style={{ '--leg': `var(${leg.colour})`, '--leg-2': `var(${leg.second || '--white'})` }}
                {...how}
              >
                {/* Unseen and much wider than the line: what the pointer presses. */}
                <path className="fly-map__reach" d={leg.d} strokeWidth={width} />
                {/* The colour inside the black line, kept inside its shape. */}
                <path className="fly-map__fill" d={leg.d} pathLength="1" strokeWidth={s.core} clipPath={`url(#${id}-body)`} />
                {/* A divided circle, as on a spirit line: two halves and the line between them. */}
                <g className="fly-map__bead" transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(-32)`}>
                  <circle className="fly-map__half" r={r} />
                  <path className="fly-map__half fly-map__half--2" d={`M${-r} 0A${r} ${r} 0 0 0 ${r} 0Z`} />
                  <circle className="fly-map__ring" r={r} />
                  <path className="fly-map__ring" d={`M${-r} 0H${r}`} />
                </g>
                {/* The name pops out beside the circle, on a plate that is the letters' own
                    thick black outline. */}
                <text className="fly-map__tag" x={(cx - r - 13).toFixed(2)} y={cy.toFixed(2)} fontSize={s.type} dy="0.35em" textAnchor="end">
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
        </svg>
      )}
    </nav>
  );
}
