import cover from './cover.jpg';
import thunderbird from './targets/thunderbird.jpg';
import shaman from './targets/shaman.jpg';
import thunderbirdModel from './models/thunderbird.glb?url';
import hyperWoodlandModel from './models/hyper-woodland.glb?url';
import shamanPortalModel from './models/shaman-portal.glb?url';

export default {
  title: 'Trading Post Humanism',
  year: '2026',
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],
  status: 'live',
  venue: 'Worth Gallery',
  location: 'Tkaronto',

  summary:
    'Thunderbird vs Serpent and Shaman, two lightbox works in Hyper Woodland, open into augmented reality.',

  // Statement for the two works in the XR experience. The full show statement
  // lives on noodinstudio.com/work/trading-post-humanism.
  description: [
    'Trading Post Humanism opens into augmented reality through two lightbox works, Thunderbird vs Serpent and Shaman. Both are rendered in Hyper Woodland, the style I developed and named, which carries the Woodland School into 3D modelling, augmented reality and light. The bold outlines and divided fields of the lightboxes lift into depth on your phone.',
    'Thunderbird vs Serpent holds the dichotomy of being an urban Indigenous person. The thunderbird and the serpent are forces of the sky and the water, locked in an old struggle. Living in the city, I feel fractured. Fighting the serpent makes me complete again.',
    'Shaman explores spirituality and authenticity in the tech era. The figure lives on the wall and on the phone screen at once, and asks what makes a spiritual practice real when it reaches us through technology.',
    'Both works were shown in Trading Post Humanism, my 2026 solo exhibition at Worth Gallery, where every piece carried a beaded price tag hand-stitched on deer hide.',
  ],

  howTo: [
    'Press Enter in the frame above. It opens in a 3D view on any device.',
    'On desktop, move your mouse to look inside and scroll to the next artwork.',
    'On a phone, tilt or drag to look inside. Tap AR at the top right to open the camera in a new tab.',
    'Point your phone at Thunderbird vs Serpent or Shaman, or at one of the targets below.',
  ],

  embedNote: 'Enter to explore. On a phone, tilt to look around, or tap AR to open the camera.',

  credits: [
    { role: 'Presented at', name: 'Worth Gallery' },
    { role: 'With', name: 'JL Phillips Gallery and Highness' },
  ],

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
  coverAlt:
    'Billboard reading Noodin Studio, Trading Post Humanism, Worth Gallery, June 9, 2026, standing on a rock outcrop under a blue sky.',
  targets: [
    { src: thunderbird, label: 'Thunderbird vs Serpent', alt: 'Thunderbird vs Serpent lightbox artwork, image target' },
    { src: shaman, label: 'Shaman', alt: 'Shaman lightbox artwork, image target' },
  ],
  tags: ['image target', 'solo exhibition', 'lightbox'],
};
