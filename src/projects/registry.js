// Every folder in src/projects/ with a project.js becomes a page.
// content.json in the same folder holds the text, status and hidden flag
// (CONTENT_FIELDS in schema.js); the dashboard at /admin edits it.
// Folders starting with "_" (like _template) are ignored.
// Nothing else needs editing to add a work.

import { CATEGORIES, CONTENT_FIELDS, normalizeProject, validateProject } from './schema.js';

const modules = import.meta.glob(['./*/project.js', '!./_*/project.js'], { eager: true });

const contents = import.meta.glob(['./*/content.json', '!./_*/content.json'], {
  eager: true,
  import: 'default',
});

const loaded = Object.entries(modules).map(([path, mod]) => {
  const folder = path.split('/')[1];
  const content = contents[`./${folder}/content.json`];
  const project = normalizeProject({ ...mod.default, ...content }, folder);
  const errors = validateProject(project, folder);
  if (!content) errors.push(`src/projects/${folder}/content.json: file missing`);
  // One home for each field: text set in project.js would be invisible to the dashboard.
  CONTENT_FIELDS.filter((k) => mod.default && k in mod.default).forEach((k) =>
    errors.push(`src/projects/${folder}/project.js: move "${k}" into content.json`),
  );
  if (errors.length && import.meta.env.DEV) errors.forEach((e) => console.warn(e));
  return { project, errors };
});

export const problems = loaded.flatMap((l) => l.errors);

// Newest first. Within a year, higher `order` comes first, then title.
const all = loaded
  .map((l) => l.project)
  .sort(
    (a, b) =>
      String(b.year).localeCompare(String(a.year)) ||
      b.order - a.order ||
      a.title.localeCompare(b.title),
  );

// Listed works: the home grid, the filters and the floating background.
// A work with `hidden: true` stays out of all three, but its page still opens at /xr/<slug>.
export const projects = all.filter((p) => !p.hidden);

export const getProject = (slug) => all.find((p) => p.slug === slug);


// Categories in use by listed works, in the order schema.js sets.
export const allCategories = Object.keys(CATEGORIES).filter((c) =>
  projects.some((p) => p.categories.includes(c)),
);
