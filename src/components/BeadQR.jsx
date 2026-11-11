import { forwardRef, useId, useMemo } from 'react';
import QRCode from 'qrcode';

/**
 * A QR code drawn as black and white seed beads stitched onto smoked deer hide.
 *
 * Every module is one bead: dark modules are black beads, light modules white
 * beads, and the quiet zone is a border of white beads, so the beaded panel reads
 * to a scanner exactly like a printed code. The hide sits outside the quiet zone.
 * Under each bead the cell is filled in the bead's own shade, so the gaps between
 * beads never weaken the contrast.
 *
 * Colours come from tokens.css as var(--bead-*) and var(--hide*). serializeBeadQR
 * swaps them for real values when the code is downloaded.
 */

const U = 10; // one bead cell in viewBox units
const QUIET = 2; // white-bead border, in beads
const MARGIN = 4.2 * U; // hide around the beaded panel

// Small seeded random so each work's beads sit the same way on every visit.
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// An uneven outline, the way a piece of hide is cut by hand.
function hidePath(size, rand) {
  const inset = 0.5 * U;
  const lo = inset;
  const hi = size - inset;
  const step = 2.2 * U;
  const pts = [];
  const edge = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const wob = (rand() - 0.5) * 0.9 * U;
      pts.push([x0 + (x1 - x0) * t + nx * wob, y0 + (y1 - y0) * t + ny * wob]);
    }
  };
  const r = 1.6 * U; // soft corners
  edge(lo + r, lo, hi - r, lo, 0, -1);
  pts.push([hi - r * 0.3, lo + r * 0.3]);
  edge(hi, lo + r, hi, hi - r, 1, 0);
  pts.push([hi - r * 0.3, hi - r * 0.3]);
  edge(hi - r, hi, lo + r, hi, 0, 1);
  pts.push([lo + r * 0.3, hi - r * 0.3]);
  edge(lo, hi - r, lo, lo + r, -1, 0);
  pts.push([lo + r * 0.3, lo + r * 0.3]);

  // Closed Catmull-Rom curve through the points.
  const p = (i) => pts[(i + pts.length) % pts.length];
  const f = (v) => v.toFixed(1);
  let d = `M${f(p(0)[0])} ${f(p(0)[1])}`;
  for (let i = 0; i < pts.length; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

function buildCode(value, level) {
  const qr = QRCode.create(value, { errorCorrectionLevel: level });
  const n = qr.modules.size;
  const g = n + QUIET * 2;
  const dark = (row, col) => {
    const r = row - QUIET;
    const c = col - QUIET;
    return r >= 0 && c >= 0 && r < n && c < n && qr.modules.get(r, c) === 1;
  };

  const rand = seeded(value);
  const size = g * U + MARGIN * 2;
  const beads = [];
  let darkCells = '';
  for (let row = 0; row < g; row++) {
    for (let col = 0; col < g; col++) {
      const isDark = dark(row, col);
      const x = MARGIN + col * U;
      const y = MARGIN + row * U;
      if (isDark) darkCells += `M${x} ${y}h${U}v${U}h-${U}z`;
      beads.push({
        key: row * g + col,
        dark: isDark,
        x: x + U / 2 + (rand() - 0.5) * 0.08 * U,
        y: y + U / 2 + (rand() - 0.5) * 0.08 * U,
        rot: ((rand() - 0.5) * 8).toFixed(1),
        s: (0.96 + rand() * 0.06).toFixed(3),
      });
    }
  }
  return { g, size, beads, darkCells, hide: hidePath(size, rand) };
}

const BeadQR = forwardRef(function BeadQR({ value, title, level = 'Q' }, ref) {
  const raw = useId();
  const id = (name) => `bq${raw.replace(/[^a-zA-Z0-9]/g, '')}-${name}`;
  const { g, size, beads, darkCells, hide } = useMemo(() => buildCode(value, level), [value, level]);

  const panel = g * U;
  const rows = Array.from({ length: g }, (_, i) => MARGIN + i * U + U / 2);
  const stitch = 0.85 * U;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title}
      className="bead-qr"
    >
      <title>{title}</title>
      <defs>
        <clipPath id={id('hide-clip')}>
          <path d={hide} />
        </clipPath>

        {/* Hide: broad mottling, fine grain and lighter worn patches */}
        <filter id={id('hide-tex')} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="7" result="mottle" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 -0.45" result="shadow" />
          <feColorMatrix in="mottle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 0 0 0 0.55" result="lightMask" />
          <feFlood style={{ floodColor: 'var(--hide-light)' }} result="lightColor" />
          <feComposite in="lightColor" in2="lightMask" operator="in" result="light" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.5 0 0 0 -0.12" result="grainA" />
          <feComposite in="light" in2="SourceGraphic" operator="atop" result="a" />
          <feComposite in="shadow" in2="a" operator="atop" result="b" />
          <feComposite in="grainA" in2="b" operator="atop" />
        </filter>

        <filter id={id('soft')} x="-0.1" y="-0.1" width="1.2" height="1.2">
          <feGaussianBlur stdDeviation={1.1 * U} />
        </filter>

        <filter id={id('drop')} x="-0.1" y="-0.1" width="1.2" height="1.2">
          <feGaussianBlur stdDeviation={0.35 * U} />
        </filter>

        {/* Seed beads: rounded glass, lit from the upper left */}
        <radialGradient id={id('white')} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" style={{ stopColor: 'var(--white)' }} />
          <stop offset="0.25" style={{ stopColor: 'var(--bead-white)' }} />
          <stop offset="0.72" style={{ stopColor: 'var(--bead-white)' }} />
          <stop offset="1" style={{ stopColor: 'var(--bead-white-shade)' }} />
        </radialGradient>
        <radialGradient id={id('black')} cx="0.36" cy="0.28" r="0.85">
          <stop offset="0" style={{ stopColor: 'var(--bead-black-shine)' }} />
          <stop offset="0.34" style={{ stopColor: 'var(--bead-black)' }} />
          <stop offset="1" style={{ stopColor: 'var(--bead-black)' }} />
        </radialGradient>

        <rect
          id={id('bw')}
          x={-0.47 * U}
          y={-0.41 * U}
          width={0.94 * U}
          height={0.82 * U}
          rx={0.42 * U}
          ry={0.38 * U}
          fill={`url(#${id('white')})`}
          style={{ stroke: 'var(--bead-white-shade)' }}
          strokeWidth={0.04 * U}
        />
        <rect
          id={id('bb')}
          x={-0.47 * U}
          y={-0.41 * U}
          width={0.94 * U}
          height={0.82 * U}
          rx={0.42 * U}
          ry={0.38 * U}
          fill={`url(#${id('black')})`}
        />
      </defs>

      {/* Deer hide backing, smoked darker at the cut edge */}
      <path d={hide} style={{ fill: 'var(--hide)' }} filter={`url(#${id('hide-tex')})`} />
      <g clipPath={`url(#${id('hide-clip')})`}>
        <path
          d={hide}
          fill="none"
          style={{ stroke: 'var(--hide-smoke)' }}
          strokeWidth={2 * U}
          opacity="0.55"
          filter={`url(#${id('soft')})`}
        />
      </g>

      {/* The beaded panel's shadow on the hide */}
      <rect
        x={MARGIN + 0.25 * U}
        y={MARGIN + 0.4 * U}
        width={panel}
        height={panel}
        rx={0.6 * U}
        style={{ fill: 'var(--hide-smoke)' }}
        opacity="0.8"
        filter={`url(#${id('drop')})`}
      />

      {/* Under the beads: each cell in its bead's shade, threads along the rows */}
      <rect
        x={MARGIN}
        y={MARGIN}
        width={panel}
        height={panel}
        rx={0.5 * U}
        style={{ fill: 'var(--bead-white-shade)' }}
      />
      <path d={darkCells} style={{ fill: 'var(--bead-black-gap)' }} />
      <g style={{ stroke: 'var(--bead-thread)' }} strokeWidth={0.14 * U} opacity="0.7">
        {rows.map((y) => (
          <line key={y} x1={MARGIN + 0.2 * U} y1={y} x2={MARGIN + panel - 0.2 * U} y2={y} />
        ))}
      </g>

      {beads.map((b) => (
        <use
          key={b.key}
          href={`#${id(b.dark ? 'bb' : 'bw')}`}
          transform={`translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) rotate(${b.rot}) scale(${b.s})`}
        />
      ))}

      {/* Sinew stitches holding the panel to the hide */}
      <rect
        x={MARGIN - stitch}
        y={MARGIN - stitch}
        width={panel + stitch * 2}
        height={panel + stitch * 2}
        rx={0.9 * U}
        fill="none"
        style={{ stroke: 'var(--sinew)' }}
        strokeWidth={0.42 * U}
        strokeLinecap="round"
        strokeDasharray={`${0.9 * U} ${1.25 * U}`}
      />
    </svg>
  );
});

export default BeadQR;

/** The SVG as a standalone file, with every var(--token) replaced by its value. */
export function serializeBeadQR(svg, px) {
  const css = getComputedStyle(svg);
  const clone = svg.cloneNode(true);
  if (px) {
    clone.setAttribute('width', px);
    clone.setAttribute('height', px);
  }
  return new XMLSerializer()
    .serializeToString(clone)
    .replace(/var\((--[a-z0-9-]+)\)/gi, (m, name) => css.getPropertyValue(name).trim() || m);
}
