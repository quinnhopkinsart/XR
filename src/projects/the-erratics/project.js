import cover from './cover.jpg';
import centralLeft from './targets/central-left.jpg';
import centralMiddle from './targets/central-middle.jpg';
import centralRight from './targets/central-right.jpg';
import sherwood from './targets/sherwood.jpg';
import erraticModel from './models/erratic.glb?url';

// Two 8th Wall Studio projects merged into one self-hosted build: "the-erratic-at-dunlop-gallery"
// (the three Central Branch walls, 8th.io/uh73x) and "the-erratics-sherwood" (8th.io/n2ree).
// Source and notes: the-erratics-selfhosted project folder, README.md. It runs on the Studio
// runtime like Biidaaban. The build opens in a 3D view of one wall at a time. ?view=ar runs the
// camera AR with all four targets live, and the wall the camera finds loads its own doorway.
// ?wall=central-left|central-middle|central-right|sherwood picks the first wall in either view.
// Both old links stop on February 28, 2027.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],
  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (ERR_FRAMED in the build).
  launch: { type: 'build', path: '/builds/the-erratics/index.html', embed: true },

  cover,
  targets: [
    {
      src: centralLeft,
      label: 'Central, left wall',
      alt: 'Image target, Central Branch left wall: a pale boulder painted with red figures stands among birch trees in autumn, three glowing rings in the branches, a rabbit at its foot and orange triangles along the edges.',
    },
    {
      src: centralMiddle,
      label: 'Central, middle wall',
      alt: 'Image target, Central Branch middle wall: a rabbit sits on a boulder in front of a glowing ring of orange, purple and red, with a raven and a bison to the left and bison lifting into a tornado on the right.',
    },
    {
      src: centralRight,
      label: 'Central, right wall',
      alt: 'Image target, Central Branch right wall: a coyote stands in grass in front of a tall blue glacier holding a boulder, a brick column behind and an orange triangle overhead.',
    },
    {
      src: sherwood,
      label: 'Sherwood',
      alt: 'Image target, the Sherwood mural: a coyote howls beside a painted boulder where a rabbit sits inside a glowing ring, bison graze by a broken brick column and a raven flies across a dusk sky between pines.',
    },
  ],

  // The erratic itself joins the floating background.
  models: [{ src: erraticModel, recolor: '--black' }],
};
