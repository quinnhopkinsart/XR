// The dashboard's only backend is the GitHub API. It reads every content.json from
// the deploy branch and writes edits back as one commit, which Amplify then builds.
// The token is a fine-grained personal access token limited to this repository
// (Contents: Read and write). It stays in this browser's localStorage and is sent
// only to api.github.com.

import { site } from '../brand/site.js';

const { owner, name, branch } = site.repo;
const API = `https://api.github.com/repos/${owner}/${name}`;
const TOKEN_KEY = 'noodin-xr-admin-token';

export const COPY_PATH = 'src/brand/copy.json';
const WORK_PATH = /^src\/projects\/([^_/][^/]*)\/content\.json$/;

export const repoUrl = `https://github.com/${owner}/${name}`;
export const commitUrl = (sha) => `${repoUrl}/commit/${sha}`;

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private windows can refuse storage. The token then lasts until the tab closes.
  }
}

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function call(token, path, { method = 'GET', body, raw = false } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new GitHubError(0, 'Could not reach GitHub. Check your connection and try again.');
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).message || '';
    } catch {
      // no JSON body
    }
    const hint =
      res.status === 401
        ? 'GitHub did not accept the token. It may have expired.'
        : res.status === 403 || res.status === 404
          ? 'The token cannot do this. It needs Contents: Read and write on the XR repository.'
          : res.status === 409 || res.status === 422
            ? 'The site changed on GitHub while you were editing. Reload to get the latest, then redo the edit.'
            : `GitHub answered ${res.status}.`;
    throw new GitHubError(res.status, detail ? `${hint} (${detail})` : hint);
  }
  return raw ? res.text() : res.json();
}

/** Confirms the token opens the repository. Whether it can write shows at the first Publish. */
export async function checkToken(token) {
  const repo = await call(token, '');
  if (repo.permissions && !repo.permissions.push) {
    throw new GitHubError(403, 'This token can read the XR repository but cannot write to it.');
  }
}

/**
 * Reads the branch as it is on GitHub right now, which can be ahead of the live site.
 * Returns { head, files }, where files maps a path to { sha, data } and holds every
 * work's content.json plus the site copy.
 */
export async function loadContent(token) {
  const ref = await call(token, `/git/ref/heads/${branch}`);
  const head = ref.object.sha;
  const tree = await call(token, `/git/trees/${head}?recursive=1`);
  const wanted = tree.tree.filter(
    (e) => e.type === 'blob' && (WORK_PATH.test(e.path) || e.path === COPY_PATH),
  );
  const files = {};
  await Promise.all(
    wanted.map(async (e) => {
      const text = await call(token, `/git/blobs/${e.sha}`, { raw: true });
      files[e.path] = { sha: e.sha, data: JSON.parse(text) };
    }),
  );
  return { head, files };
}

export const slugOf = (path) => path.match(WORK_PATH)?.[1] || null;

/**
 * Commits the changed files in one commit on top of the branch.
 * `changes` is [{ path, data }]; `loaded` is the files map from loadContent, used to
 * refuse the save when someone else changed the same file in the meantime.
 * Returns the new commit's sha.
 */
export async function publish(token, { loaded, changes, message }) {
  const ref = await call(token, `/git/ref/heads/${branch}`);
  const head = ref.object.sha;
  const tree = await call(token, `/git/trees/${head}?recursive=1`);
  const now = new Map(tree.tree.map((e) => [e.path, e.sha]));
  const moved = changes.filter((c) => now.get(c.path) !== loaded[c.path].sha);
  if (moved.length) {
    throw new GitHubError(
      409,
      'These files changed on GitHub since you opened the dashboard: ' +
        `${moved.map((c) => c.path).join(', ')}. Reload to get the latest, then redo the edit.`,
    );
  }
  const next = await call(token, '/git/trees', {
    method: 'POST',
    body: {
      base_tree: tree.sha,
      tree: changes.map((c) => ({
        path: c.path,
        mode: '100644',
        type: 'blob',
        content: `${JSON.stringify(c.data, null, 2)}\n`,
      })),
    },
  });
  const commit = await call(token, '/git/commits', {
    method: 'POST',
    body: { message, tree: next.sha, parents: [head] },
  });
  await call(token, `/git/refs/heads/${branch}`, { method: 'PATCH', body: { sha: commit.sha } });
  return commit.sha;
}

/** The commit the live site was built from, or null when the build did not record one. */
export async function liveCommit() {
  try {
    const res = await fetch(`/build.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).commit || null;
  } catch {
    return null;
  }
}
