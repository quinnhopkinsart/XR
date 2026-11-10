// SVG filters that give shapes the raw, hand-pulled edge of the logo strokes.
// Rendered once, invisibly, and referenced from CSS:
//   filter: url(#rough)        panels and buttons: edges wobble like a brush stroke
//   filter: url(#rough-brush)  dividers: a dry-brush line that breaks up, like the
//                              red underline in the logo
//   filter: url(#rough-type)   display headings: letters wobble slightly, as if drawn
// Filters go on decorative layers (pseudo-elements) or large headings only, never
// on body text, so reading text stays crisp.

export default function RoughFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <filter id="rough" x="-4%" y="-8%" width="108%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.08" numOctaves="2" seed="7" result="wave" />
          <feDisplacementMap in="SourceGraphic" in2="wave" scale="7" xChannelSelector="R" yChannelSelector="G" result="wobble" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="grit" />
          <feDisplacementMap in="wobble" in2="grit" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <filter id="rough-brush" x="-2%" y="-200%" width="104%" height="500%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="2" seed="4" result="wave" />
          <feDisplacementMap in="SourceGraphic" in2="wave" scale="6" xChannelSelector="R" yChannelSelector="G" result="wobble" />
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="9" result="grit" />
          <feColorMatrix in="grit" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.1" result="holes" />
          <feComposite in="wobble" in2="holes" operator="in" />
        </filter>

        <filter id="rough-type" x="-2%" y="-10%" width="104%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="11" result="wave" />
          <feDisplacementMap in="SourceGraphic" in2="wave" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
