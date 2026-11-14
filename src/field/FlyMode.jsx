import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { site } from '../brand/site.js';
import { flyStick, hasLens, motion, reducedMotion, requestTilt, tiltSupported } from './motion.js';
import { fieldSupported } from './FloatingField.jsx';
import Roadmap from './Roadmap.jsx';

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
// The roadmap down the right edge of the screen (`fly-map`, drawn by Roadmap.jsx) shows the
// way there: a glow of colour coming from the right edge of the screen, straight up and down
// from top to bottom, in three lengths, one for each part of the page (the intro, the works, the 3D part). A length fills in its own
// colour as its part of the page is scrolled, and the last one, in the spirit line's blue,
// fills by scrolling on past the end. At the foot of the page an arrow under it points on
// down. A length's name pops out beside it under the pointer. The line comes and goes like
// smoke: it drifts in when the page is scrolled and fades when left alone, except at the
// foot of the page, where it stays to say there is more. Quinn asked for it: on the right,
// like a roadmap, a colour for each section, filling as you scroll (Roadmap.jsx has how its
// look was arrived at). Where scrolling on does nothing (reduced motion) the last length
// fills at the foot.
// The flight has a roadmap of its own in the same style (`fly-map--flight`), which Quinn
// asked for: a leg for each artwork, in the order the tour passes them, on the same winding
// line. A work's title pops out beside its length under the pointer, and the line drifts in
// like smoke when the tour moves and fades when it rests. A leg fills as the camera turns to its work, so a full leg is a work
// seen and the last full one is the work in view; that one also stands wider. (The first
// version filled a leg on the way on from its work, and Quinn found it still said Trading
// Post Humanism while he was looking at 13 Moon Calendar.) field.js sends the place on the tour in `field:tour`
// events. It shows on the tour only: free roam has no line to be part way along. A press
// on a leg sends the tour to that work (`field:goto`).
const WORK_COLOURS = ['--saffron', '--field-pink', '--spirit-line', '--white'];
// Each leg is a link to the top of its part of the page (`to` is that part's id), which
// Quinn asked for.
const LEGS = [
  { name: 'intro', label: 'Intro', to: 'intro', weight: 1, colour: '--saffron' },
  { name: 'works', label: 'Works', to: 'works', weight: 2, colour: '--field-pink' },
  { name: 'fly', label: '3D', to: 'fly', weight: 1, colour: '--spirit-line' },
];

/** Scrolls to the top of a part of the page, without leaving a # in the address. */
const jump = (id) => (e) => {
  const part = document.getElementById(id);
  if (!part) return;
  e.preventDefault();
  part.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
};
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
  const flightMap = useRef(null);
  const tourAt = useRef(0);
  const tourSeen = useRef(0);
  const [tourWorks, setTourWorks] = useState([]);
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

  // The flight's roadmap: which legs are full, and which work the camera is at.
  const showTour = () => {
    const legs = flightMap.current?.querySelectorAll('.fly-map__leg');
    if (!legs?.length) return;
    const at = tourAt.current;
    // The tour moving on brings the line back.
    if (Math.abs(at - tourSeen.current) > 0.004) flightMap.current?.dispatchEvent(new Event('stir'));
    tourSeen.current = at;
    const here = Math.round(at) % legs.length;
    legs.forEach((leg, i) => {
      // A work's leg fills as the camera turns to it, so the first is full from the start.
      leg.style.setProperty('--fill', Math.min(1, Math.max(0, at - i + 1)).toFixed(3));
      leg.classList.toggle('is-here', i === here);
      leg.classList.toggle('is-on', at - i + 1 > 0.02);
    });
  };
  useEffect(() => {
    const onTour = (e) => {
      tourAt.current = e.detail.at;
      setTourWorks(e.detail.works); // the same list every time, so this only draws once
      showTour();
    };
    window.addEventListener('field:tour', onTour);
    return () => window.removeEventListener('field:tour', onTour);
  }, []);
  useEffect(showTour, [tourWorks, fly, flyTour]);

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
    const page = [...document.querySelectorAll('.masthead, main, .footer, .motion, .fly-map:not(.fly-map--flight)')];
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

  // The roadmap follows the page: the intro's leg fills until the works reach the middle
  // of the screen, the works' leg from there to the foot.
  useEffect(() => {
    if (!supported) return undefined;
    const onward = !reducedMotion; // scrolling on past the end opens the flight
    let seen = window.scrollY;
    const measure = () => {
      const el = meter.current;
      if (!el) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const works = document.querySelector('.works');
      const turn = works ? works.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 : 0;
      const y = window.scrollY;
      const share = (from, to) => (to > from ? Math.min(1, Math.max(0, (y - from) / (to - from))) : y >= to ? 1 : 0);
      const split = Math.min(Math.max(turn, 0), Math.max(room, 0));
      const end = atBottom();
      el.style.setProperty('--intro', share(0, split).toFixed(4));
      el.style.setProperty('--works', end ? '1' : share(split, room).toFixed(4));
      if (!onward) el.style.setProperty('--charge', end ? '1' : '0');
      el.classList.toggle('at-works', y >= split);
      el.classList.toggle('at-fly', end);
      // At the foot the line stays, to say there is more below; a scroll brings it back.
      el.classList.toggle('is-held', end && onward);
      if (y !== seen) el.dispatchEvent(new Event('stir'));
      seen = y;
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
  const narrow = window.matchMedia('(max-width: 760px)').matches;
  const forward = (on) => () => motion.set({ flyForward: on });
  const holdKey = (on) => (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) motion.set({ flyForward: on });
    }
  };

  return (
    <section className="fly-gate" id="fly" ref={gate} aria-label="Free camera">
      <button type="button" className="fly-gate__btn" ref={enterBtn} onClick={enter}>
        Fly through the works
        <span className="fly-gate__bar" aria-hidden="true" />
      </button>
      {!reducedMotion && (
        <p className="fly-gate__hint">
          <span className="plate">Or keep scrolling.</span>
        </p>
      )}

      {createPortal(
        <Roadmap
          innerRef={meter}
          label="Parts of this page"
          slim={narrow}
          arrow
          legs={LEGS.map((leg) => ({
            key: leg.name,
            label: leg.label,
            weight: leg.weight,
            colour: leg.colour,
            className: `fly-map__leg--${leg.name}`,
            href: `#${leg.to}`,
            onPress: jump(leg.to),
          }))}
        />,
        document.body,
      )}

      {fly &&
        flyTour &&
        tourWorks.length > 0 &&
        createPortal(
          <Roadmap
            innerRef={flightMap}
            className="fly-map--flight"
            onDraw={showTour}
            label="Works on the tour"
            slim={narrow}
            legs={tourWorks.map((title, i) => ({
              key: title,
              label: title,
              colour: WORK_COLOURS[i % WORK_COLOURS.length],
              onPress: () => window.dispatchEvent(new CustomEvent('field:goto', { detail: i })),
            }))}
          />,
          document.body,
        )}

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
