import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject } from '../projects/registry.js';
import { breakable, legacyExpired } from '../projects/launch.js';
import { inquiryUrl, portfolioUrl, site } from '../brand/site.js';
import copy from '../brand/copy.json';
import LaunchButton from '../components/LaunchButton.jsx';
import QRBlock from '../components/QRBlock.jsx';
import StatusPill from '../components/StatusPill.jsx';
import TargetGallery from '../components/TargetGallery.jsx';
import BuildEmbed from '../components/BuildEmbed.jsx';
import NotFound from './NotFound.jsx';

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export default function ProjectPage() {
  const { slug } = useParams();
  const p = getProject(slug);

  useEffect(() => {
    if (p) document.title = `${p.title} | ${site.title}`;
    return () => {
      document.title = site.title;
    };
  }, [p]);

  if (!p) return <NotFound />;

  // A launch link that is the legacy 8th Wall link stops working on its shutdown date.
  const onLegacy = p.legacy?.url && p.launch?.url === p.legacy.url;
  const expired = onLegacy && legacyExpired(p);
  const canLaunch = p.launch && !expired;
  const embedded = canLaunch && p.launch.type === 'build' && p.launch.embed;
  const launchLabel = embedded ? 'Open full screen' : 'Open the work';
  const eventsNote = p.bookable || copy.eventsNote;

  return (
    <article className="work">
      <header className="work__head">
        <Link to="/" className="back">
          ← Works
        </Link>
        <h1 className="work__title">
          <span className="plate">{breakable(p.title)}</span>
        </h1>
        <dl className="work__meta">
          <div>
            <dt>Year</dt>
            <dd>{p.year}</dd>
          </div>
          <div>
            <dt>Medium</dt>
            <dd>{p.kind}</dd>
          </div>
          {p.venue && (
            <div>
              <dt>Venue</dt>
              <dd>{p.venue}</dd>
            </div>
          )}
          {p.location && (
            <div>
              <dt>Location</dt>
              <dd>{p.location}</dd>
            </div>
          )}
          {p.award && (
            <div>
              <dt>Award</dt>
              <dd>{p.award.label}</dd>
            </div>
          )}
        </dl>
        {p.status !== 'live' && <StatusPill status={p.status} />}
        {/* On phones, someone who just scanned a code gets the button first. */}
        {canLaunch && (
          <div className="work__launch-mobile">
            <LaunchButton project={p}>{launchLabel}</LaunchButton>
          </div>
        )}
      </header>

      {embedded ? (
        <BuildEmbed project={p} />
      ) : (
        p.cover && (
          <figure className="work__cover">
            <img src={p.cover} alt={p.coverAlt || ''} />
          </figure>
        )
      )}

      <div className="work__body">
        <div className="prose">
          {p.description.map((para, i) => (
            <p key={i}>{para}</p>
          ))}

          {/* Every work page carries the events block. A work's own `bookable` sentence
              replaces the site-wide one from copy.json. */}
          {eventsNote && (
            <section className="section">
              <h2 className="label">For events</h2>
              <p>
                {eventsNote} <a href={inquiryUrl(p.title)}>Get in touch</a>.
              </p>
            </section>
          )}

          {p.howTo.length > 0 && (
            <section className="section">
              <h2 className="label">How to try it</h2>
              <ol className="steps">
                {p.howTo.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          {p.targets.length > 0 && (
            <section className="section">
              <h2 className="label">Image targets</h2>
              <p className="note">
                Away from the installation, open a target on another screen or print it, then point
                your phone at it.
              </p>
              <TargetGallery targets={p.targets} />
            </section>
          )}

          {p.credits.length > 0 && (
            <section className="section">
              <h2 className="label">Credits</h2>
              <dl className="credits">
                {p.credits.map((c) => (
                  <div key={`${c.role}-${c.name}`}>
                    <dt>{c.role}</dt>
                    <dd>{c.name}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="work__aside">
          {canLaunch ? (
            <div className="work__launch-desktop">
              <LaunchButton project={p}>{launchLabel}</LaunchButton>
            </div>
          ) : (
            <p className="note">This work is being rebuilt for self-hosting.</p>
          )}
          {onLegacy && !expired && (
            <p className="note">Hosted on 8th Wall until {formatDate(p.legacy.until)}.</p>
          )}
          <QRBlock project={p} />
          {p.portfolio && (
            <p className="work__portfolio">
              <a className="textbutton" href={portfolioUrl(p.portfolio)}>
                View in the portfolio
              </a>
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
