import cover from './cover.jpg';
import centralLeft from './targets/central-left.jpg';
import centralMiddle from './targets/central-middle.jpg';
import centralRight from './targets/central-right.jpg';
import sherwood from './targets/sherwood.jpg';
import erraticModel from './models/erratic.glb?url';

// Two 8th Wall Studio projects merged into one self-hosted build: "the-erratic-at-dunlop-gallery"
// (the three Central Branch walls, 8th.io/uh73x) and "the-erratics-sherwood" (8th.io/n2ree).
// Source and notes: the-erratics-selfhosted project folder, README.md. It runs on the Studio
// runtime like Biidaaban. The build opens in a 3D view of one wall at a time. ?view=ar runs the
// camera AR with all four targets live, and the wall the camera finds loads its own doorway.
// ?wall=central-left|central-middle|central-right|sherwood picks the first wall in either view.
// Both old links stop on February 28, 2027.

export default {
  title: 'The Erratics',
  year: '2025',
  kind: 'Augmented reality',
  status: 'live',
  // Off the home grid and the field until the models run smoothly on phones.
  // The page still opens at /xr/the-erratics for testing.
  hidden: true,
  venue: 'Dunlop Art Gallery, Regina Public Library',
  location: 'Central and Sherwood Village branches, Regina',

  summary:
    'Two library murals in Regina centre a glacial erratic, and a phone held to the wall opens a doorway where Coyote, Rabbit and Raven are already at work.',

  description: [
    'A glacial erratic is a stone that sits where it does not belong. Ice carried it across the land in the last ice age and left it behind when it melted. The Erratics puts one at the centre of two murals for the Dunlop Art Gallery in Regina: one at the Central Branch of the Regina Public Library, spread over three walls, and one at the Sherwood Village Branch.',
    'Hold a phone to a wall and a doorway opens in it. Through it the erratic sits in prairie grass while a tornado turns on the horizon and bison cross in front of it. Coyote, Rabbit and Raven move around the stone. All three are tricksters, with countless stories told about them across Turtle Island, most of them about trouble they started.',
    'Each wall opens its own doorway, so Central has three and Sherwood has one. On this page they share one view. Pick a wall and look through.',
  ],

  howTo: [
    'Press Enter in the frame above. The murals open in a 3D view on any device.',
    'Choose a wall along the bottom: Left, Middle or Right at Central, or the Sherwood mural. Drag to look through the doorway from the side. On a phone, drag or tap Tilt.',
    'At either library, tap AR at the top right on a phone and point the camera at the mural. Each wall opens its own doorway when the camera finds it.',
    'Away from Regina, print one of the targets below or open it on another screen, then point the AR view at it.',
  ],

  embedNote: 'Press Enter and choose a wall. On a phone, tap AR to open the camera.',

  credits: [
    { role: 'Artwork and AR', name: 'Quinn Hopkins' },
    { role: 'Commissioned by', name: 'Dunlop Art Gallery, Regina Public Library' },
  ],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (ERR_FRAMED in the build).
  launch: { type: 'build', path: '/builds/the-erratics/index.html', embed: true },

  cover,
  coverAlt:
    'A 3D view of the Sherwood mural: an orange doorway opens in the painted wall onto prairie grass where a coyote and a rabbit stand, in front of a painted boulder, a glowing ring with a rabbit inside it and a bison by a broken brick column.',
  targets: [
    {
      src: centralLeft,
      label: 'Central, left wall',
      alt: 'Image target, Central Branch left wall: a pale boulder painted with red figures stands among birch trees in autumn, three glowing rings in the branches, a rabbit at its foot and orange triangles along the edges.',
    },
    {
      src: centralMiddle,
      label: 'Central, middle wall',
      alt: 'Image target, Central Branch middle wall: a rabbit sits on a boulder in front of a glowing ring of orange, purple and red, with a raven and a bison to the left and bison lifting into a tornado on the right.',
    },
    {
      src: centralRight,
      label: 'Central, right wall',
      alt: 'Image target, Central Branch right wall: a coyote stands in grass in front of a tall blue glacier holding a boulder, a brick column behind and an orange triangle overhead.',
    },
    {
      src: sherwood,
      label: 'Sherwood',
      alt: 'Image target, the Sherwood mural: a coyote howls beside a painted boulder where a rabbit sits inside a glowing ring, bison graze by a broken brick column and a raven flies across a dusk sky between pines.',
    },
  ],

  // The erratic itself joins the floating background.
  models: [{ src: erraticModel, recolor: '--black' }],

  tags: ['image target', 'four targets', 'two sites', 'portal'],
};
