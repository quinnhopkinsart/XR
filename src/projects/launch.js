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
