import panel1 from './targets/panel-1.jpg';
import panel2 from './targets/panel-2.jpg';
import panel3 from './targets/panel-3.jpg';

// First built as Two Eyed Seeing (8th Wall project "TwoEyedSeeing").
// The self-hosted build in public/builds/biidaaban/ is that project rebuilt with
// --output-public-path=./ and only the luminance images kept in image-targets/.
// It opens in a 3D carousel of the three panels with a Play button for each story
// (src/desktop/ in the source project). ?view=ar runs the original camera AR.

export default {
  title: 'Biidaaban',
  year: '2026',
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],
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
    'Press Enter in the frame above. The three panels open in a 3D view on any device.',
    'Use the arrows, the dots or a swipe to move from panel 1 to panel 3, past to present to future.',
    'Press Play the story under a panel to start its animation and narration. Turn up your volume or use headphones. CC turns captions on and off.',
    'On desktop, move your mouse to look inside. On a phone, tilt or drag.',
    'For AR, tap AR at the top right on a phone, then point your camera at a panel or at one of the targets below.',
  ],

  embedNote: 'Enter to explore. Play each panel\'s story, or on a phone tap AR to open the camera.',

  credits: [
    { role: 'Artists', name: 'Will Morin and Quinn Hopkins' },
    { role: 'Commissioned by', name: 'Arthur B. McDonald Canadian Astroparticle Physics Research Institute' },
    {
      role: 'In partnership with',
      name: 'Queen\'s University Office of Indigenous Initiatives and Department of Physics, Engineering Physics and Astronomy',
    },
  ],

  // embed: the 3D carousel plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (BII_FRAMED in the build).
  launch: { type: 'build', path: '/builds/biidaaban/index.html', embed: true },

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
