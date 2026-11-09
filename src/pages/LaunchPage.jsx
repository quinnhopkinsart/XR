import { lazy, Suspense, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getProject } from '../projects/registry.js';
import { site } from '../brand/site.js';

// Full-screen host for React experiences (launch.type === 'component').
// Builds and external links never land here; they open directly.
export default function LaunchPage() {
  const { slug } = useParams();
  const p = getProject(slug);
  const Experience = useMemo(
    () => (p?.launch?.type === 'component' ? lazy(p.launch.load) : null),
    [p],
  );

  if (!Experience) return <Navigate to={`${site.workPath}/${slug}`} replace />;

  return (
    <div className="stage">
      <Link to={`${site.workPath}/${slug}`} className="stage__close">
        Close
      </Link>
      <Suspense fallback={<div className="stage__loading">Loading {p.title}</div>}>
        <Experience project={p} />
      </Suspense>
    </div>
  );
}
