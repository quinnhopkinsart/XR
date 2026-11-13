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

// Text, status and the hidden flag live in content.json beside this file.
export default {
  // This work's page on the portfolio: noodinstudio.com/project.html?slug=<this>.
  portfolio: 'aabijijiwan',

  kind: 'Suspended sculpture',
  categories: ['3d'],

  // embed: the viewer plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/aabijijiwan/index.html', embed: true },

  cover,

  models: [],
};
