// Every folder in src/projects/ with a project.js becomes a page.
// Folders starting with "_" (like _template) are ignored.
// Nothing else needs editing to add a work.

import { CATEGORIES, normalizeProject, validateProject } from './schema.js';

const modules = import.meta.glob(['./*/project.js', '!./_*/project.js'], { eager: true });

const loaded = Object.entries(modules).map(([path, mod]) => {
  const folder = path.split('/')[1];
  const project = normalizeProject(mod.default, folder);
  const errors = validateProject(project, folder);
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

export const allKinds = [...new Set(projects.map((p) => p.kind))].sort();

// Categories in use by listed works, in the order schema.js sets.
export const allCategories = Object.keys(CATEGORIES).filter((c) =>
  projects.some((p) => p.categories.includes(c)),
);
