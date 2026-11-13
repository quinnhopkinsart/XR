// The cover is the same render the portfolio (noodinstudio.com) uses for this work, read
// straight from the Wix media library, sized by Wix. If that file is ever deleted or
// replaced there, this card loses its picture: put the new file name here.
const cover =
  'https://static.wixstatic.com/media/c993bc_f8e12a449c024ec3bfb66b3075fd60f2~mv2.jpg/v1/fit/w_1600,h_1600,q_85,enc_auto/c993bc_f8e12a449c024ec3bfb66b3075fd60f2~mv2.jpg';

// A design model of a suspended sculpture, not an AR work: there is no camera view.
// The build in public/builds/aabijijiwan/ is a three.js viewer with the sculpture hung in
// a rebuilt atrium of the recreation centre, a 1.7 m figure for scale, and the visitor
// walking the Level 2 lounge under it.
// The installed size and the clearance above the floor are FOOTPRINT and CLEARANCE in the
// build's main.js: 8 m long, 8 m tall, 2 m wide, lowest point 5 m up.
//
// Listed on the home grid since November 13, 2026, on Quinn's call. The description names
// Kaswentha, the Two Row Wampum belt, at his request.

export default {
  title: 'Aabijijiwan',
  year: '2026',
  kind: 'Suspended sculpture',
  categories: ['3d'],
  status: 'in-development',
  venue: 'John Innes Community Recreation Centre',
  location: 'Moss Park, Tkaronto',

  summary:
    'One river at five moments in its life, hung as five layers of wood and mirror that run side by side like the rows of Kaswentha, the Two Row Wampum belt. Walk underneath it.',

  description: [
    'Aabijijiwan is Anishinaabemowin for "it flows continuously." The sculpture is one river shown at five moments in its life, hung as five layers of CNC-cut wood. The youngest moment hangs highest, its channel almost straight. By the lowest layer the bends have grown until the river is two-thirds longer than where it began.',
    'The five channels run parallel through a shared space and never touch, the way the two rows do on Kaswentha, the Two Row Wampum belt. Set into each one is a line of mirror tiles, like the beads of the belt, clear on one layer and purple on the next.',
    'CNC-cut plywood, acrylic mirror, steel and steel cable, suspended in the atrium. This is the design model, Rev E.',
  ],

  howTo: [
    'Drag to look around. You start in the Level 2 lounge with the sculpture overhead, so look up.',
    'Tap or click the floor to walk there, or use the arrow keys or WASD.',
    'Use the buttons to stand in the lounge, underneath, in the corridor, at the Level 3 glazing, on the Level 4 track, or far down the atrium.',
    'The figure under the work is 1.7 m tall.',
  ],

  embedNote: 'Drag to look. Tap the floor to walk under the sculpture.',

  credits: [{ role: 'Commissioned by', name: 'City of Toronto' }],

  // embed: the viewer plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/aabijijiwan/index.html', embed: true },

  cover,
  coverAlt:
    'Render looking up an atrium of wood slats and windows at a suspended sculpture of five layered, meandering wooden channels with purple and clear mirror inlays.',

  models: [],
  tags: ['public art', 'sculpture', 'design model'],
};
