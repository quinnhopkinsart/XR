import cover from './cover.jpg';

// A collaboration with Feather Miigwans, made for La Leun Waashisho (2024). The 8th Wall
// project is "she-bends-the-light-to-her-will" (export zip in Art\2026\8th Wall Projects\
// Archives). It is world tracking, not an image target: the export's Moon_target files are
// left over from the 13 Moon Calendar project and the scene never uses them.
//
// The build in public/builds/she-bends-the-light/ is rebuilt in plain three.js from the
// export's scene: a 3D view, and the camera AR on ?view=ar with world tracking on the
// self-hosted engine. The hosted AR is 8th.io/3ftfm until February 28, 2027; codes printed
// for it need reprinting from this work's page.
//
// To confirm with Quinn and Feather: the credit wording, the venue line (copied from
// 13 Moon Calendar, the same exhibition), who made the sound (Feather_Ambient.mp3), and
// the description.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: 'Augmented reality',
  categories: ['world-tracking', '3d'],

  // embed: the build plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/she-bends-the-light/index.html', embed: true },

  cover,

  models: [],
};
