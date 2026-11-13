import cover from './cover.jpg';

// A design model of a suspended sculpture, not an AR work: there is no camera view.
// The build in public/builds/aabijijiwan/ is a three.js viewer with the sculpture hung
// from a ceiling, a 1.7 m figure for scale, and the visitor walking the floor under it.
// The clearance above the floor is CLEARANCE in the build's main.js.
//
// hidden: true until the work is ready to be public. The viewer's README lists what is
// still open: the knowledge keeper review of the Kaswentha wording and the speaker
// check on the title.

export default {
  title: 'Aabijijiwan',
  year: '2026',
  kind: 'Suspended sculpture',
  categories: ['3d'],
  status: 'in-development',
  venue: 'John Innes Community Recreation Centre',
  location: 'Moss Park, Tkaronto',
  hidden: true,

  summary:
    'One river at five moments in its life, hung as five layers of wood and mirror. Walk underneath it.',

  description: [
    'Aabijijiwan is Anishinaabemowin for "it flows continuously." The sculpture is one river shown at five moments in its life, hung as five layers of CNC-cut wood. The youngest moment hangs highest, its channel almost straight. By the lowest layer the bends have grown until the river is two-thirds longer than where it began.',
    'The five channels run parallel through a shared space and never touch, the way the two rows do. Set into each one is a line of mirror tiles, like beads on a belt, clear on one layer and purple on the next.',
    'CNC-cut plywood, acrylic mirror, steel and steel cable, suspended in the atrium. This is the design model, Rev E.',
  ],

  howTo: [
    'Drag to look around. The sculpture hangs from the ceiling, so look up.',
    'Tap or click the floor to walk there, or use the arrow keys or WASD.',
    'Use the buttons to stand at the approach, underneath, alongside, end on, or above.',
    'The figure under the work is 1.7 m tall.',
  ],

  embedNote: 'Drag to look. Tap the floor to walk under the sculpture.',

  credits: [{ role: 'Commissioned by', name: 'City of Toronto' }],

  // embed: the viewer plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/aabijijiwan/index.html', embed: true },

  cover,
  coverAlt:
    'Five wavy wooden channels inlaid with clear and purple mirror tiles, hanging on thin cables from a ceiling panel, seen from below.',

  models: [],
  tags: ['public art', 'sculpture', 'design model'],
};
