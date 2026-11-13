import cover from './cover.jpg';

// The web version of the projection installation (TouchDesigner, depth sensor). It is not
// an 8th Wall work and has no camera AR: the build in public/builds/sacred-tags/ is its own
// source, a WebGL page where a mouse, a finger or movement in front of a webcam wears the
// graffiti off a shipping container to show the seven teachings in Anishinaabemowin on rock.
// The installation's files are in Documents\Art\2026\Sacred Tags.
//
// To confirm with Quinn: the spellings of the seven words (teachings.js in the build uses
// his MUTEK wall text; the installation's tag art spells three of them another way), the
// description, the credits, the year and the venues.
//
// '3d' is the nearest category the site has. It keeps ?view=ar off the QR code.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: 'Interactive projection',
  categories: ['3d'],

  // embed: the wall plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/sacred-tags/index.html', embed: true },

  cover,

  models: [],
};
