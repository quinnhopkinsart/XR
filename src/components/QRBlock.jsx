import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { workUrl } from '../brand/site.js';

/**
 * The code points at this site's page for the work, never at the hosting
 * provider, so moving the experience later only means editing project.js.
 */
export default function QRBlock({ slug, title }) {
  const ref = useRef(null);
  const url = workUrl(slug);

  const download = () => {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <figure className="qr">
      <div className="qr__code" ref={ref}>
        <QRCodeSVG
          value={url}
          size={176}
          level="M"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#000000"
          title={`QR code for ${title}`}
        />
      </div>
      <figcaption>
        <span className="qr__url">{url.replace(/^https:\/\//, '')}</span>
        <button type="button" className="textbutton" onClick={download}>
          Download SVG
        </button>
      </figcaption>
    </figure>
  );
}
