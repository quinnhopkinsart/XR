import { useState } from 'react';
import ProjectCard from '../components/ProjectCard.jsx';
import WideTitle from '../components/WideTitle.jsx';
import { allCategories, allKinds, projects } from '../projects/registry.js';
import { CATEGORIES } from '../projects/schema.js';
import copy from '../brand/copy.json';

export default function Home() {
  const [kind, setKind] = useState('All');
  const [category, setCategory] = useState('All');
  const shown = projects.filter(
    (p) =>
      (kind === 'All' || p.kind === kind) &&
      (category === 'All' || p.categories.includes(category)),
  );

  return (
    <>
      <section className="hero">
        <WideTitle label="Noodin XR" badge="XR">
          Noodin
        </WideTitle>
        <p className="hero__lede">
          <span className="plate">{copy.homeIntro}</span>
        </p>
      </section>

      <section className="works" aria-labelledby="works-heading">
        <div className="works__bar">
          <h2 id="works-heading" className="label plate">
            Works <span className="count">{shown.length}</span>
          </h2>
          <div className="works__filters">
            {allCategories.length > 0 && (
              <div className="filters" role="group" aria-label="Filter by type">
                {['All', ...allCategories].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`filter${c === 'All' ? '' : ` filter--${CATEGORIES[c].tone}`}`}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c === 'All' ? 'All' : CATEGORIES[c].label}
                  </button>
                ))}
              </div>
            )}
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
                    {k === 'All' ? 'All media' : k}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {shown.length === 0 && (
          <p className="note">
            <span className="plate">No works match these filters.</span>
          </p>
        )}

        <div className="grid">
          {shown.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </>
  );
}
