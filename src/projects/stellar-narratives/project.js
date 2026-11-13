import cover from './cover.jpg';
import cityMural from './targets/city-mural.jpg';
import bushMural from './targets/bush-mural.jpg';
import edaaLogo from './award/edaa.png';
import edaaLogoOnDark from './award/edaa-on-dark.png';
import mishiModel from './models/mishibizhoo.glb?url';
import nanaModel from './models/nanabush.glb?url';
import moozModel from './models/mooz.glb?url';
import bibModel from './models/biboonkeonini.glb?url';

// Rebuilt from the 8th Wall project "stellar-narratives" (code-only export) for the
// self-hosted engine. Source and notes: the stellar-narratives project folder, README.md.
// The build opens in a 3D view of the two murals. ?view=ar runs the original camera AR.
// The old link, 8th.io/2hark, stops on February 28, 2027.

export default {
  title: 'Stellar Narratives',
  year: '2024 to present',
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],
  status: 'live',
  venue: 'Koerner Gardens, Evergreen Brick Works',
  location: 'Tkaronto',

  summary:
    'Two murals on view at Evergreen Brick Works open into four Anishinaabe constellations and the thirteen moons.',

  description: [
    'Stellar Narratives: An Urban Indigenous Odyssey is on view at Evergreen Brick Works, where it has stood since June 2024. Two murals hang on the brick walls of Koerner Gardens, one of the city and one of the bush. City light pushes the stars back. The work asks urban Indigenous people to look up anyway.',
    'On a phone, each mural opens into the night sky. The constellation changes with the season. Mishi Bizhiw, the great panther, rises in spring. Nanabozho stands in the summer sky. Mooz, the moose, comes in fall. Gaa-biboonikaan, the bringer of winter, holds the cold months.',
    'The work also keeps the thirteen moons of the Anishinaabe year. Each moon runs from one new moon to the next, and its phase is drawn for the night you choose. Change the date and the moon, its phase and the season change with it.',
  ],

  howTo: [
    'Press Enter in the frame above. The murals open in a 3D view on any device.',
    'Drag to look around. On a phone, drag or tap Tilt.',
    'Change the date, or use the arrows beside it, to move through the moons and the four seasonal constellations.',
    'Switch between the city mural and the bush mural with the buttons above the date.',
    'For AR, tap AR at the top right on a phone, then point your camera at the murals in Koerner Gardens. Away from the Brick Works, use one of the targets below, on another screen or printed.',
  ],

  embedNote: 'Enter to explore. Change the date to move through the seasons, or on a phone tap AR to open the camera.',

  credits: [
    { role: 'Artwork and AR', name: 'Quinn Hopkins' },
    { role: 'Curated by', name: 'Alexis Nanibush-Pamajewong' },
    { role: 'Research support', name: 'Aylan Couchie and Nyle Miigizi Johnston' },
    { role: 'Supported by', name: 'City of Toronto, Toronto Arts Council and Miziwe Biik' },
  ],

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
  coverAlt:
    'A mural of a night sky over a city, with a full moon and constellation figures, mounted on a brick wall under the title Stellar Narratives.',
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
  models: [
    { src: mishiModel, recolor: '--black' },
    { src: nanaModel, recolor: '--black' },
    { src: moozModel, recolor: '--black' },
    { src: bibModel, recolor: '--black' },
  ],

  tags: ['image target', 'public art', 'mural', 'constellations', '13 moons', 'award'],
};
