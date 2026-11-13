// Copied by `npm run new -- "Title"`. Every field is explained in docs/ADDING-A-PROJECT.md.
// Text, status and the hidden flag live in content.json beside this file, so the
// dashboard at /admin can edit them. This file holds what needs code: images, the
// launch, targets and models.
// Drop images next to this file and import them:
//   import cover from './cover.jpg';
//   import target1 from './targets/panel-1.jpg';

export default {
  kind: 'Augmented reality',
  // How it is experienced, any of: 'image-target', 'world-tracking', '3d'.
  // Each one is a coloured tag on the card and a filter on the home page.
  categories: ['image-target'],

  // Pick one launch type, or set launch: null while the work has nothing to open.
  // { type: 'build', path: '/builds/__SLUG__/index.html', embed: true }
  // { type: 'external', url: 'https://...' }
  // { type: 'component', load: () => import('./Experience.jsx') }
  launch: { type: 'component', load: () => import('./Experience.jsx') },

  // Hosted 8th Wall link, if the work still has one. Hidden after the shutdown date.
  // legacy: { url: 'https://8th.io/xxxxx', until: '2027-02-28' },

  // cover,
  // targets: [{ src: target1, label: 'Panel 1' }],

  // Pieces for the floating background. import piece from './models/piece.glb?url';
  // models: [{ src: piece, split: true, exclude: ['backdrop'] }],
  models: [],
};
