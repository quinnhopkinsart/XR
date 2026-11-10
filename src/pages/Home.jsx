import { useState } from 'react';
import ProjectCard from '../components/ProjectCard.jsx';
import { allKinds, projects } from '../projects/registry.js';

export default function Home() {
  const [kind, setKind] = useState('All');
  const shown = kind === 'All' ? projects : projects.filter((p) => p.kind === kind);

  return (
    <>
      <section className="hero">
        <h1 className="hero__title">
          Noodin
          <br />
          XR
        </h1>
        <p className="hero__lede">
          I build augmented reality works that layer Anishinaabe stories onto the places we live.
          Scan a code at an installation, or open a work here.
        </p>
      </section>

      <section className="works" aria-labelledby="works-heading">
        <div className="works__bar">
          <h2 id="works-heading" className="label">
            Works <span className="count">{shown.length}</span>
          </h2>
          {allKinds.length > 1 && (
            <div className="filters" role="group" aria-label="Filter by medium">
              {['All', ...allKinds].map((k) => (
                <button
                  key={k}
                  type="button"
                  className="filter"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid">
          {shown.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </>
  );
}
