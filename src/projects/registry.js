// Every folder in src/projects/ with a project.js becomes a page.
// Folders starting with "_" (like _template) are ignored.
// Nothing else needs editing to add a work.

import { normalizeProject, validateProject } from './schema.js';

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
export const projects = loaded
  .map((l) => l.project)
  .sort(
    (a, b) =>
      String(b.year).localeCompare(String(a.year)) ||
      b.order - a.order ||
      a.title.localeCompare(b.title),
  );

export const getProject = (slug) => projects.find((p) => p.slug === slug);

export const allKinds = [...new Set(projects.map((p) => p.kind))].sort();
