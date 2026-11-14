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
// Stars and marks always face the camera. Trees turn to it too but stay upright, so they
// are only ever seen flat on. Fields stay where they are put, so flying round one shows
// its edge.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// How many of each, and how far from the centre (in units; a zone sits about 35 out).
export const SCENERY = {
  floor: -7, // the level the trees stand at
  fields: { count: 9, near: 80, far: 125, size: [9, 22] },
  stars: { count: 46, near: 55, far: 120, size: [0.8, 3.2] },
  marks: { count: 48, near: 24, far: 80, size: [0.5, 1.6] },
  groves: { count: 8, near: 130, far: 190, trees: [3, 7], height: [12, 26] }, // field.js stops the camera 75 out
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
 * zones: [{ title, centre: Vector3, radius, height, lift, floor }] from field.js (`lift`
 * is how high the zone hangs, `floor` the level just under its sculptures).
 * Returns { group, zones: [Group], facing: [Object3D], upright: [Object3D] }: the titles
 * grow in as the flight begins, everything in `facing` is turned to the camera each frame,
 * and everything in `upright` is turned to it round its own trunk only.
 */
export function buildScenery({ zones, token, random }) {
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

  // Zones: the title hangs just under the sculptures, a little toward the centre.
  const zoneGroups = zones.map((z) => {
    const g = new THREE.Group();
    const inward = new THREE.Vector3(-z.centre.x, 0, -z.centre.z).normalize();
    g.position.copy(z.centre).addScaledVector(inward, z.radius * 0.5).setY(z.floor - 0.6);
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

  return { group, zones: zoneGroups, facing, upright };
}
