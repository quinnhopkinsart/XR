import cover from './cover.jpg';
import turtle from './targets/turtle.jpg';
import moonModel from './models/moon.glb?url';

// Rebuilt from the 8th Wall project "dibiki-giizis" (code-only export) for the
// self-hosted engine. Source and notes: the dibiki-giizis-selfhosted project folder, README.md.
// The build opens in a 3D view with the turtle picture on the ground. ?view=ar runs the
// original camera AR, made for a picture lying on the floor.
// The old link, 8th.io/jnxx5, stops on February 28, 2027.

export default {
  title: '13 Moon Calendar',
  year: '2024',
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],
  status: 'live',
  venue: 'La Leun Waashisho, MuseumsQuartier',
  location: 'Vienna',

  summary:
    'A turtle of stones on the ground opens, a moon rises from its shell and the thirteen Anishinaabe moons turn around it.',

  description: [
    '13 Moon Calendar, Giizisoo-Mazina\'igan, follows the lunar year as the Anishinaabeg keep it. A turtle carries thirteen large scales on its back, one for each moon of the year. Here the turtle is a ring of stones laid in the grass, seen from above.',
    'The picture lies on the ground. On a phone the shell opens, a moon rises out of it, and the thirteen moons turn in a circle around the turtle with the phases of the moon inside them. Each moon has its drawing, its name in Anishinaabemowin and English, and a teaching about what the land is doing in that time.',
    'The work opens on the moon we are in today. A moon runs from one new moon to the next, and the moon at the top of the screen is drawn as it is lit right now. I made it for La Leun Waashisho, an augmented reality exhibition presented by Harbour Collective with PIX FILM Collective and Setzkasten, which opened at the MuseumsQuartier in Vienna in November 2024.',
  ],

  howTo: [
    'Press Enter in the frame above. The turtle opens in a 3D view on any device.',
    'Drag to walk around it. On a phone, drag or tap Tilt.',
    'Use the arrows to move through the thirteen moons. The tabs switch between Anishinaabemowin and English.',
    'For AR, print the target below or open it on a tablet, and lay it flat on the floor or a table.',
    'Tap AR at the top right on a phone, then stand over the picture and point your camera down at it.',
  ],

  embedNote: 'Enter to explore. Use the arrows to move through the moons, or on a phone tap AR to open the camera.',

  credits: [
    { role: 'Artwork and AR', name: 'Quinn Hopkins' },
    { role: 'Presented by', name: 'Harbour Collective with PIX FILM Collective and Setzkasten' },
    { role: 'Shown with', name: 'Jason Baerg, Casey Koyczan and Feather Miigwans' },
  ],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (DG_FRAMED in the build).
  launch: { type: 'build', path: '/builds/13-moon-calendar/index.html', embed: true },

  cover,
  coverAlt:
    'A moon floats above an open turtle shell on a patch of grass, ringed by thirteen moon drawings and the phases of the moon, with a panel of text about the Freezing Moon.',
  targets: [
    {
      src: turtle,
      label: 'Turtle of stones',
      alt: 'Image target, to lay on the floor: thirteen grey and yellow stones arranged as a turtle on dark green grass dotted with yellow flowers, seen from above.',
    },
  ],

  // The moon joins the floating background with its own surface.
  models: [{ src: moonModel }],

  tags: ['image target', 'floor target', '13 moons', 'group exhibition'],
};
