import { useEffect, useRef } from 'react';
import { projects } from '../projects/registry.js';

// Every work can add pieces to the field through `models` in its project.js.
const models = projects.flatMap((p) => p.models);

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function FloatingField() {
  const ref = useRef(null);

  useEffect(() => {
    if (!models.length || !hasWebGL()) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dispose;
    let cancelled = false;

    // three.js loads after first paint, in its own chunk.
    import('./field.js').then(({ createField }) => {
      if (!cancelled && ref.current) dispose = createField(ref.current, { models, reducedMotion });
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return <div className="field" ref={ref} aria-hidden="true" />;
}

/** Lets a page pause the field, for example while a build is running in view. */
export function pauseField(paused) {
  window.dispatchEvent(new CustomEvent('noodin:field', { detail: { paused } }));
}
