import { useLayoutEffect, useRef } from 'react';

// A one-line title set as large as the page allows, then stretched horizontally
// so it spans the full width of the content column exactly, at any screen size.
// STRETCH is how much wider than its natural proportions the type is drawn.
const STRETCH = 1.85;

export default function WideTitle({ children, className = '' }) {
  const box = useRef(null);
  const text = useRef(null);

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
      span.style.transform = `scaleX(${width / span.offsetWidth})`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h1);
    // Re-fit once Nova Round has loaded; the fallback face has different widths.
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  return (
    <h1 className={`wide-title ${className}`} ref={box}>
      <span className="wide-title__text" ref={text}>
        {children}
      </span>
    </h1>
  );
}
