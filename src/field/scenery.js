// What the free camera adds to the field: a zone for each work, and things far off.
// Built the first time a visitor flies, so the page itself never pays for it.
//
// A zone is a place in the air where one work's sculptures gather (field.js moves them
// there), with the work's title under them. There is no floor, by Quinn's choice.
//
// Far off, all flat shapes in the site's colours:
//   - large colour fields: round but uneven, like a shape cut by hand, each with a thick
//     outline of one even width in a second colour
//   - four-pointed stars, higher up
//   - stick pine trees in groves, all standing at one level, further out than the camera
//     can fly: flat and very simple, a few black lines, like a drawing on the horizon
//   - + and * marks, nearer, between the zones
// And one line to follow: a dashed sine wave that loops past a good place to see each work
// from, in turn, rising to the ones that hang high and dropping to the ones below. Its
// waves run slowly along it.
//
// Round all the works runs one large spirit line: a thick light-blue line that goes round
// each work in turn, over one and under the next, and crosses the gaps between them, with orbs strung on it like beads on a
// string: the line swells round each one and narrows again in one smooth curve, so the
// bead's rim is the line itself, one even width all round. Inside the rim each bead is a
// flat card that faces the camera: a fill with a thick outline of its own. Two sine waves move along it, one up and
// down and one in and out, so it snakes, and its thickness swells and eases in a gentle
// pulse; the orbs ride the waves and breathe with it.
//
// Stars and marks always face the camera. Trees turn to it too but stay upright, so they
// are only ever seen flat on. Fields stay where they are put, so flying round one shows
// its edge.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// How many of each, and how far from the centre (in units; a zone sits about 70 out).
export const SCENERY = {
  floor: -7, // the level the trees stand at
  fields: { count: 9, near: 130, far: 200, size: [14, 32] },
  stars: { count: 46, near: 80, far: 190, size: [1.2, 4.5] },
  marks: { count: 48, near: 30, far: 120, size: [0.6, 2.2] },
  groves: { count: 8, near: 200, far: 270, trees: [3, 7], height: [18, 38] }, // field.js stops the camera 135 out
};

// Colour fields: [fill, outline]. `FIELD_LINE` is the outline's width against the field's
// radius, `FIELD_WOBBLE` how far the edge strays from a circle.
const FIELD_COLOURS = [
  ['--saffron', '--black'],
  ['--oxblood', '--saffron'],
  ['--tag-purple', '--black'],
  ['--tag-teal', '--oxblood'],
  ['--black', '--saffron'],
  ['--tag-green', '--black'],
  ['--ground-deep', '--tag-purple'],
  ['--saffron', '--tag-teal'],
  ['--oxblood', '--black'],
];
const FIELD_LINE = 0.1;
// The line to follow. `dash` and `gap` are lengths along it, `thick` the dash's width,
// `height` and `length` the wave's size, `speed` how fast the waves run along the line
// (units a second), `under` how far the line runs below the viewpoints it joins, `frame`
// how much room a work gets when it is fitted to the screen from its viewpoint (1 fills
// it), `swing` the angle in radians a viewpoint stands to one side of a work, `smooth` how
// far the line's corners are rounded off (0 keeps them sharp), `low` how far below its
// middle the camera aims at a work that hangs high, as a share of its height.
const TRAIL = { dash: 0.9, gap: 0.8, thick: 0.16, height: 1.1, length: 13, speed: 1.6, under: 3.2, frame: 1.3, swing: 0.15, smooth: 9, low: 0.22, colour: '--black' };
const FIELD_WOBBLE = 0.2;
// The spirit line. It goes round each work: `clear` is how far it stays from a work's
// sides, from its top or foot, and how far behind the middle of the work it runs. `thick`
// is its radius, `meander` how far it strays in and out and up and down between works and
// round the back of the ring, `bends` roughly how many such bends a whole loop of
// meandering would have. Two sine waves move along
// it: `wave` is the height of the one that lifts and drops it, `waves` how many of them
// there are round the loop, `drift` how fast they move (turns of the wave a second);
// `sway`, `sways` and `slide` are the same for the one that swings it in toward the centre
// and out again, which travels the other way, so the line snakes. `pulse` is how much the
// thickness swells (a share of `thick`), `beats` how many swells are on the line at once,
// `beat` how fast they travel. `orbs` is how many orbs are strung on it, `orb` their radius
// out to the edge of the line's colour round them; `rim` is how wide that ring of the
// line's colour is and `edge` how wide the orb's own outline inside it, both as shares of
// the radius, and what is left in the middle is the orb's fill. Every `smile`th orb is a
// smiley face, which Quinn asked for (it was every third; he wanted fewer): its fill is the first colour of `face` (yellow), its
// eyes and smile the second and its outline the third (purple: Quinn did not like the
// smileys on white). Smileys keep at least `apart` clear of every work's zone, so nobody
// reads one as part of a work or as a comment on it, which Quinn asked for. `taper` is how long the line takes to swell to a bead and narrow again (a share of the
// bead's size: smaller is rounder, larger is more of a spindle).
// Quinn first asked for a subtle pulse and wave, then for more sine wave motion and more
// meander than the first version had (wave 1.6, no sway, meander 5): the pulse stays
// gentle, the waves are plain to see. He then asked for larger orbs with more colour
// inside (they were 1.8 to 3.2 with a 0.76 core), and for the line to go round the models
// and fill the space between them, where it had only passed behind each one. Last, he
// had the orbs made smaller again (they were 3.2 to 5.4) and their balls of colour
// replaced by flat cards that face the camera, each a fill with a thick outline of its
// own in another colour, inside a thick even ring of the line's colour that merges with
// the line. He tried the line black
// and thinner and went back: he likes it light blue and this thick, so leave both.
const SPIRIT = {
  clear: [7, 6, 4],
  thick: 0.85,
  meander: 9,
  bends: 15,
  wave: 4.2,
  waves: 11,
  drift: 0.09,
  sway: 3.4,
  sways: 8,
  slide: 0.07,
  pulse: 0.22,
  beats: 9,
  beat: 0.12,
  orbs: 20,
  orb: [2.3, 3.7],
  rim: 0.27,
  edge: 0.23,
  taper: 0.62,
  smile: 7,
  apart: 16,
  face: ['--saffron', '--black', '--tag-purple'],
  colour: '--spirit-line',
  fills: ['--saffron', '--tag-purple', '--field-pink', '--black', '--white', '--tag-teal', '--oxblood', '--tag-green'],
};
const STAR_COLOURS = ['--white', '--white', '--saffron'];
const MARK_COLOURS = ['--black', '--black', '--white', '--saffron'];

