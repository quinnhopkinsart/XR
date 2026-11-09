// Validates every src/projects/*/project.js before a build.
// Loads the registry through Vite so image imports and import.meta.glob work
// exactly as they do in the browser.

import { createServer } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});

let failed = false;
try {
  const { projects, problems } = await server.ssrLoadModule('/src/projects/registry.js');
  const errors = [...problems];

  const seen = new Map();
  for (const p of projects) {
    if (seen.has(p.slug)) errors.push(`duplicate slug "${p.slug}" in ${seen.get(p.slug)} and ${p.title}`);
    seen.set(p.slug, p.title);

    if (p.launch?.type === 'build') {
      const file = resolve('public', p.launch.path.replace(/^\//, ''));
      if (!existsSync(file)) errors.push(`${p.slug}: launch.path ${p.launch.path} not found in public/`);
    }
  }

  if (errors.length) {
    failed = true;
    console.error(`\n${errors.length} problem(s) in src/projects:\n`);
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('');
  } else {
    console.log(`${projects.length} project(s) OK: ${projects.map((p) => p.slug).join(', ')}`);
  }
} finally {
  await server.close();
}

process.exit(failed ? 1 : 0);
