import cover from './cover.jpg';
import thunderbird from './targets/thunderbird.jpg';
import shaman from './targets/shaman.jpg';
import thunderbirdModel from './models/thunderbird.glb?url';
import hyperWoodlandModel from './models/hyper-woodland.glb?url';
import shamanPortalModel from './models/shaman-portal.glb?url';

// Text, status and the hidden flag live in content.json beside this file.
export default {
  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: 'trading-post-humanism',

  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the build plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/trading-post-humanism/index.html', embed: true },

  // Pieces this work adds to the floating background on every page.
  models: [
    // flight.backdrop: in the landing page's free camera a colour field stands behind this
    // work's pieces, pink with a yellow outline (Quinn's request). One model carries it for
    // the whole work.
    { src: thunderbirdModel, hero: true, recolor: '--black', flight: { backdrop: ['--field-pink', '--saffron'] } },
    // foreground: the barbed wire and the spirit lines leave their sculpture and hang close
    // to the camera, very large, running off the screen. The spirit lines are the Shaman's
    // blue loops (SP_RingA, B and C). The red branching line (AR_GlowPaper) is a thunderbird
    // and stays in its sculpture.
    { src: hyperWoodlandModel, split: true, exclude: ['backdrop'], foreground: ['barbedwire'] },
    // The sculpture faces +x in its file, so it turns to face the page. The basin is its ground.
    { src: shamanPortalModel, split: true, exclude: ['disc', 'basin'], turn: -90, foreground: ['barbedwire', 'ring'] },
  ],

  cover,
  targets: [
    { src: thunderbird, label: 'Thunderbird vs Serpent', alt: 'Thunderbird vs Serpent lightbox artwork, image target' },
    { src: shaman, label: 'Shaman', alt: 'Shaman lightbox artwork, image target' },
  ],
};