/** n bars crossed through the centre: 2 makes a +, 3 makes a *. One unit across. */
function mark(n) {
  const bars = [];
  for (let i = 0; i < n; i += 1) bars.push(new THREE.PlaneGeometry(1, 0.16).rotateZ((i * Math.PI) / n + (n === 3 ? Math.PI / 2 : 0)));
  return mergeGeometries(bars);
}

/**
 * A colour field's shape: a closed, uneven round, about one unit in radius, different every
 * time. Returns two flat geometries: the fill, and an outline of one even width all the
 * way round, lying just outside it.
 */
function blob(random) {
  const waves = [2, 3, 4, 5].map((n) => ({ n, amp: (random() - 0.5) * 2 * (FIELD_WOBBLE / (n - 0.6)), phase: random() * Math.PI * 2 }));
  const count = 96;
  const edge = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const r = 1 + waves.reduce((sum, w) => sum + Math.sin(a * w.n + w.phase) * w.amp, 0);
    edge.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const fill = new THREE.ShapeGeometry(new THREE.Shape(edge));

  // The outline: each edge point pushed straight out from the edge by the same distance.
  const positions = [];
  const index = [];
  for (let i = 0; i < count; i += 1) {
    const before = edge[(i + count - 1) % count];
    const after = edge[(i + 1) % count];
    const along = after.clone().sub(before).normalize();
    const p = edge[i];
    positions.push(p.x, p.y, 0, p.x + along.y * FIELD_LINE, p.y - along.x * FIELD_LINE, 0);
    const a = i * 2;
    const b = ((i + 1) % count) * 2;
    index.push(a, a + 1, b + 1, a, b + 1, b);
  }
  const line = new THREE.BufferGeometry();
  line.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  line.setIndex(index);
  return { fill, line };
}

/** A four-pointed star with sides that curve in. Two units point to point. */
function star() {
  const s = new THREE.Shape();
  const c = 0.14; // how far the sides pull in toward the centre
  s.moveTo(0, 1);
  s.quadraticCurveTo(c, c, 1, 0);
  s.quadraticCurveTo(c, -c, 0, -1);
  s.quadraticCurveTo(-c, -c, -1, 0);
  s.quadraticCurveTo(-c, c, 0, 1);
  return new THREE.ShapeGeometry(s, 6);
}

/** A stick pine, flat: one line for the trunk and a few pairs of lines sloping down from
    it. One unit tall, standing on y = 0. Quinn wants these 2D and really simple. */
