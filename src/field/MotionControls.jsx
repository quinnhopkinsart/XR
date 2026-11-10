import { useState, useSyncExternalStore } from 'react';
import { motion, reducedMotion, requestTilt, tiltNeedsPermission, tiltSupported } from './motion.js';
import { fieldHasModels } from './FloatingField.jsx';

// Pause satisfies WCAG 2.2.2 (moving content can be paused).
// Tilt satisfies 2.5.4 (motion-driven behaviour can be switched off), and
// on iOS it is the tap that grants gyroscope access.
export default function MotionControls() {
  const state = useSyncExternalStore(motion.subscribe, motion.get, motion.get);
  const [denied, setDenied] = useState(false);

  // Nothing moves for reduced-motion visitors, so there is nothing to control.
  if (!fieldHasModels || reducedMotion) return null;

  const toggleTilt = async () => {
    if (state.tilt) {
      motion.set({ tilt: false });
      return;
    }
    const ok = await requestTilt();
    setDenied(!ok);
    if (ok) motion.set({ tilt: true, userPaused: false });
  };

  return (
    <div className="motion" role="group" aria-label="Background motion">
      <button
        type="button"
        className="motion__btn"
        aria-pressed={state.userPaused}
        onClick={() => motion.set({ userPaused: !state.userPaused })}
      >
        <span className="motion__icon" aria-hidden="true">
          {state.userPaused ? '▶' : '❚❚'}
        </span>
        {state.userPaused ? 'Play' : 'Pause'}
        <span className="visually-hidden"> background motion</span>
      </button>

      {tiltSupported && (
        <button
          type="button"
          className="motion__btn"
          aria-pressed={state.tilt}
          onClick={toggleTilt}
          title={tiltNeedsPermission && !state.tilt ? 'Move the field by tilting your phone' : undefined}
        >
          {state.tilt ? 'Tilt on' : 'Tilt'}
        </button>
      )}

      {denied && (
        <span className="motion__note" role="status">
          Motion access was declined. Allow it in your browser settings to use tilt.
        </span>
      )}
    </div>
  );
}
