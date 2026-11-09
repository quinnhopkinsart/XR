import { Link } from 'react-router-dom';
import { isFullPageLaunch, launchHref } from '../projects/launch.js';

export default function LaunchButton({ project, children = 'Open the work' }) {
  const href = launchHref(project);
  if (!href) return null;

  const content = (
    <>
      <span>{children}</span>
      <span className="launch__arrow" aria-hidden="true">
        →
      </span>
    </>
  );

  return isFullPageLaunch(project) ? (
    <a className="launch" href={href}>
      {content}
    </a>
  ) : (
    <Link className="launch" to={href}>
      {content}
    </Link>
  );
}