function pine(levels) {
  const line = 0.022;
  const lines = [new THREE.PlaneGeometry(line, 1).translate(0, 0.5, 0)];
  for (let i = 0; i < levels; i += 1) {
    const k = i / (levels - 1 || 1); // 0 at the lowest branch, 1 at the top
    const y = 0.38 + k * 0.5;
    const len = 0.3 - k * 0.2;
    for (const side of [1, -1]) {
      lines.push(
        new THREE.PlaneGeometry(len, line)
          .translate(len / 2, 0, 0)
          .rotateZ(-0.55)
          .scale(side, 1, 1)
          .translate(0, y, 0),
      );
    }
  }
  return mergeGeometries(lines);
}

/** The work's title on a black plate, as a picture that always faces the camera. */
function label(title, token) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const px = 96;
  const font = `300 ${px}px ${token('--font-display', 'sans-serif')}`;
  const text = title.toUpperCase();
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width + px * 1.2);
  canvas.height = Math.ceil(px * 1.9);
  ctx.fillStyle = token('--panel', '#000000');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = font;
  ctx.fillStyle = token('--on-panel-strong', '#ffffff');
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px * 0.6, canvas.height / 2 + px * 0.04);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map }));
  const height = 1.8;
  sprite.scale.set((height * canvas.width) / canvas.height, height, 1);
  return sprite;
}

/**
 * zones: [{ work, title, centre: Vector3, radius, width, height, lift, floor, backdrop }] from field.js
 * (`lift` is how high the zone hangs, `floor` the level just under its sculptures).
 * `backdrop` is [fill, outline], two colour tokens, for a zone that has its own colour
 * field standing behind its sculptures.
 * view: { fov, aspect } of the camera, for fitting each work to the screen.
 * Returns { group, zones: [Group], facing: [Object3D], upright: [Object3D], wave(t) }: the
 * titles grow in as the flight begins, everything in `facing` is turned to the camera each
 * frame, everything in `upright` is turned to it round its own trunk only, and `wave(t)`
 * runs the waves along the line to follow and along the spirit line. `tour` is that line as a camera track:
 * `tour.length`, `tour.start` (how far along it the first work's viewpoint is), and
 * `tour.poseAt(s, eye, look)`, which fills in where a camera `s` units
 * along it stands and what it looks at.
 */
