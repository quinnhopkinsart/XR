import panel1 from './targets/panel-1.jpg';
import panel2 from './targets/panel-2.jpg';
import panel3 from './targets/panel-3.jpg';

// First built as Two Eyed Seeing (8th Wall project "TwoEyedSeeing").
// The self-hosted build in public/builds/biidaaban/ is that project rebuilt with
// --output-public-path=./ and only the luminance images kept in image-targets/.

export default {
  title: 'Biidaaban',
  year: '2026',
  kind: 'Augmented reality',
  status: 'live',
  venue: 'McDonald Institute, Queen\'s University',

  summary:
    'Three panels by Will Morin and me open into augmented reality and carry Anishinaabe knowledge and astroparticle physics from past to future.',

  description: [
    'Biidaaban, the coming of dawn, is a three-panel artwork by Will Morin and Quinn Hopkins, commissioned by the Arthur B. McDonald Canadian Astroparticle Physics Research Institute in partnership with the Queen\'s University Office of Indigenous Initiatives and the Department of Physics, Engineering Physics and Astronomy. Will painted the outer panels. I made the middle panel and the augmented reality layer that moves through all three.',
    'The work moves from past to present to future. A loon rises toward the pictographs of Lake Superior. A lodge sits over SNOLAB, two kilometres underground, with the Seven Fires wampum carried in its design. A spirit bird travels the Milky Way beside a dreamcatcher woven in the same pattern found in pine cones, galaxies and the spiral of a river.',
    'On a phone, each panel comes into motion with a narrated teaching, with captions. The work grew out of a knowledge sharing circle with Elders, knowledge keepers and physicists at Queen\'s, and draws from Etuaptmumk, Two-Eyed Seeing, the framework Mi\'kmaw Elder Albert Marshall gave for holding Indigenous and Western knowledge together. It holds two ways of paying attention to the universe side by side.',
  ],

  howTo: [
    'Open the work on a phone or tablet and tap Enter. Allow camera access.',
    'Point your camera at a panel, or at one of the targets below, and keep the full panel in view.',
    'Turn up your volume or use headphones for the narration. Tap CC for captions.',
    'Move left to right, panel 1 to panel 3, to travel from past to present to future.',
  ],

  credits: [
    { role: 'Artists', name: 'Will Morin and Quinn Hopkins' },
    { role: 'Commissioned by', name: 'Arthur B. McDonald Canadian Astroparticle Physics Research Institute' },
    {
      role: 'In partnership with',
      name: 'Queen\'s University Office of Indigenous Initiatives and Department of Physics, Engineering Physics and Astronomy',
    },
  ],

  // Camera-only image-target AR with no 3D fallback, so it opens full screen
  // rather than embedding (phone browsers are unreliable with camera AR in a frame).
  launch: { type: 'build', path: '/builds/biidaaban/index.html' },

  cover: panel2,
  coverAlt:
    'Middle panel of Biidaaban: the bent-pole frame of a lodge over a dark tunnel, layered in blue and teal with fine lines of light.',
  targets: [
    {
      src: panel1,
      label: 'Panel 1, past',
      alt: 'Panel 1 image target: a loon on blue water beneath a spiral galaxy, beside a cliff and northern lights.',
    },
    {
      src: panel2,
      label: 'Panel 2, present',
      alt: 'Panel 2 image target: the frame of a lodge over a dark tunnel, in blue and teal.',
    },
    {
      src: panel3,
      label: 'Panel 3, future',
      alt: 'Panel 3 image target: a dreamcatcher with red and yellow ribbons beside a spirit bird drawn in blue and red line.',
    },
  ],

  models: [],
  tags: ['image target', 'commission', 'triptych', 'two-eyed seeing'],
};
