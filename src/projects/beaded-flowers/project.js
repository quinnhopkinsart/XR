// Beaded Flowers: beadwork by Robyn Adams, modelled in 3D by Quinn Hopkins. A collaboration,
// so her name stays on its credits and text.
//
// Not an AR work: there is no camera view. The build in public/builds/beaded-flowers/ is a
// three.js viewer with two views: a field of the flowers to walk through, and each flower
// on its own with a few lines about it (the text is in the build's flowers.js).
//
// The cover is Quinn's Blender render of the bead meadow.
import cover from './cover.jpg';

// The floating background shows the flowers too, lightly scattered among the sculptures,
// at Quinn's request (November 14, 2026). One small .glb per flower, each with its bead
// picture and normal map inside, made from the viewer's files by
// scripts/beaded-flowers/build_field_models.py.
import asters from './models/asters.glb?url';
import coneflowers from './models/coneflowers.glb?url';
import wildRice from './models/wild-rice.glb?url';
import blueberry from './models/blueberry.glb?url';
import prairieCrocus from './models/prairie-crocus.glb?url';
import wolfWillow from './models/wolf-willow.glb?url';
import tableFlowers from './models/table-flowers.glb?url';
import spray from './models/spray.glb?url';

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: '3D environment',
  categories: ['3d'],

  // embed: the viewer plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/beaded-flowers/index.html', embed: true },

  cover,

  // The making-of: the story of how the flowers were built, after the description on the work
  // page (MakingOf.jsx, with its pictures and loops in making-of/). Loaded only on this page.
  makingOf: () => import('./MakingOf.jsx'),

  // scatter: small, upright, spread lightly down the page instead of standing as one large
  // sculpture. In the landing page's free camera they have no zone of their own: the same
  // flowers are planted as a bed along the tour's line (`BED` in src/field/field.js).
  models: [asters, coneflowers, wildRice, blueberry, prairieCrocus, wolfWillow, tableFlowers, spray].map((src) => ({
    src,
    scatter: true,
  })),
};
