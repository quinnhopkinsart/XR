import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { site } from '../brand/site.js';
import { flyStick, hasLens, motion, reducedMotion, requestTilt, tiltSupported } from './motion.js';
import { fieldSupported } from './FloatingField.jsx';

// Free camera for the landing page. Two ways in:
//   - the button at the foot of the page (the one way for keyboards, switches and
//     reduced-motion visitors)
//   - scrolling on past the end of the page, which fills the bar on that button
// Inside, the page steps aside and field.js hands the camera to the visitor. "Back to the
// page" or Esc leaves. Rendered by Home.jsx only, so no other page has it.
// The flight opens as a tour (`flyTour` in motion.js, the tour in field.js and scenery.js):
// the wheel, a swipe, the keys or the joystick carry the camera along the dashed line,
// which passes a good view of each work. Since people come in by scrolling, scrolling on
// simply continues. "Free roam" hands the camera over for free flight; pressed again, it
// returns to the line.
// On touch screens a joystick moves the camera in free roam (Quinn's choice over a
// hold-down button): push it forward, back or to a side while another finger drags to
// look. It is not shown on the tour, where a swipe does the moving. Other screens keep the
// hold-down Fly button beside the keys. Phones also get a Tilt button: with it on, tilting
// the phone looks around (the same `tilt` the page's Tilt button sets, and on iOS the tap
// that grants the gyroscope).
//
// There is no way in at the top of the page: Quinn wants the flight to reward people who
// scroll to the bottom and pay attention, so he had the button under the intro removed.
//
// How much scrolling past the end it takes:
//   wheel  pixels of wheel or trackpad travel
//   touch  pixels of finger travel
//   rest   ms the wheel must have been quiet before a push counts, so the tail of a fast
//          scroll to the bottom (trackpads keep sending it) does not open the view by accident
//   hold   ms the bar waits before it starts to empty
//   drain  how fast it empties, in bars a second
//
// The bar across the top of the screen (`fly-meter`) shows both: it fills in saffron as the
// page is scrolled, up to `METER` of its width at the foot of the page, and there it turns
// the spirit line's blue, with the rest of it left to fill by scrolling on. Quinn asked for
// it: yellow down the page, blue at the 3D part, to tell people to keep scrolling. Where
// scrolling on does nothing (reduced motion) it stays saffron and the page fills all of it.
const METER = 0.8;
const CHARGE = { wheel: 1200, touch: 520, rest: 160, hold: 320, drain: 1.6 };

const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

// The joystick: `reach` is how far the knob travels from the middle in pixels, `dead` the
// part of that travel near the middle that counts as no push.
const STICK = { reach: 40, dead: 0.14 };

function Joystick() {
  const knob = useRef(null);
  const held = useRef(null);

  const set = (x, y) => {
    flyStick.x = x;
    flyStick.y = y;
    if (knob.current) knob.current.style.transform = `translate(${x * STICK.reach}px, ${-y * STICK.reach}px)`;
  };
  const move = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - (box.left + box.width / 2)) / STICK.reach;
    let y = -(e.clientY - (box.top + box.height / 2)) / STICK.reach;
    const far = Math.hypot(x, y);
    if (far > 1) {
      x /= far;
      y /= far;
    }
    if (far < STICK.dead) set(0, 0);
    else set(x, y);
  };
  const release = (e) => {
    if (held.current !== e.pointerId) return;
    held.current = null;
    set(0, 0);
  };
  // Leaving the free camera with a thumb still on the stick must not leave it pushed.
  useEffect(() => () => set(0, 0), []);

  return (
    <div
      className="fly-stick"
      role="img"
      aria-label="Joystick: push it the way you want to fly"
      onPointerDown={(e) => {
        if (held.current != null) return;
        held.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* the pointer is already gone */
        }
        move(e);
      }}
      onPointerMove={(e) => held.current === e.pointerId && move(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="fly-stick__knob" ref={knob} />
    </div>
  );
}

