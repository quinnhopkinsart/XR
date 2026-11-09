import { Link } from 'react-router-dom';
import { site } from '../brand/site.js';
import StatusPill from './StatusPill.jsx';
import { breakable } from '../projects/launch.js';

export default function ProjectCard({ project }) {
  const { slug, title, year, kind, summary, cover, status } = project;
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
      <div className="card__body">
        <div className="card__meta">
          <span>{year}</span>
          <span>{kind}</span>
        </div>
        <h2 className="card__title">{title}</h2>
        <p className="card__summary">{summary}</p>
        {status !== 'live' && <StatusPill status={status} />}
      </div>
    </Link>
  );
}
