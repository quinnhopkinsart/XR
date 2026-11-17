import { Fragment, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projects } from '../projects/registry.js';
import { hasAR } from '../projects/launch.js';
import { site } from '../brand/site.js';
import tools from '../brand/tools.json';

// The tools I make the works with, in the order a work passes through them.
// Text and links live in src/brand/tools.json. A tool's `works` is a list of work slugs,
// or "ar" for every listed work with an AR view. Only listed works are searched, so a
// hidden work drops off the page on its own and comes back when it is listed again.
// `site` is the link text where the bare address would read badly (MDN).
export const toolWorks = (works) => {
  if (works === 'ar') return projects.filter(hasAR);
  if (!Array.isArray(works)) return [];
  return works.map((slug) => projects.find((p) => p.slug === slug)).filter(Boolean);
};

const host = (url) => new URL(url).hostname.replace(/^www\./, '');

export default function Tools() {
  useEffect(() => {
    document.title = `Tools | ${site.title}`;
    return () => {
      document.title = site.title;
    };
  }, []);

  return (
    <article className="tools">
      <header className="hero" id="intro">
        <h1 className="hero__title">
          <span className="plate plate--line">Tools</span>
        </h1>
        <p className="hero__lede">
          <span className="plate">{tools.intro}</span>
        </p>
      </header>

      <ol className="tools__steps">
        {tools.steps.map((step, i) => (
          <li key={step.id} className="tools__step">
            <div className="tools__head">
              <span className="tools__num plate" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="label plate">{step.title}</h2>
              <p className="tools__note">
                <span className="plate">{step.note}</span>
              </p>
            </div>

            <ul className="tools__grid">
              {step.tools.map((t) => {
                const seen = toolWorks(t.works);
                return (
                  <li key={t.name} className="tool">
                    <h3 className="tool__name">{t.name}</h3>
                    <p className="tool__role">{t.role}</p>
                    <p className="tool__text">{t.text}</p>
                    {seen.length > 0 && (
                      <p className="tool__works">
                        <span className="tool__label">See it in</span>
                        {seen.map((p, j) => (
                          <Fragment key={p.slug}>
                            {j > 0 && ', '}
                            <Link to={`${site.workPath}/${p.slug}`}>{p.title}</Link>
                          </Fragment>
                        ))}
                      </p>
                    )}
                    {t.url && (
                      <a className="textbutton tool__link" href={t.url}>
                        {t.site || host(t.url)}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </article>
  );
}
