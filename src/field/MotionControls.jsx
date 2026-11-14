import { useState, useSyncExternalStore } from 'react';
import { motion, reducedMotion, requestTilt, tiltNeedsPermission, tiltSupported } from './motion.js';
import { fieldHasModels } from './FloatingField.jsx';

// The icons are drawn, not typed. As text (❚❚ and ▶) they come from whatever symbol font a
// phone has, so some phones showed nothing and others an emoji. Same shapes as the portfolio's
// pause button (ICON_PAUSE and ICON_PLAY in its js/ui.js).
const PauseIcon = () => (
  <svg className="motion__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <rect x="5" y="4" width="3.6" height="12" rx="1.2" />
    <rect x="11.4" y="4" width="3.6" height="12" rx="1.2" />
  </svg>
);
const PlayIcon = () => (
  <svg className="motion__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M6.5 4.4v11.2c0 .9 1 1.4 1.7.9l8-5.6c.6-.4.6-1.4 0-1.8l-8-5.6c-.7-.5-1.7 0-1.7.9z" />
  </svg>
);

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
        {state.userPaused ? <PlayIcon /> : <PauseIcon />}
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
