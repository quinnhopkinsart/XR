import cover from './cover.jpg';
import polarBear from './targets/polar-bear.webp';
import eagle from './targets/eagle.webp';
import deer from './targets/deer.webp';
import lynx from './targets/lynx.webp';
import salmon from './targets/salmon.webp';
import polarBearModel from './models/polar-bear.glb?url';
import eagleModel from './models/eagle.glb?url';

// Rebuilt from the 8th Wall project "wildlife-ar" for the self-hosted engine. Its export held
// no scene code, so the scenes, models and images were recovered from the hosted app.
// Source and notes: the wildlife-ar-selfhosted project folder, README.md.
// The build opens in a 3D view of the five prints. ?view=ar runs the original camera AR,
// with all five targets live at once.
// The old link, 8th.io/997et, stops on February 28, 2027.

export default {
  title: 'Wildlife Portals XR',
  year: '2024 to 2025',
  kind: 'Augmented reality',
  categories: ['image-target', '3d'],
  status: 'live',
  venue: 'ROM After Dark, Royal Ontario Museum',
  location: 'Tkaronto',

  summary:
    'Five round prints open into the places a polar bear, an eagle, two deer, a lynx and salmon live, and a camera floats in front of you to take their picture.',

  description: [
    'Wildlife Portals is five round prints. Hold a phone to one and the picture opens like a window. Through it is the place its animal lives: a polar bear on the sea ice through a ship\'s porthole, an eagle at a lake through a ring of branches, two deer in the woods and a lynx in the snow from a photographer\'s blind, and salmon over a riverbed of pale stones.',
    'I showed it at ROM After Dark in 2024 and 2025, during the museum\'s International Wildlife Photography Awards exhibition. It ran as a scavenger hunt. Visitors went looking through the natural history galleries for the five prints.',
    'A camera floats at the bottom of the screen. Tap it and it rises to your eye, the screen flashes, and the photo is yours to keep. I built it so anyone holding a phone gets to be the wildlife photographer, with the animals close enough to frame.',
  ],

  bookable:
    'Wildlife Portals is available for events. I can set up the five prints as a scavenger hunt in your space, the way it ran at the ROM.',

  howTo: [
    'Press Enter in the frame above. The prints open in a 3D view on any device.',
    'Choose an animal with the buttons along the bottom. Drag to look into the portal from the side. On a phone, drag or tap Tilt.',
    'Tap the camera, or Take photo, to take a picture. Download it from the preview.',
    'For AR, print one of the targets below or open it on another screen. Tap AR at the top right on a phone and point your camera at the print.',
  ],

  embedNote: 'Press Enter, choose an animal and tap the camera to take a photo. On a phone, tap AR to open the camera.',

  credits: [
    { role: 'Artwork and AR', name: 'Quinn Hopkins' },
  ],

  // embed: the 3D view plays inside the work page, with a full-screen link beside it.
  // Framed, the AR button opens the camera in a new tab (WPX_FRAMED in the build).
  launch: { type: 'build', path: '/builds/wildlife-portals-xr/index.html', embed: true },

  cover,
  coverAlt:
    'A polar bear stands on an ice floe in open water while a gull flies past, seen through a brass ship\'s porthole on a dark green wall.',
  targets: [
    {
      src: polarBear,
      label: 'Polar bear',
      alt: 'Image target, a round print: a polar bear on an ice floe in open water, icebergs behind it under a bright sky.',
    },
    {
      src: eagle,
      label: 'Eagle',
      alt: 'Image target, a round print: a bald eagle holding a fish in its beak on a stony shore, a lake and dark pines behind it.',
    },
    {
      src: deer,
      label: 'Deer',
      alt: 'Image target, a round print: two deer face each other on a leafy forest floor under bare trees at dusk.',
    },
    {
      src: lynx,
      label: 'Lynx',
      alt: 'Image target, a round print: a lynx walks across deep snow between snow-covered pines under a starry sky.',
    },
    {
      src: salmon,
      label: 'Salmon',
      alt: 'Image target, a round print: salmon swim above a riverbed of pale stones and green water plants, light falling from the surface.',
    },
  ],

  // The polar bear and the eagle join the floating background.
  models: [
    { src: polarBearModel, recolor: '--black' },
    { src: eagleModel, recolor: '--black' },
  ],

  tags: ['image target', 'five targets', 'photo capture'],
};
