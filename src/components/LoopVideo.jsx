import { useEffect, useRef, useSyncExternalStore } from 'react';
import { motion, reducedMotion } from '../field/motion.js';

// A short silent loop that follows the site's motion setting: it holds still on its poster
// for reduced-motion visitors and while the Pause button is on (WCAG 2.2.2), and plays again
// when Play is pressed. Sources go MP4 first, then WebM.
export default function LoopVideo({ mp4, webm, poster, label, width, height }) {
  const ref = useRef(null);
  const state = useSyncExternalStore(motion.subscribe, motion.get, motion.get);
  const still = reducedMotion || state.userPaused;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still) {
      el.pause();
    } else {
      // play() rejects when the browser blocks autoplay; the poster stays up then.
      el.play()?.catch(() => {});
    }
  }, [still]);

  return (
    <video
      ref={ref}
      autoPlay={!still}
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      width={width}
      height={height}
      aria-label={label}
    >
      <source src={mp4} type="video/mp4" />
      <source src={webm} type="video/webm" />
    </video>
  );
}