export function buildScenery({ zones, token, random, view }) {
  const group = new THREE.Group();
  const facing = [];
  const upright = [];
  const materials = new Map();
  const paint = (name) => {
    if (!materials.has(name)) {
      materials.set(
        name,
        new THREE.MeshBasicMaterial({ color: new THREE.Color(token(name, '#000000')), side: THREE.DoubleSide }),
      );
    }
    return materials.get(name);
  };
  const pickFrom = (list) => list[Math.floor(random() * list.length)];
  const between = ([a, b]) => a + random() * (b - a);
  const deg = THREE.MathUtils.degToRad;
  /** A point `distance` out from the centre, at a compass angle and a height angle. */
  const out = (distance, around, up) =>
    new THREE.Vector3(Math.sin(around) * Math.cos(up), Math.sin(up), -Math.cos(around) * Math.cos(up)).multiplyScalar(distance);

  // Zones: the title hangs just under the sculptures, a little toward the centre. A zone
  // sunk below the camera is seen from above, so its title stands behind the work, on the
  // far side, where it does not cover it.
  const links = [];
  const zoneGroups = zones.map((z) => {
    const g = new THREE.Group();
    const inward = new THREE.Vector3(-z.centre.x, 0, -z.centre.z).normalize();
    if (z.lift < 0) g.position.copy(z.centre).addScaledVector(inward, -z.radius * 0.7).setY(z.lift + z.height * 0.3);
    else g.position.copy(z.centre).addScaledVector(inward, z.radius * 0.5).setY(z.floor - 0.6);
    const plate = label(z.title, token);
    plate.userData.work = z.work; // the title is a link to the work's page (field.js)
    g.add(plate);
    links.push(plate);
    group.add(g);
    return g;
  });
  const clearOfZones = (p) =>
    zones.every((z) => Math.hypot(p.x - z.centre.x, p.z - z.centre.z) > z.radius + 4 || Math.abs(p.y - z.lift) > z.height / 2 + 6);

  // Colour fields: far off, facing the centre.
  for (let i = 0; i < SCENERY.fields.count; i += 1) {
    const [fill, line] = FIELD_COLOURS[i % FIELD_COLOURS.length];
    const shape = blob(random);
    const m = new THREE.Group();
    m.add(new THREE.Mesh(shape.fill, paint(fill)), new THREE.Mesh(shape.line, paint(line)));
    const around = ((i + random() * 0.7) / SCENERY.fields.count) * Math.PI * 2;
    m.position.copy(out(between([SCENERY.fields.near, SCENERY.fields.far]), around, deg(-8 + random() * 55)));
    m.scale.setScalar(between(SCENERY.fields.size));
    m.lookAt(0, 0, 0);
    m.rotateZ(random() * Math.PI * 2);
    group.add(m);
  }

  // Stars: higher up, all round.
  const starShape = star();
  for (let i = 0; i < SCENERY.stars.count; i += 1) {
    const m = new THREE.Mesh(starShape, paint(pickFrom(STAR_COLOURS)));
    m.position.copy(out(between([SCENERY.stars.near, SCENERY.stars.far]), random() * Math.PI * 2, deg(6 + random() * 70)));
    m.scale.setScalar(between(SCENERY.stars.size) / 2);
    facing.push(m);
    group.add(m);
  }

  // + and * marks: nearer, between the zones, clear of the zones and of where the flight starts.
  const plus = mark(2);
  const asterisk = mark(3);
  for (let i = 0; i < SCENERY.marks.count; i += 1) {
    let p;
    let tries = 0;
    do {
      p = out(between([SCENERY.marks.near, SCENERY.marks.far]), random() * Math.PI * 2, deg(-22 + random() * 70));
      tries += 1;
    } while (tries < 12 && (!clearOfZones(p) || p.distanceTo(new THREE.Vector3(0, 0, 14)) < 12));
    const m = new THREE.Mesh(i % 2 ? plus : asterisk, paint(pickFrom(MARK_COLOURS)));
    m.position.copy(p);
    m.scale.setScalar(between(SCENERY.marks.size));
    facing.push(m);
    group.add(m);
  }

  // Stick pines: groves on the horizon, drawn in black.
  const pines = [pine(3), pine(4)];
  for (let i = 0; i < SCENERY.groves.count; i += 1) {
    const around = ((i + random() * 0.8) / SCENERY.groves.count) * Math.PI * 2;
    const middle = out(between([SCENERY.groves.near, SCENERY.groves.far]), around, 0);
    const n = Math.round(between(SCENERY.groves.trees));
    for (let j = 0; j < n; j += 1) {
      const m = new THREE.Mesh(pickFrom(pines), paint('--black'));
      m.position.set(middle.x + (random() - 0.5) * 34, SCENERY.floor, middle.z + (random() - 0.5) * 34);
      m.scale.setScalar(between(SCENERY.groves.height));
      upright.push(m);
      group.add(m);
    }
  }

  // The line to follow: a loop past a good place to see each work from, in turn (left to
  // right along the arc, then back across). The line runs a little under
  // those viewpoints, like the centre line of a road, so a camera that rides it (the tour,
  // `tour.poseAt`) sees the dashes lead away ahead.
  //
  // A viewpoint stands back from its zone, toward the centre, far enough for the whole work
  // to fit the screen, and a little to one side for a three-quarter view. For a work that
  // hangs high it is close in and low, looking up, so the work towers. For a work sunk
  // below it is above, looking down into it.
  const half = Math.tan(THREE.MathUtils.degToRad(view.fov) / 2);
  const eyes = zones.map((z) => {
    const inward = new THREE.Vector3(-z.centre.x, 0, -z.centre.z).normalize();
    const side = new THREE.Vector3(-inward.z, 0, inward.x);
    const fit = (Math.max(z.height, z.width / view.aspect) / (2 * half)) * TRAIL.frame;
    const back = THREE.MathUtils.clamp(fit * (z.lift > 0 ? 0.85 : z.lift < 0 ? 0.8 : 1), 9, 60);
    // Every viewpoint leans to the side the line arrives from, so the line does not zigzag.
    const swing = TRAIL.swing;
    const eye = z.centre
      .clone()
      .addScaledVector(inward, back * Math.cos(swing))
      .addScaledVector(side, back * Math.sin(swing));
    eye.y = z.lift > 0 ? z.lift - z.height * 0.55 : z.lift < 0 ? z.lift + z.height * 0.8 : z.lift + z.height * 0.08;
    // A work that hangs high is looked at below its middle: the body of Aabijijiwan hangs
    // under its plate, and Quinn found the view aimed too high on it.
    return { eye, look: z.centre.clone().setY(z.lift > 0 ? z.lift - z.height * TRAIL.low : z.lift) };
  });
  const under = (p) => p.clone().setY(p.y - TRAIL.under);
  const stops = eyes.map((e) => under(e.eye));
  // A loop needs three points. With fewer works, it also comes back by where the flight starts.
  if (stops.length < 3) stops.push(new THREE.Vector3(0, -TRAIL.under, 13), new THREE.Vector3(6, -TRAIL.under, 20));
  // The line through those points turns sharply at each one, so it is rounded off: evenly
  // spaced points along it, each moved to the average of its neighbours a few times over.
  // It then passes near each viewpoint instead of through it, which is close enough, since
  // the camera on the tour looks at the work and not along the line.
  const rough = new THREE.CatmullRomCurve3(stops, true, 'centripetal');
  let round = rough.getSpacedPoints(240).slice(0, 240);
  for (let pass = 0; pass < 4 && TRAIL.smooth > 0; pass += 1) {
    round = round.map((_, i) => {
      const mean = new THREE.Vector3();
      for (let k = -TRAIL.smooth; k <= TRAIL.smooth; k += 1) mean.add(round[(i + k + 240) % 240]);
      return mean.divideScalar(TRAIL.smooth * 2 + 1);
    });
  }
  const path = new THREE.CatmullRomCurve3(round.filter((_, i) => i % 3 === 0), true, 'catmullrom', 0.5);
  const long = path.getLength();
  const count = Math.floor(long / (TRAIL.dash + TRAIL.gap));
  const waves = Math.max(1, Math.round(long / TRAIL.length)); // a whole number, so the loop closes
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(TRAIL.thick, TRAIL.thick, TRAIL.dash), paint(TRAIL.colour), count);
  dashes.frustumCulled = false; // the line runs all round the camera
  const base = [];
  for (let i = 0; i < count; i += 1) base.push(path.getPointAt(i / count));
  const at = new THREE.Object3D();
  const ahead = new THREE.Vector3();
  const rise = (i, t) => Math.sin(((i / count) * waves - (t * TRAIL.speed) / TRAIL.length) * Math.PI * 2) * TRAIL.height;
  function trailWave(t) {
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      at.position.copy(base[i]);
      at.position.y += rise(i, t);
      ahead.copy(base[next]);
      ahead.y += rise(next, t);
      at.lookAt(ahead);
      at.updateMatrix();
      dashes.setMatrixAt(i, at.matrix);
    }
    dashes.instanceMatrix.needsUpdate = true;
  }
  group.add(dashes);

  // The spirit line. Its way round: it goes round each work in turn, not straight behind
  // it. Seen from the centre, it comes in at one side of a work, runs up that side, over
  // the top and down the other, like an arch over the work, or the same upside down, like
  // a cradle under it: over one work and under the next, so it weaves, with a work that
  // hangs high always arched over and a work sunk low always cradled. It runs just behind
  // the sculptures, clear of them by `clear`. Between two works it crosses the gap on a
  // slant, from the foot of one to the head of the next, and swings toward the centre on
  // the way, which fills the empty space between them. Round the back of the ring, where
  // there are no works, it meanders in and out and up and down to close the loop.
  const span = Math.PI * 2;
  const up = new THREE.Vector3(0, 1, 0);
  const order = zones
    .map((z) => ({ z, a: Math.atan2(z.centre.x, -z.centre.z) })) // 0 is straight ahead
    .sort((p, q) => p.a - q.a);
  const knots = [];
  let over = true;
  let last = null; // where the line left the work before, and how high
  order.forEach(({ z, a }, i) => {
    const outward = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    const across = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); // left to right, seen from the centre
    const arch = z.lift > 0 ? true : z.lift < 0 ? false : over;
    if (z.lift === 0) over = !over;
    const side = z.width / 2 + SPIRIT.clear[0];
    const top = z.height / 2 + SPIRIT.clear[1];
    const middle = z.centre.clone().setY(z.lift).addScaledVector(outward, SPIRIT.clear[2]);
    const at = (deg) => {
      const t = THREE.MathUtils.degToRad(deg);
      return middle
        .clone()
        .addScaledVector(across, Math.cos(t) * side)
        .addScaledVector(up, Math.sin(t) * top * (arch ? 1 : -1));
    };
    const round = [208, 155, 90, 25, -28].map(at);
    if (last) {
      // The crossing between two works: half way, swung in toward the centre.
      const mid = last.clone().lerp(round[0], 0.5);
      mid.addScaledVector(new THREE.Vector3(mid.x, 0, mid.z).normalize(), -SPIRIT.meander * 0.8);
      knots.push(mid);
    }
    knots.push(...round);
    last = round[round.length - 1];
    if (i === order.length - 1) {
      // Round the back, from the last work to the first.
      const from = Math.atan2(last.x, -last.z);
      const first = knots[0];
      const to = Math.atan2(first.x, -first.z) + span;
      const steps = Math.max(4, Math.round(((to - from) / span) * SPIRIT.bends * 2));
      for (let k = 1; k < steps; k += 1) {
        const f = k / steps;
        const b = from + (to - from) * f;
        const swing = k % 2 ? 1 : -1;
        const r = THREE.MathUtils.lerp(Math.hypot(last.x, last.z), Math.hypot(first.x, first.z), f);
        knots.push(
          new THREE.Vector3(Math.sin(b), 0, -Math.cos(b))
            .multiplyScalar(r + swing * SPIRIT.meander * (0.5 + random() * 0.5))
            .setY(THREE.MathUtils.lerp(last.y, first.y, f) + swing * SPIRIT.meander * (0.4 + random() * 0.6)),
        );
      }
    }
  });
  const spiritPath = new THREE.CatmullRomCurve3(knots, true, 'catmullrom', 0.5);
  const spiritTime = { value: 0 };
  const long2 = spiritPath.getLength();

  // The orbs are beads on that string: each sits on the line itself, and the line swells
  // round it and narrows again in one smooth curve, so the bead's rim is the line and there
  // is no corner where they meet. Where each bead is, how big, and its colour:
  const beads = [];
  for (let i = 0; i < SPIRIT.orbs; i += 1) {
    beads.push({
      u: (i + 0.2 + random() * 0.6) / SPIRIT.orbs,
      size: between(SPIRIT.orb),
      fill: SPIRIT.fills[i % SPIRIT.fills.length],
    });
  }
  // Which beads are smileys: one in `smile`, chosen from the beads that sit well clear of
  // every work (or the clearest ones, if too few do), spread out along the line.
  const clear = beads.map((b) => {
    const at = spiritPath.getPointAt(b.u);
    return Math.min(...zones.map((z) => at.distanceTo(z.centre.clone().setY(z.lift)) - Math.max(z.radius, z.height / 2)));
  });
  const wanted = Math.max(1, Math.round(SPIRIT.orbs / SPIRIT.smile));
  let open = beads.map((_, i) => i).filter((i) => clear[i] >= SPIRIT.apart);
  if (open.length < wanted) open = beads.map((_, i) => i).sort((a, b) => clear[b] - clear[a]).slice(0, wanted).sort((a, b) => a - b);
  const smileys = new Set(Array.from({ length: wanted }, (_, k) => open[Math.floor(((k + 0.5) * open.length) / wanted)]));
  /** How thick the line is at a point `u` (0 to 1) of the way round: its own thickness,
      rising in a smooth hump to each bead's size and falling away again. */
  const swell = (u) => {
    let r = SPIRIT.thick;
    for (const b of beads) {
      let d = Math.abs(u - b.u);
      d = Math.min(d, 1 - d) * long2;
      const reach = b.size * SPIRIT.taper;
      if (d < reach * 3.2) r = Math.max(r, SPIRIT.thick + (b.size - SPIRIT.thick) * Math.exp(-((d / reach) ** 2)));
    }
    return r;
  };

  /** A tube along the spirit line whose radius is `radiusAt(u)`. Like three's TubeGeometry,
      with uv.x the share of the way round, which the waves below are worked out from. */
  function stringTube(segments, sides, radiusAt) {
    const frames = spiritPath.computeFrenetFrames(segments, true);
    const positions = [];
    const normals = [];
    const uvs = [];
    const index = [];
    const centre = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i <= segments; i += 1) {
      const u = i / segments;
      spiritPath.getPointAt(u % 1, centre);
      const N = frames.normals[i === segments ? 0 : i];
      const B = frames.binormals[i === segments ? 0 : i];
      const r = radiusAt(u % 1);
      for (let k = 0; k <= sides; k += 1) {
        const v = (k / sides) * Math.PI * 2;
        n.set(0, 0, 0).addScaledVector(N, Math.cos(v)).addScaledVector(B, Math.sin(v)).normalize();
        positions.push(centre.x + n.x * r, centre.y + n.y * r, centre.z + n.z * r);
        normals.push(n.x, n.y, n.z);
        uvs.push(u, k / sides);
      }
    }
    for (let i = 0; i < segments; i += 1) {
      for (let k = 0; k < sides; k += 1) {
        const a = i * (sides + 1) + k;
        const b = a + sides + 1;
        index.push(a, a + 1, b, b, a + 1, b + 1); // wound so the outside faces out
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(index);
    return g;
  }

  // The waves and the pulse are done where the line is drawn, from how far along it each
  // point is (uv.x): the waves lift, drop and swing it, the pulse pushes its skin out and in.
  const moving = (material) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = spiritTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          transformed += normal * ${(SPIRIT.thick * SPIRIT.pulse).toFixed(4)} * sin(6.2832 * (uv.x * ${SPIRIT.beats.toFixed(1)} - uTime * ${SPIRIT.beat.toFixed(4)}));
          transformed.y += ${SPIRIT.wave.toFixed(4)} * sin(6.2832 * (uv.x * ${SPIRIT.waves.toFixed(1)} - uTime * ${SPIRIT.drift.toFixed(4)}));
          transformed.xz += normalize(position.xz) * ${SPIRIT.sway.toFixed(4)} * sin(6.2832 * (uv.x * ${SPIRIT.sways.toFixed(1)} + uTime * ${SPIRIT.slide.toFixed(4)}));`,
        );
    };
    return material;
  };
  // The line is one skin: the tube, humped out round each bead (`swell`) and drawn inside
  // out, its far wall only. From any side that reads as the same flat line, and it lets
  // whatever stands inside it show: a bead's card sits in the hump, and the hump's two
  // ends carry the card's outer ring on into the line without a join.
  const swollen = new THREE.Mesh(
    stringTube(2400, 14, swell),
    moving(new THREE.MeshBasicMaterial({ color: new THREE.Color(token(SPIRIT.colour, '#7cc7d9')), side: THREE.BackSide })),
  );
  swollen.frustumCulled = false; // it runs all round the camera, and moves
  group.add(swollen);

  // Each bead is a flat round card that always faces the camera (Quinn's choice over a
  // ball), in three rings from the outside in:
  //   - the line's own colour, one even width all the way round (`rim`). It is as big as
  //     the hump in the line, so it is the line's outline carried round the bead, and the
  //     hump's two ends run it on into the line with no corner;
  //   - the orb's own outline, thick, in a second colour (`edge`);
  //   - the orb's fill, in a third.
  const disc = new THREE.CircleGeometry(1, 48);
  const lineColour = paint(SPIRIT.colour);
  // The smile: the lower part of a ring, for a fill of radius 1.
  const smileArc = new THREE.RingGeometry(0.5, 0.64, 28, 1, Math.PI * 1.13, Math.PI * 0.74);
  const orbs = beads.map((b, i) => {
    const on = spiritPath.getPointAt(b.u);
    const card = new THREE.Group();
    const smiley = smileys.has(i);
    const fill = smiley ? SPIRIT.face[0] : SPIRIT.fills[i % SPIRIT.fills.length];
    let edge = SPIRIT.fills[(i + 2 + (i % 3)) % SPIRIT.fills.length];
    if (edge === fill) edge = SPIRIT.fills[(i + 1) % SPIRIT.fills.length];
    if (smiley) edge = SPIRIT.face[2];
    const inner = 1 - SPIRIT.rim - SPIRIT.edge;
    if (smiley) {
      // Two eyes and a smile on the fill. The card copies the camera's turn, so the face
      // is always the right way up on screen.
      const ink = paint(SPIRIT.face[1]);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(disc, ink);
        eye.scale.set(inner * 0.13, inner * 0.19, 1);
        eye.position.set(side * inner * 0.32, inner * 0.24, 0.09);
        card.add(eye);
      }
      const mouth = new THREE.Mesh(smileArc, ink);
      mouth.scale.setScalar(inner);
      mouth.position.set(0, inner * 0.06, 0.09);
      card.add(mouth);
    }
    [
      [lineColour, 1],
      [paint(edge), 1 - SPIRIT.rim],
      [paint(fill), inner],
    ].forEach(([material, radius], k) => {
      const ring = new THREE.Mesh(disc, material);
      ring.scale.setScalar(radius);
      ring.position.z = k * 0.03; // each a hair nearer the camera than the one it sits on
      card.add(ring);
    });
    card.position.copy(on);
    group.add(card);
    facing.push(card);
    return { orb: card, u: b.u, at: on.clone(), out: new THREE.Vector3(on.x, 0, on.z).normalize(), size: b.size };
  });
  function wave(t) {
    trailWave(t);
    spiritTime.value = t;
    for (const o of orbs) {
      // The same two waves as the line's shader, so each orb stays joined to it.
      o.orb.position
        .copy(o.at)
        .addScaledVector(o.out, SPIRIT.sway * Math.sin(span * (o.u * SPIRIT.sways + t * SPIRIT.slide)));
      o.orb.position.y += SPIRIT.wave * Math.sin(span * (o.u * SPIRIT.waves - t * SPIRIT.drift));
      // It breathes with the line's pulse where it sits, and stays inside its rim.
      o.orb.scale.setScalar(o.size * (1 + 0.04 * Math.sin(span * (o.u * SPIRIT.beats - t * SPIRIT.beat))));
    }
  }
  wave(0);

  // The tour: the camera rides `under` above the line and always looks at a work. Between
  // two viewpoints its gaze swings steadily from the one work to the next: it holds on a
  // work for the first and last fifth of the way, and turns across the rest. The gaze is
  // blended as a direction, never as a point in space, so it cannot whip round when the
  // camera passes close to the straight line between two works.
  // Where along the line each viewpoint is: its share of the way round the unrounded line,
  // which the rounded one keeps, since it is made from evenly spaced points of it. (Looking
  // for the nearest place on the line instead can pick the wrong pass where the line comes
  // by a viewpoint twice, which sent the gaze back to a work already seen.)
  const each = 60;
  const lengths = rough.getLengths(stops.length * each);
  const marks = eyes.map((v, i) => ({
    at: (lengths[i * each] / lengths[lengths.length - 1]) * long,
    look: v.look,
  }));
  const wrap = (s) => (((s % long) + long) % long) / long;
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  // The tour begins at the work straight ahead of where the flight starts.
  const ahead0 = zones.reduce((a, z, i) => (Math.abs(z.centre.x) < Math.abs(zones[a].centre.x) ? i : a), 0);
  /** How far the gaze has turned to the next work, for a share of the way there. */
  const turned = (share) => {
    const f = THREE.MathUtils.clamp((share - 0.2) / 0.6, 0, 1);
    return f * f * f * (f * (f * 6 - 15) + 10);
  };
  const tour = {
    length: long,
    start: marks[ahead0].at,
    // The works in the order the tour passes them, from the one it starts at. The flight's
    // roadmap (FlyMode.jsx) has a leg for each.
    works: marks.map((_, k) => zones[(ahead0 + k) % marks.length].title),
    /** The place on the line of the `k`th work in that order, the nearest way round from `s`. */
    stop(k, s) {
      const at = marks[(ahead0 + k) % marks.length].at;
      return at + Math.round((s - at) / long) * long;
    },
    /** How far round the tour `s` is, in works: 1 is at the second work, 1.5 is when the
        gaze has turned half way from the second to the third. It follows the gaze, not the
        distance, so the roadmap names the work the camera is looking at. */
    where(s) {
      const here = wrap(s) * long;
      let i = marks.length - 1;
      for (let k = 0; k < marks.length; k += 1) if (marks[k].at <= here) i = k;
      const a = marks[i];
      const b = marks[(i + 1) % marks.length];
      const gap = (b.at - a.at + long) % long || long;
      // Wrapped, so arriving back at the first work reads as 0, never as a full round.
      return (((i - ahead0 + marks.length) % marks.length) + turned(((here - a.at + long) % long) / gap)) % marks.length;
    },
    poseAt(s, eye, look) {
      path.getPointAt(wrap(s), eye);
      eye.y += TRAIL.under;
      const here = wrap(s) * long;
      let i = marks.length - 1;
      for (let k = 0; k < marks.length; k += 1) if (marks[k].at <= here) i = k;
      if (here < marks[0].at) i = marks.length - 1;
      const a = marks[i];
      const b = marks[(i + 1) % marks.length];
      const gap = (b.at - a.at + long) % long || long;
      const k = turned(((here - a.at + long) % long) / gap);
      from.copy(a.look).sub(eye).normalize();
      to.copy(b.look).sub(eye).normalize();
      if (from.dot(to) < -0.95) to.x += 0.2; // nearly opposite: pick a side to turn through
      look.copy(from).lerp(to, k).normalize().multiplyScalar(30).add(eye);
    },
  };

  // A zone's own colour field: the same hand-cut shape as the far ones, standing close
  // behind the zone's sculptures and facing the centre. It sits behind the middle of the
  // row and is smaller than it, so the pieces at the ends stand clear of it against the
  // ground (Quinn found one as wide as the row too big). It grows in with the zone's title. Made last, so the far scenery keeps its places.
  for (const z of zones) {
    if (!z.backdrop) continue;
    const [fill, line] = z.backdrop;
    const shape = blob(random);
    const g = new THREE.Group();
    const m = new THREE.Group();
    m.add(new THREE.Mesh(shape.fill, paint(fill)), new THREE.Mesh(shape.line, paint(line)));
    m.scale.setScalar(Math.max(z.width * 0.3, z.height * 0.6));
    const outward = new THREE.Vector3(z.centre.x, 0, z.centre.z).normalize();
    g.position.copy(z.centre).addScaledVector(outward, z.radius * 0.45 + 5).setY(z.lift);
    g.lookAt(0, z.lift, 0);
    g.add(m);
    group.add(g);
    zoneGroups.push(g);
  }

  return { group, zones: zoneGroups, links, facing, upright, wave, tour };
}
