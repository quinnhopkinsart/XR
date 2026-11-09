import { useEffect, useRef } from 'react';
import { pauseField } from '../field/FloatingField.jsx';

// Camera, motion and XR permissions pass through to a same-origin build.
// A build that opens AR in a new tab when framed (Trading Post Humanism does)
// needs nothing else.
const ALLOW =
  'camera; microphone; gyroscope; accelerometer; magnetometer; xr-spatial-tracking; fullscreen; autoplay';

export default function BuildEmbed({ project }) {
  const ref = useRef(null);

  // The background field steps aside while the build is on screen, so the two
  // renderers don't compete for the GPU.
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => pauseField(entry.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      pauseField(false);
    };
  }, []);

  return (
    <figure className="embed" ref={ref}>
      <div className="embed__frame">
        <iframe
          src={project.launch.path}
          title={`${project.title}, interactive work`}
          allow={ALLOW}
          allowFullScreen
          loading="lazy"
        />
      </div>
      <figcaption className="embed__bar">
        <span>{project.embedNote || 'Enter to explore. On a phone, tap AR to open the camera.'}</span>
        <a className="textbutton" href={project.launch.path}>
          Full screen ↗
        </a>
      </figcaption>
    </figure>
  );
}
