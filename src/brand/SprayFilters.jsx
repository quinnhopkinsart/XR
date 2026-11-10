// The one raw mark on an otherwise hard-edged, glassy surface: spray paint.
// Rendered once, invisibly, and referenced from CSS or SVG as url(#spray).
// A crisp core with a speckled overspray halo, like a can held close to a wall.
// Use it on lines and tags only, never on reading text.

export default function SprayFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <filter id="spray" x="-10%" y="-150%" width="120%" height="400%">
          {/* Edge wobble, so the line looks thrown rather than ruled */}
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.3" numOctaves="2" seed="5" result="wave" />
          <feDisplacementMap in="SourceGraphic" in2="wave" scale="5" xChannelSelector="R" yChannelSelector="G" result="core" />
          {/* Overspray: a soft halo broken up by fine noise */}
          <feGaussianBlur in="core" stdDeviation="3.6" result="halo" />
          <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="8" result="dust" />
          <feColorMatrix in="dust" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 3 -1" result="dots" />
          <feComposite in="halo" in2="dots" operator="in" result="speckle" />
          <feMerge>
            <feMergeNode in="speckle" />
            <feMergeNode in="core" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
