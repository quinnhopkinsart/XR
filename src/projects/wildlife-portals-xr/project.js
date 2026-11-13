import cover from './cover.jpg';
import polarBear from './targets/polar-bear.webp';
import eagle from './targets/eagle.webp';
import deer from './targets/deer.webp';
import lynx from './targets/lynx.webp';
import salmon from './targets/salmon.webp';
// import polarBearModel from './models/polar-bear.glb?url';
// import eagleModel from './models/eagle.glb?url';

// Rebuilt from the 8th Wall project "wildlife-ar" for the self-hosted engine. Its export held
// no scene code, so the scenes, models and images were recovered from the hosted app.
// Source and notes: the wildlife-ar-selfhosted project folder, README.md.
// The build opens in a 3D view of the five prints. ?view=ar runs the original camera AR,
// with all five targets live at once.
// The old link, 8th.io/997et, stops on February 28, 2027.
// One project, two iterations: Wildlife XR (2024) and these portals (2025). The portfolio
// lists both under this work, so keep the two descriptions in step.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (WPX_FRAMED in the build).
  launch: { type: 'build', path: '/builds/wildlife-portals-xr/index.html', embed: true },

  cover,
  targets: [
    {
      src: polarBear,
      label: 'Polar bear',
      alt: 'Image target, a round print: a polar bear on an ice floe in open water, icebergs behind it under a bright sky.',
    },
    {
      src: eagle,
      label: 'Eagle',
      alt: 'Image target, a round print: a bald eagle holding a fish in its beak on a stony shore, a lake and dark pines behind it.',
    },
    {
      src: deer,
      label: 'Deer',
      alt: 'Image target, a round print: two deer face each other on a leafy forest floor under bare trees at dusk.',
    },
    {
      src: lynx,
      label: 'Lynx',
      alt: 'Image target, a round print: a lynx walks across deep snow between snow-covered pines under a starry sky.',
    },
    {
      src: salmon,
      label: 'Salmon',
      alt: 'Image target, a round print: salmon swim above a riverbed of pale stones and green water plants, light falling from the surface.',
    },
  ],

  // The polar bear and the eagle join the floating background.
  // The floating background is curated: this work's pieces are held back for now.
  // To bring them back, restore the two model imports at the top and these lines.
  // { src: polarBearModel, recolor: '--black' },
  // { src: eagleModel, recolor: '--black' },
  models: [],
};
