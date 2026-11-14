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
// far the line's corners are rounded off (0 keeps them sharp).
const TRAIL = { dash: 0.9, gap: 0.8, thick: 0.16, height: 1.1, length: 13, speed: 1.6, under: 3.2, frame: 1.3, swing: 0.15, smooth: 9, colour: '--black' };
const FIELD_WOBBLE = 0.2;
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
 * zones: [{ title, centre: Vector3, radius, width, height, lift, floor }] from field.js
 * (`lift` is how high the zone hangs, `floor` the level just under its sculptures).
 * view: { fov, aspect } of the camera, for fitting each work to the screen.
 * Returns { group, zones: [Group], facing: [Object3D], upright: [Object3D], wave(t) }: the
 * titles grow in as the flight begins, everything in `facing` is turned to the camera each
 * frame, everything in `upright` is turned to it round its own trunk only, and `wave(t)`
 * runs the waves along the line to follow. `tour` is that line as a camera track:
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
  const zoneGroups = zones.map((z) => {
    const g = new THREE.Group();
    const inward = new THREE.Vector3(-z.centre.x, 0, -z.centre.z).normalize();
    if (z.lift < 0) g.position.copy(z.centre).addScaledVector(inward, -z.radius * 0.7).setY(z.lift + z.height * 0.3);
    else g.position.copy(z.centre).addScaledVector(inward, z.radius * 0.5).setY(z.floor - 0.6);
    g.add(label(z.title, token));
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
    return { eye, look: z.centre.clone().setY(z.lift) };
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
  function wave(t) {
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
  wave(0);
  group.add(dashes);

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
  const tour = {
    length: long,
    start: marks[ahead0].at,
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
      const f = THREE.MathUtils.clamp((((here - a.at + long) % long) / gap - 0.2) / 0.6, 0, 1);
      const k = f * f * f * (f * (f * 6 - 15) + 10);
      from.copy(a.look).sub(eye).normalize();
      to.copy(b.look).sub(eye).normalize();
      if (from.dot(to) < -0.95) to.x += 0.2; // nearly opposite: pick a side to turn through
      look.copy(from).lerp(to, k).normalize().multiplyScalar(30).add(eye);
    },
  };

  return { group, zones: zoneGroups, facing, upright, wave, tour };
}
