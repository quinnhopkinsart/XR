import cover from './cover.jpg';
import mural from './targets/mural.jpg';

// Rebuilt from the 8th Wall project "intertribal" for the self-hosted engine.
// Source and notes: the intertribal-selfhosted project folder, README.md.
// The build opens in a 3D view: the mural hangs on a dark wall, the eagle flies through it
// and it breaks apart onto the city. ?view=ar runs the original camera AR on the one image
// target, the mural itself.
// The hosted app, noodinstudio.8thwall.app/intertribal (8th.io/p9fpe), stops on February 28, 2027.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: 'intertribal',

  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (IT_FRAMED in the build).
  launch: { type: 'build', path: '/builds/intertribal/index.html', embed: true },

  cover,
  targets: [
    {
      src: mural,
      label: 'The mural',
      alt: 'Image target, the mural: dancers in red, black, yellow and blue regalia stand with their backs to the viewer at a pow wow. Above them a grey eagle figure with a heart at its chest spreads its wings across bands of yellow, pink and white, with a tower and city buildings behind.',
    },
  ],

  // The floating background is curated: ask Quinn before adding this work's pieces.
  models: [],
};
