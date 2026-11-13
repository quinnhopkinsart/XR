import cover from './cover.jpg';
import bearModel from './models/woodland-bear.glb?url';

// A digital sculpture, first shown as a Spark AR effect (the project folder is
// Documents\Art\2022\Medicine Bear). There is no 8th Wall export: the build in
// public/builds/woodland-bear/ is new, a three.js scene with two views. The 3D view orbits
// the sculpture; ?view=ar stands it on the floor with world tracking on the self-hosted
// 8th Wall engine. Both share the floating parts, the turn and size controls, and in AR a
// camera button.
//
// The model comes from WoodlandBear_mural.glb, cut from 633,000 triangles and 17 MB to
// about 75,000 and 300 KB, with each colour part kept as its own node (Code\Web\optimize.mjs
// in the project folder). The hosted 8th Wall version is 8th.io/tbete, which stops on
// February 28, 2027; codes printed for it need reprinting from this work's page.
//
// To confirm with Quinn: the year (the files are from 2022, the portfolio index says 2021),
// the curator and venue spellings, and the description, which is adapted from his portfolio
// draft.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: 'Digital sculpture',
  categories: ['world-tracking', '3d'],

  // embed: the build plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/woodland-bear/index.html', embed: true },

  cover,

  // In the floating background on Quinn's request (November 13, 2026). The sculpture faces
  // -x in its file, so it turns to face the page.
  models: [{ src: bearModel, split: true, turn: 90 }],
};
