// Builds the floating field's model of 13 Moon Calendar from the build's own assets: the
// whole scene as it stands once it has opened (stone turtle, shell, moon, the ring of
// thirteen moons and the ring of phases), without the image target under it.
//
// The three .glb files rest closed (scale 0, moon far up) and open by animation, so each
// is set to the last frame of its clip. Everything is placed as the scene's markup places
// it (K in the build's bundle.js: models at half size, turned up from the target), then the
// whole is tipped back so the rings read as a circle from the page and the moon stands over
// them.
//
// Run from a folder with @gltf-transform/core, /functions and /extensions installed:
//   node build-13-moon-field.mjs <repo>
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, unpartition } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';

const repo = process.argv[2];
const assets = path.join(repo, 'public/builds/13-moon-calendar/assets');
const out = path.join(repo, 'src/projects/13-moon-calendar/models/calendar.glb');
const TILT = -58; // degrees: 0 faces the page, -90 lies flat on the ground

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = new Document();
doc.createBuffer();
const scene = doc.createScene('13 Moon Calendar');
const quat = (deg, axis) => {
  const h = (deg * Math.PI) / 360;
  const s = Math.sin(h);
  return [axis === 'x' ? s : 0, axis === 'y' ? s : 0, axis === 'z' ? s : 0, Math.cos(h)];
};
const root = doc.createNode('Calendar').setRotation(quat(TILT, 'x'));
scene.addChild(root);

// The models: opened, at half size, turned up from the target.
for (const name of ['Portal', 'Shell', 'Moon']) {
  const src = await io.read(path.join(assets, `${name}.glb`));
  for (const anim of src.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const sampler = ch.getSampler();
      const output = sampler.getOutput();
      const n = output.getElementSize();
      const cubic = sampler.getInterpolation() === 'CUBICSPLINE';
      const last = output.getCount() - (cubic ? 2 : 1); // cubic keeps in-tangent, value, out-tangent
      const v = output.getElement(last, new Array(n));
      const node = ch.getTargetNode();
      if (ch.getTargetPath() === 'translation') node.setTranslation(v);
      if (ch.getTargetPath() === 'rotation') node.setRotation(v);
      if (ch.getTargetPath() === 'scale') node.setScale(v);
    }
    anim.dispose();
  }
  const before = new Set(doc.getRoot().listScenes());
  mergeDocuments(doc, src);
  const holder = doc.createNode(name).setScale([0.5, 0.5, 0.5]).setRotation(quat(90, 'x'));
  for (const s of doc.getRoot().listScenes()) {
    if (before.has(s)) continue;
    for (const child of s.listChildren()) holder.addChild(child);
    s.dispose();
  }
  root.addChild(holder);
}

// The two rings: flat pictures just over the target, cut out by their alpha.
function ring(name, file, size, z) {
  const h = size / 2;
  const texture = doc.createTexture(name).setImage(fs.readFileSync(path.join(assets, file))).setMimeType('image/png');
  const material = doc
    .createMaterial(name)
    .setBaseColorTexture(texture)
    .setAlphaMode('MASK')
    .setAlphaCutoff(0.1)
    .setRoughnessFactor(1)
    .setMetallicFactor(0)
    .setDoubleSided(true);
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array([-h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0])))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0])))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array([0, 1, 2, 0, 2, 3])))
    .setMaterial(material);
  root.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)).setTranslation([0, 0, z]));
}
ring('Ring of thirteen moons', '13Moons.png', 1.1, 0.05);
ring('Ring of phases', 'Phases.png', 0.9, 0.1);

await doc.transform(unpartition(), dedup(), prune());
doc.getRoot().setDefaultScene(scene);
await io.write(out, doc);
console.log('wrote', out, fs.statSync(out).size, 'bytes');
