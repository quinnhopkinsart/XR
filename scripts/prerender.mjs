// Runs after `vite build`. Writes a real HTML file for every address the app serves, so
// each one answers 200 with its own title, description and share picture:
//
//   dist/xr/<slug>/index.html   every work, hidden ones too (their pages still open)
//   dist/ar/<slug>/index.html   the old catalogue addresses, pointing at the work page
//   dist/admin/index.html       the dashboard, marked noindex
//   dist/share/<slug>.<ext>     each work's cover under a fixed name, for link previews
//   dist/sitemap.xml, dist/robots.txt
//
// Without these files Amplify falls back to index.html with a 404 status: the page shows
// in a browser, but search engines and link previews read it as missing. The React app
// still takes over on load; these files only change what is in the HTML before it does.
// An address with no file here (a mistyped slug) keeps its 404 and shows NotFound.jsx.

import { createServer } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const DIST = resolve('dist');
const START = '<!-- route:meta.';
const END = '<!-- /route:meta -->';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const template = readFileSync(resolve(DIST, 'index.html'), 'utf8');
const from = template.indexOf(START);
const to = template.indexOf(END);
if (from < 0 || to < 0) {
  console.error('prerender: index.html has lost its route:meta block');
  process.exit(1);
}
const before = template.slice(0, from);
const after = template.slice(to + END.length);

function page({ title, description, url, image, type = 'website', noindex = false, body = '' }) {
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${esc(url)}" />`,
    '<meta property="og:site_name" content="Noodin Studio XR" />',
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
  // Read by anything that does not run the app: the same words the page opens with.
  const html = before + head + after;
  return body ? html.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>${body}</noscript>`) : html;
}

function write(path, html) {
  const file = resolve(DIST, path);
  mkdirSync(resolve(file, '..'), { recursive: true });
  writeFileSync(file, html);
}

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});

let failed = false;
try {
  const { getProject, projects } = await server.ssrLoadModule('/src/projects/registry.js');
  const { site } = await server.ssrLoadModule('/src/brand/site.js');

  const slugs = readdirSync(resolve('src/projects'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);
  const works = slugs.map((s) => getProject(s)).filter(Boolean);
  const listed = new Set(projects.map((p) => p.slug));
  const fallbackImage = `${site.url}/share.jpg`;

  // A cover is either a file in the repository (Vite hands back its /src path here) or
  // a picture in the portfolio's Wix media library, which Wix can crop to the preview size.
  const shareImage = (p) => {
    if (!p.cover) return fallbackImage;
    if (/^https?:\/\//.test(p.cover)) {
      return p.cover.replace(/\/v1\/fit\/[^/]+\//, '/v1/fill/w_1200,h_630,al_c,q_85/');
    }
    const source = resolve(p.cover.replace(/^\//, '').split('?')[0]);
    if (!existsSync(source)) return fallbackImage;
    const name = `share/${p.slug}${extname(source).toLowerCase()}`;
    mkdirSync(resolve(DIST, 'share'), { recursive: true });
    copyFileSync(source, resolve(DIST, name));
    return `${site.url}/${name}`;
  };

  for (const p of works) {
    const url = `${site.url}${site.workPath}/${p.slug}/`;
    const image = shareImage(p);
    const body = [
      `<h1>${esc(p.title)}</h1>`,
      `<p>${esc([p.kind, p.year, p.venue].filter(Boolean).join(', '))}</p>`,
      ...p.description.map((para) => `<p>${esc(para)}</p>`),
      `<p><a href="${site.url}/">All works on ${esc(site.title)}</a></p>`,
    ].join('');
    const html = page({
      title: `${p.title} | ${site.title}`,
      description: p.summary,
      url,
      image,
      type: 'article',
      noindex: !listed.has(p.slug),
      body,
    });
    write(`${site.workPath.slice(1)}/${p.slug}/index.html`, html);
    // /ar/<slug> redirects to the work page in the app; its file names the work page as
    // the address to keep.
    write(`ar/${p.slug}/index.html`, html);
  }

  write(
    'admin/index.html',
    page({
      title: `Dashboard | ${site.title}`,
      description: 'The dashboard for Noodin Studio XR.',
      url: `${site.url}/admin/`,
      image: fallbackImage,
      noindex: true,
    }),
  );

  // The home page keeps the block index.html ships with, plus the list of works as text.
  const homeBody = [
    `<h1>${esc(site.title)}</h1>`,
    '<ul>',
    ...projects.map(
      (p) => `<li><a href="${site.url}${site.workPath}/${p.slug}/">${esc(p.title)}</a>: ${esc(p.summary)}</li>`,
    ),
    '</ul>',
  ].join('');
  writeFileSync(
    resolve(DIST, 'index.html'),
    template.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>${homeBody}</noscript>`),
  );

  const urls = [`${site.url}/`, ...projects.map((p) => `${site.url}${site.workPath}/${p.slug}/`)];
  writeFileSync(
    resolve(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  writeFileSync(
    resolve(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${site.url}/sitemap.xml\n`,
  );

  console.log(`prerender: ${works.length} work page(s), ${urls.length} address(es) in sitemap.xml`);
} catch (e) {
  failed = true;
  console.error('prerender failed:', e);
} finally {
  await server.close();
}

process.exit(failed ? 1 : 0);
