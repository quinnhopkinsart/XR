import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="hero hero--small">
      <h1 className="hero__title">
        <span className="plate">Not here</span>
      </h1>
      <p className="hero__lede">
        <span className="plate">
          This address does not match a work. <Link to="/">See the works.</Link>
        </span>
      </p>
    </section>
  );
}
