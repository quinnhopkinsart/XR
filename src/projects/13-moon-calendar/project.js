import cover from './cover.jpg';
import turtle from './targets/turtle.jpg';
import moonModel from './models/moon.glb?url';

// Rebuilt from the 8th Wall project "dibiki-giizis" (code-only export) for the
// self-hosted engine. Source and notes: the dibiki-giizis-selfhosted project folder, README.md.
// The build opens in a 3D view with the turtle picture on the ground. ?view=ar runs the
// original camera AR, made for a picture lying on the floor.
// The old link, 8th.io/jnxx5, stops on February 28, 2027.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: '13-moon-calendar',

  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (DG_FRAMED in the build).
  launch: { type: 'build', path: '/builds/13-moon-calendar/index.html', embed: true },

  cover,
  targets: [
    {
      src: turtle,
      label: 'Turtle of stones',
      alt: 'Image target, to lay on the floor: thirteen grey and yellow stones arranged as a turtle on dark green grass dotted with yellow flowers, seen from above.',
    },
  ],

  // The moon joins the floating background with its own surface.
  models: [{ src: moonModel }],
};
