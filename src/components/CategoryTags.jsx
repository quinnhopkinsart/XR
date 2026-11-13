import { CATEGORIES } from '../projects/schema.js';

// Coloured tags for how a work is experienced. Colours come from the --tag-* tokens.
export default function CategoryTags({ categories }) {
  if (!categories?.length) return null;
  return (
    <ul className="tags" aria-label="Type">
      {categories.map((c) => (
        <li key={c} className={`tag tag--${CATEGORIES[c].tone}`}>
          {CATEGORIES[c].label}
        </li>
      ))}
    </ul>
  );
}
