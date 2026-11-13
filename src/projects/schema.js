// The shape every project.js default export follows.
// Full field guide: docs/ADDING-A-PROJECT.md

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

/**
 * Returns a list of problems with one project. Empty list means valid.
 * Used at runtime (dev warnings) and by `npm run check` before every build.
 */
export function validateProject(p, folder) {
  const errors = [];
  const where = `src/projects/${folder}/project.js`;

  if (!p || typeof p !== 'object') return [`${where}: no default export`];
  if (!SLUG.test(p.slug)) errors.push(`${where}: slug "${p.slug}" must be lowercase-with-dashes`);
  if (!p.title) errors.push(`${where}: missing title`);
  if (!p.year) errors.push(`${where}: missing year`);
  if (!p.summary) errors.push(`${where}: missing summary (one sentence for the card)`);
  if (!Array.isArray(p.description) || p.description.length === 0) {
    errors.push(`${where}: description must be an array of paragraphs`);
  }
  if (p.status && !STATUSES[p.status]) {
    errors.push(`${where}: status "${p.status}" must be one of ${Object.keys(STATUSES).join(', ')}`);
  }
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
  if (p.bookable != null && typeof p.bookable !== 'string') {
    errors.push(`${where}: bookable must be a sentence (the page adds a "Get in touch" link)`);
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
  if (typeof p.hidden !== 'boolean') errors.push(`${where}: hidden must be true or false`);
  if (!Array.isArray(p.models)) {
    errors.push(`${where}: models must be an array`);
  } else {
    p.models.forEach((m, i) => {
      if (!m?.src) errors.push(`${where}: models[${i}] needs a src (import x from './models/x.glb?url')`);
      if (m?.recolor && !String(m.recolor).startsWith('--')) {
        errors.push(`${where}: models[${i}].recolor must name a token like '--black'`);
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
    bookable: null,
    hidden: false,
    ...raw,
  };
}