// The button that opened the flight, so focus goes back to it on the way out.
let opener = null;
const enter = (e) => {
  opener = e.currentTarget;
  motion.set({ fly: true, flyTour: true });
};

export default function FlyMode() {
  const { fly, flyTour, flyLens, flyHints, tilt } = useSyncExternalStore(motion.subscribe, motion.get, motion.get);
  const gate = useRef(null);
  const meter = useRef(null);
  const enterBtn = useRef(null);
  const [tiltDenied, setTiltDenied] = useState(false);
  const exitBtn = useRef(null);
  const wasFlying = useRef(false);
  const supported = fieldSupported();

  // A work's title in the flight is a link to its page: field.js sends the work's slug
  // when the title is clicked or tapped.
  const navigate = useNavigate();
  useEffect(() => {
    const open = (e) => navigate(`${site.workPath}/${e.detail}`);
    window.addEventListener('field:open', open);
    return () => window.removeEventListener('field:open', open);
  }, [navigate]);

  // Leaving the landing page leaves the free camera.
  useEffect(() => () => motion.set({ fly: false, flyForward: false, flyTour: false }), []);

  // While flying the page is faded out, cannot be scrolled and is out of the tab order.
  useEffect(() => {
    if (!fly) {
      if (wasFlying.current) (opener?.isConnected ? opener : enterBtn.current)?.focus({ preventScroll: true });
      opener = null;
      wasFlying.current = false;
      return undefined;
    }
    wasFlying.current = true;
    const root = document.documentElement;
    const page = [...document.querySelectorAll('.masthead, main, .footer, .motion')];
    root.classList.add('is-flying');
    page.forEach((el) => (el.inert = true));
    exitBtn.current?.focus();
    return () => {
      root.classList.remove('is-flying');
      page.forEach((el) => (el.inert = false));
    };
  }, [fly]);

  // Scrolling on past the end of the page fills the bar; a full bar opens the view.
  useEffect(() => {
    if (fly || !supported || reducedMotion) return undefined;
    let charge = 0;
    let armed = false;
    let lastWheel = 0;
    let lastInput = 0;
    let prev = 0;
    let raf = 0;
    let touchY = null;

    const show = () => {
      const value = Math.min(1, charge).toFixed(3);
      gate.current?.style.setProperty('--charge', value);
      meter.current?.style.setProperty('--charge', value);
    };
    const loop = (now) => {
      const dt = (now - prev) / 1000;
      prev = now;
      if (now - lastInput > CHARGE.hold) charge = Math.max(0, charge - dt * CHARGE.drain);
      show();
      raf = charge > 0 ? requestAnimationFrame(loop) : 0;
    };
    const add = (amount) => {
      charge += amount;
      lastInput = performance.now();
      if (charge >= 1) {
        charge = 0;
        show();
        motion.set({ fly: true, flyTour: true });
        return;
      }
      show();
      if (!raf) {
        prev = lastInput;
        raf = requestAnimationFrame(loop);
      }
    };

    const onWheel = (e) => {
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      if (e.ctrlKey || e.deltaY <= 0 || !atBottom()) {
        armed = false;
        return;
      }
      if (!armed) {
        if (gap < CHARGE.rest) return;
        armed = true;
      }
      const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      add(px / CHARGE.wheel);
    };
    const onTouchStart = (e) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e) => {
      if (touchY == null || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = touchY - y;
      touchY = y;
      if (dy > 0 && atBottom()) add(dy / CHARGE.touch);
    };
    const onTouchEnd = () => {
      touchY = null;
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      gate.current?.style.setProperty('--charge', '0');
      meter.current?.style.setProperty('--charge', '0');
    };
  }, [fly, supported]);

  // The bar across the top follows the page, and turns blue at its foot.
  useEffect(() => {
    if (!supported) return undefined;
    const onward = !reducedMotion; // scrolling on past the end opens the flight
    const measure = () => {
      const el = meter.current;
      if (!el) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const page = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 1;
      el.style.setProperty('--page', page.toFixed(4));
      el.style.setProperty('--share', onward ? METER : 1);
      el.classList.toggle('is-end', onward && atBottom());
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    // The page grows and shrinks ("See more", pictures loading), which moves its foot.
    const watch = new ResizeObserver(measure);
    watch.observe(document.body);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      watch.disconnect();
    };
  }, [supported]);

  if (!supported) return null;

  const toggleTilt = async () => {
    if (tilt) {
      motion.set({ tilt: false });
      return;
    }
    const ok = await requestTilt();
    setTiltDenied(!ok);
    if (ok) motion.set({ tilt: true });
  };

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const forward = (on) => () => motion.set({ flyForward: on });
  const holdKey = (on) => (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) motion.set({ flyForward: on });
    }
  };

  return (
    <section className="fly-gate" ref={gate} aria-label="Free camera">
      <button type="button" className="fly-gate__btn" ref={enterBtn} onClick={enter}>
        Fly through the works
        <span className="fly-gate__bar" aria-hidden="true" />
      </button>
      {!reducedMotion && (
        <p className="fly-gate__hint">
          <span className="plate">Or keep scrolling.</span>
        </p>
      )}

      {createPortal(<div className="fly-meter" ref={meter} aria-hidden="true" />, document.body)}

      {fly &&
        createPortal(
          <div className="fly-hud" role="region" aria-label="Free camera">
            {/* The Instructions button hides this line. A declined tilt still shows its message. */}
            <p className="fly-hud__hint" role="status" hidden={!flyHints && !tiltDenied}>
              {tiltDenied
                ? 'Motion access was declined. Allow it in your browser settings to use tilt.'
                : flyTour
                ? coarse
                  ? `Swipe up to follow the line from work to work. Tap a title to open the work.${tilt ? ' Tilt to look around.' : ''}`
                  : 'Scroll to follow the line from work to work. Click a title to open the work. Esc to leave.'
                : coarse
                  ? `${tilt ? 'Tilt or drag' : 'Drag'} to look. Push the stick to move.`
                  : 'Drag to look. Scroll, W A S D or the arrow keys to move. Esc to leave.'}
            </p>
            {coarse && !flyTour && <Joystick />}
            <div className="fly-hud__bar">
              <button type="button" className="motion__btn" ref={exitBtn} onClick={() => motion.set({ fly: false, flyTour: false })}>
                Back to the page
              </button>
              <button
                type="button"
                className="motion__btn"
                aria-pressed={!flyTour}
                onClick={() => motion.set({ flyTour: !flyTour })}
              >
                Free roam
              </button>
              {tiltSupported && (
                <button type="button" className="motion__btn" aria-pressed={tilt} onClick={toggleTilt}>
                  Tilt
                </button>
              )}
              {hasLens && (
                <button
                  type="button"
                  className="motion__btn"
                  aria-pressed={flyLens}
                  onClick={() => motion.set({ flyLens: !flyLens })}
                >
                  Depth of field
                </button>
              )}
              <button
                type="button"
                className="motion__btn"
                aria-pressed={flyHints}
                onClick={() => motion.set({ flyHints: !flyHints })}
              >
                Instructions
              </button>
              <button
                type="button"
                className="motion__btn"
                onClick={() => motion.set({ flyHome: motion.get().flyHome + 1 })}
              >
                Reset view
              </button>
              {!coarse && (
                <button
                  type="button"
                  className="motion__btn fly-hud__go"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    motion.set({ flyForward: true });
                  }}
                  onPointerUp={forward(false)}
                  onPointerCancel={forward(false)}
                  onLostPointerCapture={forward(false)}
                  onBlur={forward(false)}
                  onKeyDown={holdKey(true)}
                  onKeyUp={holdKey(false)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  Fly<span className="visually-hidden"> forward, hold down</span>
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
