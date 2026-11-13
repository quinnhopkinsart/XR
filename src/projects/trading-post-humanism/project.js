import cover from './cover.jpg';
import thunderbird from './targets/thunderbird.jpg';
import shaman from './targets/shaman.jpg';
import thunderbirdModel from './models/thunderbird.glb?url';
import hyperWoodlandModel from './models/hyper-woodland.glb?url';
import shamanPortalModel from './models/shaman-portal.glb?url';

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the build plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/trading-post-humanism/index.html', embed: true },

  // Pieces this work adds to the floating background on every page.
  models: [
    { src: thunderbirdModel, hero: true, recolor: '--black' },
    { src: hyperWoodlandModel, split: true, exclude: ['backdrop'] },
    // The sculpture faces +x in its file, so it turns to face the page. The basin is its ground.
    { src: shamanPortalModel, split: true, exclude: ['disc', 'basin'], turn: -90 },
  ],

  cover,
  targets: [
    { src: thunderbird, label: 'Thunderbird vs Serpent', alt: 'Thunderbird vs Serpent lightbox artwork, image target' },
    { src: shaman, label: 'Shaman', alt: 'Shaman lightbox artwork, image target' },
  ],
};
