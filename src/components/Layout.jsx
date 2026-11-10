import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { site } from '../brand/site.js';
import logo from '../brand/logo-on-red.png';
import SprayFilters from '../brand/SprayFilters.jsx';
import FloatingField from '../field/FloatingField.jsx';
import MotionControls from '../field/MotionControls.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <SprayFilters />
      <FloatingField />
      <div className="grain" aria-hidden="true" />

      <header className="masthead">
        <Link to="/" className="masthead__mark">
          <img src={logo} alt="" className="masthead__logo" width="94" height="46" />
          <span className="masthead__word">
            noodin studio <span className="masthead__xr">xr</span>
          </span>
        </Link>
        <nav className="masthead__nav" aria-label="Main">
          <Link to="/">works</Link>
          <a href={site.mainSite}>main site</a>
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
