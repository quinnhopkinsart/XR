import { STATUSES } from '../projects/schema.js';

export default function StatusPill({ status }) {
  return (
    <span className={`pill pill--${status}`}>
      <span className="pill__dot" aria-hidden="true" />
      {STATUSES[status] || status}
    </span>
  );
}
