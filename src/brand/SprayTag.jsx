// A single spray-painted swash under a big title: one thrown line and a flick.
// Decorative, so hidden from screen readers. Colour comes from CSS (currentColor).

export default function SprayTag() {
  return (
    <svg className="tag" viewBox="0 0 600 50" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round" filter="url(#spray)">
        <path d="M8 34 C 110 16, 240 44, 360 27 S 540 14, 588 26" strokeWidth="9" />
        <path d="M548 38 L 590 12" strokeWidth="6" />
      </g>
    </svg>
  );
}
