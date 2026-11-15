// Beaded Flowers: beadwork by Robyn Adams, modelled in 3D by Quinn Hopkins. A collaboration,
// so her name stays on its credits and text.
//
// Not an AR work: there is no camera view. The build in public/builds/beaded-flowers/ is a
// three.js viewer with two views: a field of the flowers to walk through, and each flower
// on its own with a few lines about it (the text is in the build's flowers.js).
//
// The cover is Quinn's Blender render of the bead meadow.
import cover from './cover.jpg';

// Text, status and the hidden flag live in content.json beside this file.
export default {
  kind: '3D environment',
  categories: ['3d'],

  // embed: the viewer plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/beaded-flowers/index.html', embed: true },

  cover,

  // No models for the floating background: Quinn curates the field, so ask before adding any.
};
