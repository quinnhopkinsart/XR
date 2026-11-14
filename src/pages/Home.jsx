import { useState } from 'react';
import ProjectCard from '../components/ProjectCard.jsx';
import WideTitle from '../components/WideTitle.jsx';
import FlyMode, { FlyButton } from '../field/FlyMode.jsx';
import { allCategories, projects } from '../projects/registry.js';
import { CATEGORIES } from '../projects/schema.js';
import copy from '../brand/copy.json';

// The landing page lists this many works and keeps the rest behind "See more", so the page
// is short and the 3D view at its foot is close (Quinn's request). A second way into that
// view sits under the intro.
const FIRST = 6;

export default function Home() {
  const [category, setCategory] = useState('All');
  const [all, setAll] = useState(false);
  const matching = projects.filter((p) => category === 'All' || p.categories.includes(category));
  const shown = all ? matching : matching.slice(0, FIRST);

  return (
    <>
      <section className="hero">
        <WideTitle label="Noodin XR" badge="XR">
          Noodin
        </WideTitle>
        <p className="hero__lede">
          <span className="plate">{copy.homeIntro}</span>
        </p>
        <p className="hero__fly">
          <FlyButton />
        </p>
      </section>

      <section className="works" aria-labelledby="works-heading">
        <div className="works__bar">
          <h2 id="works-heading" className="label plate">
            Works <span className="count">{matching.length}</span>
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
          </div>
        </div>

        {matching.length === 0 && (
          <p className="note">
            <span className="plate">No works match this filter.</span>
          </p>
        )}

        <div className="grid">
          {shown.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>

        {matching.length > FIRST && (
          <p className="works__more">
            <button type="button" className="filter" aria-expanded={all} onClick={() => setAll(!all)}>
              {all ? 'See fewer' : `See more (${matching.length - FIRST})`}
            </button>
          </p>
        )}
      </section>

      <FlyMode />
    </>
  );
}
