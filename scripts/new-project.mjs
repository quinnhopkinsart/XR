// Usage: npm run new -- "Project Title" [--year 2027] [--build]
//   --build  sets the work up for a self-hosted 8th Wall build in public/builds/<slug>/
//            instead of a React component.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : undefined;
};

const title = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--year');
if (!title) {
  console.error('Usage: npm run new -- "Project Title" [--year 2027] [--build]');
  process.exit(1);
}

const slug = title
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
const year = option('year') || String(new Date().getFullYear());
const dir = join('src', 'projects', slug);

if (existsSync(dir)) {
  console.error(`${dir} already exists.`);
  process.exit(1);
}

cpSync(join('src', 'projects', '_template'), dir, { recursive: true });

const file = join(dir, 'project.js');
let src = readFileSync(file, 'utf8')
  .replaceAll('__TITLE__', title.replace(/'/g, "\\'"))
  .replaceAll('__YEAR__', year)
  .replaceAll('__SLUG__', slug);

if (flag('build')) {
  rmSync(join(dir, 'Experience.jsx'));
  src = src.replace(
    "launch: { type: 'component', load: () => import('./Experience.jsx') },",
    `launch: { type: 'build', path: '/builds/${slug}/index.html' },`,
  );
  const buildDir = join('public', 'builds', slug);
  mkdirSync(buildDir, { recursive: true });
  writeFileSync(join(buildDir, '.gitkeep'), '');
}

writeFileSync(file, src);

console.log(`Created ${dir}/`);
if (flag('build')) console.log(`Copy the 8th Wall build output into public/builds/${slug}/`);
console.log(`Edit ${file}, then run npm run dev and open /xr/${slug}`);
