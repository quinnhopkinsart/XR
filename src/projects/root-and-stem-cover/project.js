import cover from './cover.jpg';
import coverTarget from './targets/cover.jpg';

// Rebuilt from the 8th Wall project "r-s-literacy-2023" for the self-hosted engine.
// Source and notes: the r-s-literacy-selfhosted project folder, README.md.
// The build opens in a 3D view: the cover stands in the dark and opens edge to edge onto a
// night sky. ?view=ar runs the original camera AR on the one image target, the printed cover.
// The hosted app (noodinstudio.8thwall.app/r-s-literacy-2023, 8th.io/etxze) stops on
// February 28, 2027.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (RS_FRAMED in the build).
  launch: { type: 'build', path: '/builds/root-and-stem-cover/index.html', embed: true },

  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: 'root-stem-issue-7-cover',

  cover,
  targets: [
    {
      src: coverTarget,
      label: 'The cover',
      alt: 'Image target, the cover of Root & STEM issue 7: a tree made of green syllabics grows out of an open book floating in a pink and violet night sky, with the magazine title and the headline Language and Literacy: Digital Dialogues at the top left.',
    },
  ],

  // The floating background is curated: ask Quinn before adding this work's pieces.
  models: [],
};
