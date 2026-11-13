// The dashboard at /admin: show or hide works and edit their text without touching code.
// It edits the content.json files on GitHub (see github.js) and publishes every pending
// edit as one commit. Amplify rebuilds the site from that commit, so an edit is live a
// few minutes after Publish. Nothing here works without Quinn's GitHub token.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { site } from '../brand/site.js';
import { CONTENT_FIELDS, STATUSES, contentProblems } from '../projects/schema.js';
import {
  COPY_PATH,
  checkToken,
  commitUrl,
  liveCommit,
  loadContent,
  publish,
  readToken,
  repoUrl,
  slugOf,
  storeToken,
} from './github.js';
import './admin.css';

const OPTIONAL_TEXT = ['venue', 'location', 'embedNote', 'bookable', 'coverAlt'];
const lines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const paragraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

// content.json -> the strings the form edits.
function toForm(data) {
  return {
    title: data.title || '',
    year: data.year || '',
    status: data.status || 'live',
    hidden: data.hidden === true,
    venue: data.venue || '',
    location: data.location || '',
    summary: data.summary || '',
    description: (data.description || []).join('\n\n'),
    howTo: (data.howTo || []).join('\n'),
    embedNote: data.embedNote || '',
    bookable: data.bookable || '',
    credits: (data.credits || []).map((c) => ({ role: c.role || '', name: c.name || '' })),
    coverAlt: data.coverAlt || '',
    tags: (data.tags || []).join(', '),
    order: String(data.order || 0),
  };
}

