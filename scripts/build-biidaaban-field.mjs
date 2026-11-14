// Builds the floating field's model of Biidaaban: the middle panel's 3D scene only (the
// rock of the mine, the lodge, the neutrino detector and the spiralling particles), without
// the panel's picture planes.
//
// PANEL-2-v1.glb plays one long clip under the story's narration, so its rest pose is
// mostly empty. This sets every animated node to where it is at TIME seconds, a moment
// when the rock has risen, the detector is whole and the particles are out, then drops the
// clip, the picture planes and the textures only they used, makes the rock lighter (40% of
// its triangles) and
// packs the textures down.
//
// Run from a folder with @gltf-transform/core, /functions, /extensions, draco3dgltf,
// meshoptimizer and sharp installed:
//   node build-biidaaban-field.mjs <repo> [seconds]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, getBounds, prune, simplifyPrimitive, textureCompress, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const repo = process.argv[2];
const TIME = Number(process.argv[3] || 58);
const src = path.join(repo, 'public/builds/biidaaban/assets/PANEL-2-v1.glb');
const out = path.join(repo, 'src/projects/biidaaban/models/mine.glb');
// The panel's picture planes and its light card, and the two spheres that have not yet
// grown at that moment (size 0).
const DROP = /Target|^Plane|^Sphere/;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read(src);
const root = doc.getRoot();

// Each animated node, set to its place at TIME.
const slerp = (a, b, k) => {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = dot < 0 ? -1 : 1;
  dot = Math.abs(dot);
  if (dot > 0.9995) return a.map((v, i) => v + (s * b[i] - v) * k);
  const th = Math.acos(dot);
  const wa = Math.sin((1 - k) * th) / Math.sin(th);
  const wb = (Math.sin(k * th) / Math.sin(th)) * s;
  return a.map((v, i) => v * wa + b[i] * wb);
};
for (const anim of root.listAnimations()) {
  for (const ch of anim.listChannels()) {
    const node = ch.getTargetNode();
    const sampler = ch.getSampler();
    const times = sampler.getInput();
    const values = sampler.getOutput();
    const n = values.getElementSize();
    const count = times.getCount();
    let i = 0;
    while (i < count - 1 && times.getScalar(i + 1) <= TIME) i += 1;
    const a = values.getElement(i, new Array(n));
    let v = a;
    if (TIME < times.getScalar(0)) v = values.getElement(0, new Array(n));
    else if (i < count - 1 && sampler.getInterpolation() === 'LINEAR') {
      const b = values.getElement(i + 1, new Array(n));
      const k = (TIME - times.getScalar(i)) / (times.getScalar(i + 1) - times.getScalar(i));
      v = ch.getTargetPath() === 'rotation' ? slerp(a, b, k) : a.map((x, j) => x + (b[j] - x) * k);
    }
    if (node && ch.getTargetPath() === 'translation') node.setTranslation(v);
    if (node && ch.getTargetPath() === 'rotation') node.setRotation(v);
    if (node && ch.getTargetPath() === 'scale') node.setScale(v);
  }
  anim.dispose();
}
for (const node of root.listNodes()) if (DROP.test(node.getName())) node.dispose();

for (const node of root.listNodes()) {
  if (!node.getMesh()) continue;
  const b = getBounds(node);
  console.log(node.getName().padEnd(16), b.min.map((x) => x.toFixed(2)).join(','), '|', b.max.map((x) => x.toFixed(2)).join(','));
}
if (process.argv[4] === 'dry') process.exit(0);

await doc.transform(prune(), dedup(), weld());
// Only the rock is made lighter: the lodge's poles and the detector's frame are thin and
// would break up.
await MeshoptSimplifier.ready;
for (const node of root.listNodes()) {
  if (!/Rocky Cave/.test(node.getName())) continue;
  for (const prim of node.getMesh().listPrimitives()) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0.4, error: 0.002 });
}
await doc.transform(
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 80, resize: [512, 512] }),
  draco(),
);
await io.write(out, doc);
console.log('wrote', out, fs.statSync(out).size, 'bytes');
