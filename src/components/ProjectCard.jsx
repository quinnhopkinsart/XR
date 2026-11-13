import { Link } from 'react-router-dom';
import { site } from '../brand/site.js';
import StatusPill from './StatusPill.jsx';
import CategoryTags from './CategoryTags.jsx';
import { breakable } from '../projects/launch.js';

export default function ProjectCard({ project }) {
  const { slug, title, year, kind, summary, cover, status, award, categories } = project;
  return (
    <Link to={`${site.workPath}/${slug}`} className="card">
      <div className="card__media">
        {cover ? (
          <img src={cover} alt="" loading="lazy" />
        ) : (
          <div className="card__type" aria-hidden="true">
            {breakable(title)}
          </div>
        )}
      </div>
      {award && (
        <div className="card__award">
          <img src={award.logoOnDark} alt={award.label} />
          {award.short && <span aria-hidden="true">{award.short}</span>}
        </div>
      )}
      <div className="card__body">
        <div className="card__meta">
          <span>{year}</span>
          <span>{kind}</span>
        </div>
        <h2 className="card__title">{title}</h2>
        <CategoryTags categories={categories} />
        <p className="card__summary">{summary}</p>
        {status !== 'live' && <StatusPill status={status} />}
      </div>
    </Link>
  );
}
