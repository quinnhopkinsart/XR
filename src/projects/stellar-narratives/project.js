import cover from './cover.jpg';
import cityMural from './targets/city-mural.jpg';
import bushMural from './targets/bush-mural.jpg';
import edaaLogo from './award/edaa.png';
import edaaLogoOnDark from './award/edaa-on-dark.png';
// import mishiModel from './models/mishibizhoo.glb?url';
// import nanaModel from './models/nanabush.glb?url';
// import moozModel from './models/mooz.glb?url';
// import bibModel from './models/biboonkeonini.glb?url';

// Rebuilt from the 8th Wall project "stellar-narratives" (code-only export) for the
// self-hosted engine. Source and notes: the stellar-narratives project folder, README.md.
// The build opens in a 3D view of the two murals. ?view=ar runs the original camera AR.
// The old link, 8th.io/2hark, stops on February 28, 2027.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: 'stellar-narratives',

  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (STN_FRAMED in the build).
  launch: { type: 'build', path: '/builds/stellar-narratives/index.html', embed: true },

  // Shown on the home card (top right) and in the page header. The build carries its own
  // copy of the logo, bottom left of the 3D and AR views.
  award: {
    label: 'Winner, 2024 Emerging Digital Artists Award, XR',
    short: '2024 winner, XR',
    logo: edaaLogo,
    logoOnDark: edaaLogoOnDark,
  },

  cover,
  targets: [
    {
      src: cityMural,
      label: 'City mural',
      alt: 'City mural image target: orange figures rise over a skyline of lit windows under a full moon, with a moose and other constellations in a dark blue sky.',
    },
    {
      src: bushMural,
      label: 'Bush mural',
      alt: 'Bush mural image target: an orange panther and an archer above a dark forest floor of leaves and berries, under a full moon and constellation figures.',
    },
  ],

  // The four seasonal figures join the floating background. Their own material is the
  // scanning-line shader from the build, so they take a token colour here.
  // The floating background is curated: this work's pieces are held back for now.
  // To bring them back, restore the four model imports at the top and these lines.
  // { src: mishiModel, recolor: '--black' },
  // { src: nanaModel, recolor: '--black' },
  // { src: moozModel, recolor: '--black' },
  // { src: bibModel, recolor: '--black' },
  models: [],
};
