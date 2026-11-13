import panel1 from './targets/panel-1.jpg';
import panel2 from './targets/panel-2.jpg';
import panel3 from './targets/panel-3.jpg';

// First built as Two Eyed Seeing (8th Wall project "TwoEyedSeeing").
// The self-hosted build in public/builds/biidaaban/ is that project rebuilt with
// --output-public-path=./ and only the luminance images kept in image-targets/.
// It opens in a 3D carousel of the three panels with a Play button for each story
// (src/desktop/ in the source project). ?view=ar runs the original camera AR.

// Text, status and the hidden flag live in content.json beside this file.
export default {
  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: 'biidaaban',

  kind: 'Augmented reality',
  categories: ['image-target', '3d'],

  // embed: the 3D carousel plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (BII_FRAMED in the build).
  launch: { type: 'build', path: '/builds/biidaaban/index.html', embed: true },

  cover: panel2,
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
};
