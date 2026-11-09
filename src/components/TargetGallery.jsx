export default function TargetGallery({ targets }) {
  if (!targets?.length) return null;
  return (
    <ul className="targets">
      {targets.map((t) => (
        <li key={t.src}>
          <a href={t.src} target="_blank" rel="noreferrer">
            <img src={t.src} alt={t.alt || t.label} loading="lazy" />
          </a>
          <span>{t.label}</span>
        </li>
      ))}
    </ul>
  );
}
