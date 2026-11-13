// The seven teachings. This table is the one place the words live.
//
// `word`, `english` and `gloss` are from Quinn's wall text for the installation
// (sacred_tags_wall_text_v7.md, MUTEK 2026). The TouchDesigner file's Anishinaabemowin
// tag art uses other spellings for three of them (Dabaadendiziwin, Aakode'ewin,
// Minaadendamowin). Change them here and everything follows: the rock, the caption,
// the buttons and the screen reader text.
//
// `tag` is the centre of the English tag on the container, as a fraction of the
// picture from its top left. `word` sits on the rock at `at`, the relative at `mark`
// (`w` is the relative's width as a fraction of the picture's width). `open` is the
// centre and the half size of the opening that shows both.

export const ASPECT = 5808 / 2468; // the container picture, width over height

export const TEACHINGS = [
  {
    id: 'honesty', english: 'honesty', word: 'Gwayakwaadiziwin', relative: 'raven', img: 'raven.png',
    gloss: 'Gwayak, correctly and straightly. Aadizi, he or she lives. To live correctly.',
    tag: [0.19, 0.125], at: [0.165, 0.115], mark: [0.165, 0.33], w: 0.075,
    open: [0.165, 0.22, 0.15, 0.24],
  },
  {
    id: 'humility', english: 'humility', word: 'Dabasendiziwin', relative: 'wolf', img: 'wolf.png',
    gloss: 'Dabas, low. End, pertaining to thought. Izi, a state. To think lower of yourself in relation to all that sustains you.',
    tag: [0.375, 0.12], at: [0.405, 0.1], mark: [0.405, 0.275], w: 0.125,
    open: [0.405, 0.19, 0.13, 0.21],
  },
  {
    id: 'wisdom', english: 'wisdom', word: 'Nibwaakaawin', relative: 'beaver', img: 'beaver.png',
    gloss: 'Ni, the soul within. Waa, pertaining to sight. Kaa, an abundance. To live with vision.',
    tag: [0.62, 0.13], at: [0.64, 0.115], mark: [0.64, 0.3], w: 0.125,
    open: [0.64, 0.2, 0.125, 0.22],
  },
  {
    id: 'love', english: 'love', word: "Zaagi'idiwin", relative: 'eagle', img: 'eagle.png',
    gloss: 'Zaag, to emerge, to flow out. Idi, in a reciprocal way. Love flowing both directions, between humans and everything that is not human.',
    tag: [0.3, 0.925], at: [0.29, 0.9], mark: [0.29, 0.7], w: 0.105,
    open: [0.29, 0.8, 0.115, 0.22],
  },
  {
    id: 'truth', english: 'truth', word: 'Debwewin', relative: 'turtle', img: 'turtle.png',
    gloss: 'Deb, to a certain extent. We, sound through speech. To speak only to the extent you have lived it.',
    tag: [0.57, 0.905], at: [0.525, 0.9], mark: [0.525, 0.69], w: 0.075,
    open: [0.525, 0.79, 0.095, 0.23],
  },
  {
    id: 'bravery', english: 'bravery', word: "Zoongide'ewin", relative: 'bear', img: 'bear.png',
    gloss: "Zoongi, solid, strong. De'e, a form of heart. To live with a solid, strong heart.",
    tag: [0.75, 0.91], at: [0.735, 0.915], mark: [0.725, 0.72], w: 0.09,
    open: [0.73, 0.81, 0.11, 0.21],
  },
  {
    id: 'respect', english: 'respect', word: "Manaaji'idiwin", relative: 'bison', img: 'bison.png',
    gloss: 'Manaaji, to go easy on someone. Idi, in a reciprocal way. To go easy on one another and on all of Creation.',
    tag: [0.94, 0.825], at: [0.885, 0.74], mark: [0.9, 0.53], w: 0.1,
    open: [0.89, 0.63, 0.105, 0.22],
  },
];
