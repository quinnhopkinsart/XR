// The shape every work follows: project.js (images, launch, targets, models) merged
// with content.json (text, status, the hidden flag) from the same folder.
// Full field guide: docs/ADDING-A-PROJECT.md

// The fields that live in content.json, in the order the dashboard (/admin) writes them.
// Anything listed here is edited there and must not be set in project.js.
export const CONTENT_FIELDS = [
  'title',
  'year',
  'status',
  'hidden',
  'venue',
  'location',
  'summary',
  'description',
  'howTo',
  'embedNote',
  'bookable',
  'credits',
  'coverAlt',
  'tags',
  'order',
];

export const STATUSES = {
  live: 'Live',
  migrating: 'Moving to self-hosting',
  'in-development': 'In development',
  archived: 'Archived',
};

// How a work is experienced. A work can hold more than one. The order here is the
// order of the filter buttons and of the tags on a card. `tone` names a --tag-* token.
export const CATEGORIES = {
  'image-target': { label: 'Image target', tone: 'purple' },
  'world-tracking': { label: 'World tracking', tone: 'green' },
  '3d': { label: '3D', tone: 'teal' },
};

export const LAUNCH_TYPES = ['build', 'external', 'component'];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isText = (v) => typeof v === 'string';
const isTextList = (v) => Array.isArray(v) && v.every((x) => isText(x) && x.trim());

/**
 * Problems with the content.json fields of one work, as short messages. Empty list
 * means valid. The dashboard runs this before it publishes, and `npm run check` runs
 * it again before every build, so a bad edit never reaches the live site.
 */
export function contentProblems(c) {
  const errors = [];
  if (!isText(c.title) || !c.title.trim()) errors.push('missing title');
  if (!isText(c.year) || !/^\d{4}/.test(c.year)) errors.push('year must start with four digits, like "2026" or "2024 to 2025"');
  if (!isText(c.summary) || !c.summary.trim()) errors.push('missing summary (one sentence for the card)');
  if (!isTextList(c.description) || c.description.length === 0) {
    errors.push('description must be an array of paragraphs');
  }
  if (c.status != null && !STATUSES[c.status]) {
    errors.push(`status "${c.status}" must be one of ${Object.keys(STATUSES).join(', ')}`);
  }
  if (c.hidden != null && typeof c.hidden !== 'boolean') errors.push('hidden must be true or false');
  if (c.howTo != null && !isTextList(c.howTo)) errors.push('howTo must be an array of steps');
  if (c.tags != null && !isTextList(c.tags)) errors.push('tags must be an array of words');
  ['venue', 'location', 'embedNote', 'coverAlt'].forEach((k) => {
    if (c[k] != null && !isText(c[k])) errors.push(`${k} must be text`);
  });
  if (c.bookable != null && !isText(c.bookable)) {
    errors.push('bookable must be a sentence (the page adds a "Get in touch" link)');
  }
  if (c.credits != null) {
    if (!Array.isArray(c.credits) || !c.credits.every((x) => isText(x?.role) && x.role.trim() && isText(x?.name) && x.name.trim())) {
      errors.push('each credit needs a role and a name');
    }
  }
  if (c.order != null && typeof c.order !== 'number') errors.push('order must be a number');
  return errors;
}

/**
 * Returns a list of problems with one project. Empty list means valid.
 * Used at runtime (dev warnings) and by `npm run check` before every build.
 */
export function validateProject(p, folder) {
  const errors = [];
  const where = `src/projects/${folder}/project.js`;

  if (!p || typeof p !== 'object') return [`${where}: no default export`];
  if (!SLUG.test(p.slug)) errors.push(`${where}: slug "${p.slug}" must be lowercase-with-dashes`);
  contentProblems(p).forEach((m) => errors.push(`src/projects/${folder}/content.json: ${m}`));
  if (p.launch) {
    const { type } = p.launch;
    if (!LAUNCH_TYPES.includes(type)) {
      errors.push(`${where}: launch.type "${type}" must be one of ${LAUNCH_TYPES.join(', ')}`);
    }
    if (type === 'build' && !p.launch.path) errors.push(`${where}: launch.path is required for type "build"`);
    if (type === 'external' && !/^https:\/\//.test(p.launch.url || '')) {
      errors.push(`${where}: launch.url must be an https:// address (cameras need HTTPS)`);
    }
    if (type === 'component' && typeof p.launch.load !== 'function') {
      errors.push(`${where}: launch.load must be () => import('./Experience.jsx')`);
    }
    if (p.launch.embed && type !== 'build') {
      errors.push(`${where}: launch.embed only works with type "build"`);
    }
  }
  if (p.portfolio != null && !SLUG.test(p.portfolio)) {
    errors.push(`${where}: portfolio "${p.portfolio}" must be the work's slug on the portfolio, lowercase-with-dashes`);
  }
  if (p.award) {
    if (!p.award.label) errors.push(`${where}: award.label is required (it is the logo's alt text)`);
    if (!p.award.logoOnDark) {
      errors.push(`${where}: award.logoOnDark is required (the card badge is a black panel)`);
    }
  }
  if (!Array.isArray(p.categories)) {
    errors.push(`${where}: categories must be an array`);
  } else {
    p.categories.forEach((c) => {
      if (!CATEGORIES[c]) {
        errors.push(`${where}: category "${c}" must be one of ${Object.keys(CATEGORIES).join(', ')}`);
      }
    });
  }
  if (!Array.isArray(p.models)) {
    errors.push(`${where}: models must be an array`);
  } else {
    p.models.forEach((m, i) => {
      if (!m?.src) errors.push(`${where}: models[${i}] needs a src (import x from './models/x.glb?url')`);
      if (m?.turn != null && typeof m.turn !== 'number') {
        errors.push(`${where}: models[${i}].turn must be a number of degrees`);
      }
      if (m?.recolor && !String(m.recolor).startsWith('--')) {
        errors.push(`${where}: models[${i}].recolor must name a token like '--black'`);
      if (m?.foreground != null && (!Array.isArray(m.foreground) || !m.foreground.every((n) => typeof n === 'string' && n.trim()) || !m.split)) {
        errors.push(`${where}: models[${i}].foreground must be a list of mesh names, on a split model`);
      }
      }
    });
  }
  return errors;
}

/** Fills defaults so components never have to guard against missing fields. */
export function normalizeProject(raw, folder) {
  return {
    slug: folder,
    status: 'live',
    kind: 'Augmented reality',
    credits: [],
    howTo: [],
    targets: [],
    models: [],
    categories: [],
    tags: [],
    order: 0,
    award: null,
    portfolio: null,
    bookable: null,
    hidden: false,
    ...raw,
  };
}
