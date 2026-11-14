import { useEffect, useRef } from 'react';
import { projects } from '../projects/registry.js';
import { motion, reducedMotion } from './motion.js';

// Every work can add pieces to the field through `models` in its project.js.
const models = projects.flatMap((p) => p.models);
export const fieldHasModels = models.length > 0;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

let supported;
/** True when the field can draw: some work has models and the browser has WebGL. */
export function fieldSupported() {
  if (supported === undefined) supported = fieldHasModels && hasWebGL();
  return supported;
}

export default function FloatingField() {
  const ref = useRef(null);

  useEffect(() => {
    if (!fieldSupported()) return undefined;
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
  motion.set({ embedPaused: paused });
}
