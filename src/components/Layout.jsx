import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { site } from '../brand/site.js';
import FloatingField from '../field/FloatingField.jsx';
import MotionControls from '../field/MotionControls.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <FloatingField />
      <header className="masthead">
        <Link to="/" className="masthead__mark">
          Noodin Studio <span className="masthead__xr">XR</span>
        </Link>
        <nav className="masthead__nav" aria-label="Main">
          <Link to="/">Works</Link>
          <a href={site.mainSite}>Main site</a>
        </nav>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="footer">
        <span>
          {site.name} by {site.artist}, Tkaronto
        </span>
        <span className="footer__links">
          <a href={site.instagram}>Instagram</a>
          <a href={site.contact}>Get in touch</a>
        </span>
      </footer>

      <MotionControls />
    </div>
  );
}
