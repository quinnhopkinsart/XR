# Noodin Studio XR

The home for my augmented reality and XR works. Each work is a self-contained module, so adding the next one means adding one folder.

Built with React 19, Vite, React Router and three.js. Deployed on AWS Amplify.

The models from each work float behind every page. They lean away from the pointer, swell when hovered and spin when tapped, and they rise with the page at different speeds by depth. On phones, tilting leans the camera and slides near pieces further than far ones. A Pause control (WCAG 2.2.2) and a Tilt toggle sit in the corner; both are remembered between visits, and both disappear for visitors with reduced motion turned on, since nothing moves for them. Builds can play inside their work page.

## Run it

```bash
npm install
npm run dev
```

## Add a work

```bash
npm run new -- "Work Title" --year 2027
```

Then edit `src/projects/work-title/project.js`. Full guide: [docs/ADDING-A-PROJECT.md](docs/ADDING-A-PROJECT.md).

## How it fits together

```
src/
  brand/
    tokens.css          colours, type, spacing (the whole look lives here)
    site.js             site name, canonical URL for QR codes, links
  projects/
    _template/          copied by `npm run new`
    <slug>/project.js   one folder per work, auto-discovered
    registry.js         finds every project.js, sorts, validates
    schema.js           field rules and defaults
    launch.js           where the Launch button goes
  field/
    FloatingField.jsx   gathers every work's models, loads three.js after first paint
    field.js            the floating background: placement, drift, pointer, tap, scroll, tilt
    motion.js           shared pause, tilt and embed state, gyroscope permission
    MotionControls.jsx  the Pause and Tilt buttons
  pages/                Home, work page, full-screen launch, 404
  components/           card, QR code, launch button, targets, status, build embed
public/
  builds/<slug>/        self-hosted 8th Wall builds, served as-is
scripts/
  new-project.mjs       scaffolds a work
  check-projects.mjs    validates every work before each build
```

Routes:

- `/` lists every work, with filters by medium.
- `/xr/<slug>` is the work page: description, how to try it, targets, credits, launch button and QR code.
- `/xr/<slug>/launch` opens a React experience full screen.
- `/builds/<slug>/index.html` serves a self-hosted build directly.
- `/ar/<slug>` redirects to `/xr/<slug>`, matching the URL pattern planned in the AR catalogue.

Every QR code opens the work's AR view directly: a build at `/builds/<slug>/index.html?view=ar`, an external link as it is, a React experience at `/xr/<slug>/launch`. A work with nothing to open falls back to `/xr/<slug>`. The code is drawn as black and white beads on deer hide (`BeadQR.jsx`), and the work page offers it as a PNG for print or an SVG.

## Deploy on Amplify

1. Amplify console > Create new app > GitHub > `quinnhopkinsart/XR`, branch `main`. Amplify reads `amplify.yml`.
2. App settings > Environment variables: set `VITE_SITE_URL` to the domain the site will live on (default `https://xr.noodin.studio`). The QR codes use it.
3. Hosting > Rewrites and redirects > Manage redirects, add this rule so React Router handles deep links:

   | Source address | Target address | Type |
   |---|---|---|
   | `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|jpeg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp\|glb\|gltf\|bin\|mp3\|mp4\|webm\|wasm\|mind\|usdz\|html\|md)$)([^.]+$)/>` | `/index.html` | 200 (Rewrite) |

   Paste the source without the backslashes in front of the pipes; they are only there to keep this table intact. The pattern skips any request ending in a file extension, so `/builds/<slug>/index.html` and model files are served directly.
4. Hosting > Custom domains: connect the domain through Route 53.

Pitfall: if `noodin.studio` already serves another Amplify app at the apex, connect this one as a subdomain (for example `xr.noodin.studio`) and update `VITE_SITE_URL` to match before printing any codes.

## Change the look

Edit `src/brand/tokens.css`. The palette is built around the Noodin orange-red `#FF3314`:

- **Black** carries the text, headings and panels.
- **Saffron** `#FFB31A` is the one bright accent, on the launch button and active states.
- **Oxblood** `#7A1004` sits in the shadows and lights the models from below.
- **White** appears only in tiny touches: card titles, the white beads of the QR code, focus rings inside black panels, and the marks in the logo.

Sora, set thin and uppercase, is the display type, as on noodinstudio.com. Body text is Inter, standing in for Wix's Madefor, which isn't available outside Wix. The floating field reads the same tokens, so the saffron and oxblood light on the models follows any change. Contrast ratios for each text pairing are noted at the top of the file.

The header wordmark and the landing title are set in Nova Round (`--font-wordmark`). The landing title (`src/components/WideTitle.jsx`) runs on one line, stretched horizontally to span the full page width at any screen size, and made bold with a text stroke, since Nova Round has a single weight. The font is self-hosted from `src/brand/fonts/` under the SIL Open Font License. The Noodin Studio logo sits in the centre of the header (`src/brand/logo-on-red.png`, the red-ground version of `logo.png`). Text that sits straight on the red ground has a solid red plate behind each line (`.plate`), so floating pieces pass behind the plate, never behind the letters. The description panel is solid red too.
