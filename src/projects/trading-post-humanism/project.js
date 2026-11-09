import cover from './cover.jpg';
import thunderbird from './targets/thunderbird.jpg';
import shaman from './targets/shaman.jpg';
import thunderbirdModel from './models/thunderbird.glb?url';
import hyperWoodlandModel from './models/hyper-woodland.glb?url';
import shamanPortalModel from './models/shaman-portal.glb?url';

export default {
  title: 'Trading Post Humanism',
  year: '2026',
  kind: 'Augmented reality',
  status: 'live',
  venue: 'Worth Gallery',
  location: 'Tkaronto',

  summary: 'Two lightbox works open into augmented reality, Thunderbird and Shaman, at Worth Gallery.',

  // Description as published on noodinstudio.com/work/trading-post-humanism
  description: [
    'Trading Post Humanism gathers a body of work that moves through joy, culture, pain, anxiety, and connection, and places each piece beside the question of what it costs.',
    'Every work in the show carries a beaded price tag, hand-stitched on deer hide, hanging from the piece as part of it. The tag is not separate from the artwork. It is the artwork acknowledging the room it has entered: a market that has long set terms for Indigenous makers, sorted ceremony from craft, and assigned value through frames built elsewhere. The trading post is the historical shorthand for that arrangement. The beadwork is the older, slower economy it tried to replace.',
    'The title also points toward posthumanism, the contemporary turn that decentres the human and recognizes agency, kinship, and personhood in animals, plants, land, technology, and spirit. Indigenous worldviews have held this understanding for far longer than the term has existed. Anishinaabe thought does not place the human at the top of a hierarchy. It situates us inside a web of relations with other beings, human and non-human, seen and unseen. The work in this show draws from that framework. The serpents, the lodges, the lightboxes, the figures studded with stone and shell are not metaphors for human experience. They are relatives, presences, and forces with their own standing.',
    'The paintings, prints, and lightboxes range across interior and shared experience. Some sit with grief and mental health. Some hold humour, ceremony, and the steady work of relation. Read together, they refuse the split between the personal and the political, and ask the viewer to hold both at once: the figure on the wall, and the number on the tag.',
  ],

  howTo: [
    'Press Enter in the frame above. It opens in a 3D view on any device.',
    'On desktop, move your mouse to look inside and scroll to the next artwork.',
    'On a phone, tap AR at the top right. The camera opens in a new tab.',
    'Point your phone at the Thunderbird or Shaman piece, or at one of the targets below.',
  ],

  credits: [
    { role: 'Presented at', name: 'Worth Gallery' },
    { role: 'With', name: 'JL Phillips Gallery and Highness' },
  ],

  // embed: the build plays inside the work page, with a full-screen link beside it.
  launch: { type: 'build', path: '/builds/trading-post-humanism/index.html', embed: true },

  // Pieces this work adds to the floating background on every page.
  models: [
    { src: thunderbirdModel, hero: true, recolor: '--purple' },
    { src: hyperWoodlandModel, split: true, exclude: ['backdrop'] },
    { src: shamanPortalModel, split: true, exclude: ['disc'] },
  ],

  cover,
  coverAlt:
    'Billboard reading Noodin Studio, Trading Post Humanism, Worth Gallery, June 9, 2026, standing on a rock outcrop under a blue sky.',
  targets: [
    { src: thunderbird, label: 'Thunderbird', alt: 'Thunderbird lightbox artwork, image target' },
    { src: shaman, label: 'Shaman', alt: 'Shaman collectible artwork, image target' },
  ],
  tags: ['image target', 'solo exhibition', 'lightbox'],
};
