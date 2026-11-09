import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="hero hero--small">
      <h1 className="hero__title">Not here</h1>
      <p className="hero__lede">
        This address does not match a work. <Link to="/">See the works.</Link>
      </p>
    </section>
  );
}
