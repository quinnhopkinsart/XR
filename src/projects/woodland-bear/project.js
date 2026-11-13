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

export default {
  title: 'Woodland Be[AR]',
  year: '2022',
  kind: 'Digital sculpture',
  categories: ['world-tracking', '3d'],
  status: 'live',
  venue: 'BACA, Contemporary Native Art Biennial',
  location: 'Montreal',

  summary:
    'A bear in black outline, its colours standing off both sides in floating layers. Turn it and resize it in 3D, or stand it in your own space with your phone.',

  description: [
    'Woodland Be[AR] is a digital sculpture. A bear sits in thick black outline, and the colour that fills a Woodland painting leaves the body and floats beside it in layers, red, blue, magenta, green and yellow, each part drifting on its own.',
    'I first showed it as an augmented reality activation for Land Back, the sixth edition of the Contemporary Native Art Biennial (BACA), curated by Michael Patten with Alexandra Nordstrom, at Quai 5160, Maison de la culture de Verdun. The work places a virtual presence on the land, at the centre of an exhibition about its return.',
    'Here the bear stands wherever you put it. Your phone finds the floor, and the sculpture stays there while you walk around it.',
  ],

  howTo: [
    'In the frame above, drag to look around the sculpture. Pinch or scroll to zoom.',
    'Use the buttons to turn it, make it smaller or bigger, or reset it. Motion on or off stops and starts the floating.',
    'On a phone, tap AR to open the camera in a new tab, then tap Start AR and allow the camera and motion sensors.',
    'Move your phone slowly until it finds the floor. Tap the ground to move the sculpture there, drag to turn it, pinch to resize it.',
    'Tap the round camera button to take a photo, then save or share it.',
  ],

  embedNote: 'Drag to look around. On a phone, tap AR to stand the sculpture in your space.',

  credits: [
    { role: 'First shown at', name: 'BACA 2022, Land Back' },
    { role: 'Curated by', name: 'Michael Patten with Alexandra Nordstrom' },
  ],

  // embed: the build plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/woodland-bear/index.html', embed: true },

  cover,
  coverAlt:
    'A bear sculpture in glossy black outline on a saffron ground, with red, blue, magenta, green and yellow shapes floating out from its body.',

  // In the floating background on Quinn's request (November 13, 2026). The sculpture faces
  // -x in its file, so it turns to face the page.
  models: [{ src: bearModel, split: true, turn: 90 }],
  tags: ['digital sculpture', 'world tracking', 'biennial'],
};
