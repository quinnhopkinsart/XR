import cover from './cover.jpg';
import mural from './targets/mural.jpg';

// Rebuilt from the 8th Wall project "odeyto-mural" for the self-hosted engine.
// Source and notes: the odeyto-mural-selfhosted project folder, README.md. Its scene model
// was optimized in Blender (odeyto-scene-optimized.blend in that folder's blender/).
// The build opens in a 3D view of the mural with the portal open in it. ?view=ar runs the
// original camera AR on the one image target, the mural itself.
// The hosted app, noodinstudio.8thwall.app/odeyto-mural, stops on February 28, 2027.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: 'seneca-mural',

  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (FA_FRAMED in the build).
  launch: { type: 'build', path: '/builds/future-ancestors/index.html', embed: true },

  cover,
  targets: [
    {
      src: mural,
      label: 'The mural',
      alt: 'Image target, the mural: a canoe painted with the words Water is Life crosses blue and black water at night, a white figure seated in it among plants and a crate of berries, with lit towers, a thunderbird and a full yellow moon behind.',
    },
  ],

  // The floating background is curated: ask Quinn before adding this work's pieces.
  models: [],
};
