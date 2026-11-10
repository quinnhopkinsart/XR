import { useState } from 'react';
import ProjectCard from '../components/ProjectCard.jsx';
import WideTitle from '../components/WideTitle.jsx';
import { allKinds, projects } from '../projects/registry.js';

export default function Home() {
  const [kind, setKind] = useState('All');
  const shown = kind === 'All' ? projects : projects.filter((p) => p.kind === kind);

  return (
    <>
      <section className="hero">
        <WideTitle label="Noodin XR">
          Noodin<sup className="wide-title__sup">XR</sup>
        </WideTitle>
        <p className="hero__lede">
          <span className="plate">
            I build augmented reality works that layer Anishinaabe stories onto the places we
            live. Scan a code at an installation, or open a work here.
          </span>
        </p>
      </section>

      <section className="works" aria-labelledby="works-heading">
        <div className="works__bar">
          <h2 id="works-heading" className="label plate">
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