// The form -> content.json, fields in CONTENT_FIELDS order. Empty optional fields are
// left out, and anything in the file this form does not know is carried over untouched.
function fromForm(form, original = {}) {
  const next = {
    title: form.title.trim(),
    year: form.year.trim(),
    status: form.status,
    hidden: form.hidden,
    summary: form.summary.trim(),
    description: paragraphs(form.description),
    howTo: lines(form.howTo),
    credits: form.credits
      .map((c) => ({ role: c.role.trim(), name: c.name.trim() }))
      .filter((c) => c.role || c.name),
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
  OPTIONAL_TEXT.forEach((k) => {
    if (form[k].trim()) next[k] = form[k].trim();
  });
  const order = Number(form.order);
  if (form.order.trim() && order !== 0) next.order = Number.isFinite(order) ? order : form.order;

  const out = {};
  CONTENT_FIELDS.forEach((k) => {
    if (k in next) out[k] = next[k];
  });
  Object.keys(original).forEach((k) => {
    if (!CONTENT_FIELDS.includes(k)) out[k] = original[k];
  });
  return out;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function Admin() {
  const [token, setToken] = useState(readToken);
  const [phase, setPhase] = useState(token ? 'loading' : 'signin'); // signin | loading | ready
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(null); // { head, files }
  const [forms, setForms] = useState({}); // path -> form
  const [intro, setIntro] = useState('');
  const [eventsNote, setEventsNote] = useState('');
  const [open, setOpen] = useState(null); // path of the work being edited
  const [busy, setBusy] = useState(false);
  const [deploy, setDeploy] = useState(null); // { sha, state: building | live | sent | slow }
  const [liveState, setLiveState] = useState(null); // current | behind | null
  const poll = useRef(null);

  useEffect(() => {
    document.title = `Dashboard | ${site.title}`;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.title = site.title;
      meta.remove();
      clearInterval(poll.current);
    };
  }, []);

  const adopt = useCallback((content) => {
    setLoaded(content);
    const next = {};
    Object.entries(content.files).forEach(([path, file]) => {
      if (path !== COPY_PATH) next[path] = toForm(file.data);
    });
    setForms(next);
    setIntro(content.files[COPY_PATH]?.data.homeIntro || '');
    setEventsNote(content.files[COPY_PATH]?.data.eventsNote || '');
  }, []);

  const load = useCallback(
    async (withToken) => {
      setPhase('loading');
      setError('');
      try {
        await checkToken(withToken);
        const content = await loadContent(withToken);
        adopt(content);
        setPhase('ready');
        const live = await liveCommit();
        setLiveState(live ? (live === content.head ? 'current' : 'behind') : null);
      } catch (e) {
        setError(e.message);
        setPhase('signin');
      }
    },
    [adopt],
  );

  useEffect(() => {
    if (token) load(token);
    // Runs once, for a token remembered from an earlier visit.
  }, []);

  // What differs from GitHub, as the list of files to commit.
  const changes = useMemo(() => {
    if (!loaded) return [];
    const list = [];
    Object.entries(forms).forEach(([path, form]) => {
      const original = loaded.files[path].data;
      const before = fromForm(toForm(original), original);
      const data = fromForm(form, original);
      if (same(before, data)) return;
      const { hidden: h1, ...restBefore } = before;
      const { hidden: h2, ...restAfter } = data;
      const title = data.title || original.title || slugOf(path);
      const verb = !same(restBefore, restAfter) ? 'edit' : h2 ? 'hide' : 'show';
      list.push({ path, data, note: `${verb} ${title}`, problems: contentProblems(data) });
    });
    const copy = loaded.files[COPY_PATH];
    const introChanged = copy && intro.trim() !== (copy.data.homeIntro || '');
    const eventsChanged = copy && eventsNote.trim() !== (copy.data.eventsNote || '');
    if (introChanged || eventsChanged) {
      // One file, so one entry: both site texts go out in the same edit.
      list.push({
        path: COPY_PATH,
        data: { ...copy.data, homeIntro: intro.trim(), eventsNote: eventsNote.trim() },
        note: [introChanged && 'edit the home intro', eventsChanged && 'edit the events note']
          .filter(Boolean)
          .join(' and '),
        problems: intro.trim() ? [] : ['the home intro is empty'],
      });
    }
    return list;
  }, [forms, intro, eventsNote, loaded]);

  const blocked = changes.some((c) => c.problems.length);

  useEffect(() => {
    if (!changes.length) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changes.length]);

  const signIn = (e) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('token').trim();
    if (!value) return;
    storeToken(value);
    setToken(value);
    load(value);
  };

  const signOut = () => {
    if (changes.length && !window.confirm('Sign out and drop the edits you have not published?')) {
      return;
    }
    storeToken('');
    setToken('');
    setLoaded(null);
    setForms({});
    setPhase('signin');
  };

  const setField = (path, key, value) =>
    setForms((f) => ({ ...f, [path]: { ...f[path], [key]: value } }));

  const discard = () => {
    if (window.confirm('Drop every edit you have not published?')) adopt(loaded);
  };

  const watchDeploy = (sha) => {
    clearInterval(poll.current);
    const started = Date.now();
    const check = async () => {
      const live = await liveCommit();
      if (live === sha) {
        clearInterval(poll.current);
        setDeploy({ sha, state: 'live' });
        setLiveState('current');
      } else if (!live) {
        // This build does not record its commit (local preview), so there is nothing to watch.
        clearInterval(poll.current);
        setDeploy({ sha, state: 'sent' });
      } else if (Date.now() - started > 12 * 60 * 1000) {
        clearInterval(poll.current);
        setDeploy({ sha, state: 'slow' });
      }
    };
    setDeploy({ sha, state: 'building' });
    poll.current = setInterval(check, 15000);
    check();
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const message = `Dashboard: ${changes.map((c) => c.note).join(', ')}`;
      const sha = await publish(token, { loaded: loaded.files, changes, message });
      watchDeploy(sha);
      adopt(await loadContent(token));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const works = useMemo(
    () =>
      Object.keys(forms).sort((a, b) => {
        const x = forms[a];
        const y = forms[b];
        return (
          y.year.localeCompare(x.year) ||
          Number(y.order) - Number(x.order) ||
          x.title.localeCompare(y.title)
        );
      }),
    [forms],
  );

  const changed = new Map(changes.map((c) => [c.path, c]));

  return (
    <div className="admin">
      <header className="admin__head">
        <h1 className="admin__title">
          Noodin XR <span>Dashboard</span>
        </h1>
        <nav className="admin__nav" aria-label="Dashboard">
          <a href="/">View site</a>
          {phase === 'ready' && (
            <button type="button" className="admin__link" onClick={signOut}>
              Sign out
            </button>
          )}
        </nav>
      </header>

      <div className="admin__status" role="status" aria-live="polite">
        {error && <p className="admin__alert">{error}</p>}
        {phase === 'loading' && <p>Reading the site from GitHub.</p>}
        {deploy?.state === 'building' && (
          <p>
            Published. The site is rebuilding, usually about three minutes. This line updates
            when it is live. <a href={commitUrl(deploy.sha)}>See the change</a>
          </p>
        )}
        {deploy?.state === 'live' && (
          <p>
            Live. <a href="/">Open the site</a>
          </p>
        )}
        {deploy?.state === 'sent' && (
          <p>
            Published. The site rebuilds in about three minutes.{' '}
            <a href={commitUrl(deploy.sha)}>See the change</a>
          </p>
        )}
        {deploy?.state === 'slow' && (
          <p className="admin__alert">
            The rebuild has not finished after twelve minutes. The build may have failed, and
            the site is still on the earlier version. Check the build in AWS Amplify.
          </p>
        )}
        {phase === 'ready' && !deploy && liveState === 'behind' && (
          <p>
            The live site is behind GitHub. A rebuild is still running, or the last one failed.
            What you see here is the newer version.
          </p>
        )}
      </div>

      {phase === 'signin' && (
        <form className="admin__panel admin__signin" onSubmit={signIn}>
          <h2>Sign in</h2>
          <p>
            This page edits the site through GitHub. Paste a GitHub token for the XR repository.
            It stays in this browser and goes only to GitHub.
          </p>
          <ol>
            <li>
              Open{' '}
              <a href="https://github.com/settings/personal-access-tokens/new">
                GitHub, Settings, Developer settings, Fine-grained tokens, Generate new token
              </a>
              .
            </li>
            <li>
              Repository access: Only select repositories, then {site.repo.owner}/{site.repo.name}.
            </li>
            <li>Permissions, Repository, Contents: Read and write. Nothing else.</li>
            <li>Generate, copy the token and paste it here.</li>
          </ol>
          <label htmlFor="admin-token">GitHub token</label>
          <input
            id="admin-token"
            name="token"
            type="password"
            autoComplete="off"
            spellCheck="false"
            required
          />
          <button type="submit" className="admin__btn admin__btn--primary">
            Sign in
          </button>
        </form>
      )}

      {phase === 'ready' && (
        <>
          <section aria-labelledby="admin-works">
            <h2 id="admin-works" className="admin__section">
              Works <span>{works.length}</span>
            </h2>
            <ul className="admin__list">
              {works.map((path) => (
                <Work
                  key={path}
                  slug={slugOf(path)}
                  form={forms[path]}
                  change={changed.get(path)}
                  open={open === path}
                  onToggle={() => setOpen(open === path ? null : path)}
                  set={(key, value) => setField(path, key, value)}
                />
              ))}
            </ul>
          </section>

          <section aria-labelledby="admin-copy" className="admin__panel">
            <h2 id="admin-copy">Site text</h2>
            <Field label="Home intro" hint="The sentence under the title on the home page.">
              {(id) => (
                <textarea id={id} rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} />
              )}
            </Field>
            <Field
              label="Events note"
              hint='Shown as "For events" on every work page, followed by a "Get in touch" email link. A work with its own "For events" sentence shows that one. Leave empty to show the block only on those works.'
            >
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  value={eventsNote}
                  onChange={(e) => setEventsNote(e.target.value)}
                />
              )}
            </Field>
          </section>

          <p className="admin__foot">
            New works, images, targets, 3D models and categories are still added in the{' '}
            <a href={repoUrl}>repository</a>.
          </p>

          {changes.length > 0 && (
            <div className="admin__bar" role="region" aria-label="Edits not published">
              <p>
                <strong>
                  {changes.length} {changes.length === 1 ? 'edit' : 'edits'} not published:
                </strong>{' '}
                {changes.map((c) => c.note).join(', ')}.
                {blocked && ' Fix the marked fields first.'}
              </p>
              <div className="admin__bar-actions">
                <button type="button" className="admin__btn" onClick={discard} disabled={busy}>
                  Discard
                </button>
                <button
                  type="button"
                  className="admin__btn admin__btn--primary"
                  onClick={save}
                  disabled={busy || blocked}
                >
                  {busy ? 'Publishing' : 'Publish'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, hint, wide, children }) {
  const id = useId();
  return (
    <div className={`admin__field${wide ? ' admin__field--wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <p className="admin__hint">{hint}</p>}
    </div>
  );
}

function Work({ slug, form, change, open, onToggle, set }) {
  const text = (key) => (id) => (
    <input id={id} type="text" value={form[key]} onChange={(e) => set(key, e.target.value)} />
  );
  const area = (key, rows) => (id) => (
    <textarea id={id} rows={rows} value={form[key]} onChange={(e) => set(key, e.target.value)} />
  );
  const setCredit = (i, key, value) =>
    set(
      'credits',
      form.credits.map((c, n) => (n === i ? { ...c, [key]: value } : c)),
    );
  const hasDash = [form.title, form.summary, form.description, form.howTo, form.embedNote].some(
    (t) => t.includes('—'),
  );
  const panelId = `admin-work-${slug}`;

  return (
    <li className={`admin__panel admin__work${form.hidden ? ' is-hidden' : ''}`}>
      <div className="admin__row">
        <div className="admin__row-main">
          <h3>{form.title || slug}</h3>
          <p className="admin__meta">
            <span>{form.year}</span>
            {form.status !== 'live' && <span>{STATUSES[form.status]}</span>}
            {form.hidden && <span>Hidden from the home page</span>}
            {change && <span className="admin__edited">Edited</span>}
          </p>
        </div>
        <div className="admin__row-actions">
          <button
            type="button"
            role="switch"
            aria-checked={!form.hidden}
            aria-label={`Show ${form.title || slug} on the home page`}
            className="admin__switch"
            onClick={() => set('hidden', !form.hidden)}
          >
            <span className="admin__switch-track" aria-hidden="true">
              <span className="admin__switch-knob" />
            </span>
            <span aria-hidden="true">{form.hidden ? 'Hidden' : 'Shown'}</span>
          </button>
          <button
            type="button"
            className="admin__btn"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            {open ? 'Close' : 'Edit text'}
          </button>
          <a className="admin__btn" href={`${site.workPath}/${slug}`} target="_blank" rel="noreferrer">
            Page
          </a>
        </div>
      </div>

      {change?.problems.length > 0 && (
        <ul className="admin__problems">
          {change.problems.map((p) => (
            <li key={p}>Fix: {p}</li>
          ))}
        </ul>
      )}

      {open && (
        <div id={panelId} className="admin__form">
          <Field label="Title">{text('title')}</Field>
          <Field label="Year" hint="2026, or 2024 to 2025.">
            {text('year')}
          </Field>
          <Field label="Status" hint="Anything but Live shows a pill on the work.">
            {(id) => (
              <select id={id} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Order" hint="Higher numbers sit first within the same year.">
            {(id) => (
              <input
                id={id}
                type="number"
                value={form.order}
                onChange={(e) => set('order', e.target.value)}
              />
            )}
          </Field>
          <Field label="Venue">{text('venue')}</Field>
          <Field label="Location">{text('location')}</Field>
          <Field label="Summary" hint="One sentence for the card on the home page." wide>
            {area('summary', 2)}
          </Field>
          <Field label="Description" hint="Leave a blank line between paragraphs." wide>
            {area('description', 12)}
          </Field>
          <Field label="How to try it" hint="One step per line." wide>
            {area('howTo', 6)}
          </Field>
          <Field label="Note under the embedded work" wide>
            {text('embedNote')}
          </Field>
          <Field
            label="For events"
            hint='One or two sentences about bringing this work to an event. The page adds a "Get in touch" email link. Leave empty to show the events note from Site text.'
            wide
          >
            {area('bookable', 2)}
          </Field>

          <fieldset className="admin__field admin__field--wide admin__credits">
            <legend>Credits</legend>
            {form.credits.map((c, i) => (
              <div className="admin__credit" key={i}>
                <input
                  type="text"
                  aria-label={`Credit ${i + 1}, role`}
                  placeholder="Role"
                  value={c.role}
                  onChange={(e) => setCredit(i, 'role', e.target.value)}
                />
                <input
                  type="text"
                  aria-label={`Credit ${i + 1}, name`}
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => setCredit(i, 'name', e.target.value)}
                />
                <button
                  type="button"
                  className="admin__btn"
                  aria-label={`Remove credit ${i + 1}`}
                  onClick={() =>
                    set(
                      'credits',
                      form.credits.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin__btn"
              onClick={() => set('credits', [...form.credits, { role: '', name: '' }])}
            >
              Add a credit
            </button>
          </fieldset>

          <Field label="Cover image description" hint="Alt text, read aloud by screen readers." wide>
            {area('coverAlt', 2)}
          </Field>
          <Field label="Tags" hint="Separated by commas. Not shown on the site yet." wide>
            {text('tags')}
          </Field>

          {hasDash && (
            <p className="admin__hint admin__field--wide">
              This text has an em-dash in it. The site copy uses periods or commas.
            </p>
          )}
        </div>
      )}
    </li>
  );
}
