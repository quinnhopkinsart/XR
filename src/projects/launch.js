import { site } from '../brand/site.js';

/**
 * Where the Launch button sends people.
 *  build     -> a self-hosted 8th Wall (or any static) build in public/builds/<slug>/
 *  external  -> an experience hosted elsewhere (8th.io until Feb 28 2027, a subdomain, STYLY)
 *  component -> a React experience inside this repo, opened full screen
 */
export function launchHref(project) {
  const { launch, slug } = project;
  if (!launch) return null;
  if (launch.type === 'build') return launch.path;
  if (launch.type === 'external') return launch.url;
  if (launch.type === 'component') return `${site.workPath}/${slug}/launch`;
  return null;
}

/**
 * Where a QR code sends people: straight into the AR view, never the work page.
 *  build     -> the build with ?view=ar, which every self-hosted build reads as "open the camera"
 *  external  -> the external experience as it is
 *  component -> the full-screen launch route
 * A work with nothing to open falls back to its page.
 */
export function arUrl(project) {
  const href = launchHref(project);
  if (!href) return `${site.url}${site.workPath}/${project.slug}`;
  if (project.launch.type === 'external') return href;
  const url = new URL(href, `${site.url}/`);
  if (project.launch.type === 'build' && hasAR(project)) url.searchParams.set('view', 'ar');
  return url.toString();
}

/**
 * Whether a work has a camera AR view. A work whose categories are all 3D (a design
 * model, a viewer) has none, so its QR code opens the work itself and says so.
 * A work with no categories is taken to be AR, as every work was before categories.
 */
export function hasAR(project) {
  const c = project.categories || [];
  return c.length === 0 || c.includes('image-target') || c.includes('world-tracking');
}

/** Builds and external links leave the React app, so they need a full page load. */
export const isFullPageLaunch = (project) =>
  project.launch?.type === 'build' || project.launch?.type === 'external';

/** Lets titles like Limited//Limitless break after the slashes, not mid-word. */
export const breakable = (title) => title.replace(/\/\//g, '//​');

/** True once a legacy hosted link has passed its shutdown date. */
export function legacyExpired(project, now = new Date()) {
  const until = project.legacy?.until;
  return until ? now > new Date(`${until}T23:59:59`) : false;
}
