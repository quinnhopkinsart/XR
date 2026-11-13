import { useRef } from 'react';
import BeadQR, { serializeBeadQR } from './BeadQR.jsx';
import { arUrl, hasAR } from '../projects/launch.js';

const PNG_SIZE = 2400;

function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * The code opens the AR view directly. Builds read ?view=ar as "open the camera",
 * so a phone that scans it goes straight to the camera, not the work page.
 */
export default function QRBlock({ project }) {
  const ref = useRef(null);
  const url = arUrl(project);
  const ar = hasAR(project);
  const name = `${project.slug}-${ar ? 'ar-' : ''}qr`;

  const downloadSvg = () => {
    if (!ref.current) return;
    save(new Blob([serializeBeadQR(ref.current)], { type: 'image/svg+xml' }), `${name}.svg`);
  };

  // PNG for print: some layout and print tools skip SVG filters and gradients.
  const downloadPng = () => {
    if (!ref.current) return;
    const svgUrl = URL.createObjectURL(
      new Blob([serializeBeadQR(ref.current, PNG_SIZE)], { type: 'image/svg+xml' }),
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = PNG_SIZE;
      canvas.getContext('2d').drawImage(img, 0, 0, PNG_SIZE, PNG_SIZE);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => blob && save(blob, `${name}.png`), 'image/png');
    };
    img.src = svgUrl;
  };

  return (
    <figure className="qr">
      <div className="qr__code">
        <BeadQR ref={ref} value={url} title={`QR code that opens ${project.title}${ar ? ' in AR' : ' on your phone'}`} />
      </div>
      <figcaption>
        <span className="qr__label">{ar ? 'Scan to open in AR' : 'Scan to open on your phone'}</span>
        <span className="qr__url">{url.replace(/^https:\/\//, '')}</span>
        <span className="qr__downloads">
          <button type="button" className="textbutton" onClick={downloadPng}>
            Download PNG
          </button>
          <button type="button" className="textbutton" onClick={downloadSvg}>
            Download SVG
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
