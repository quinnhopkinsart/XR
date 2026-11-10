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

Every QR code points at `/xr/<slug>` on this site, never at the hosting provider. When a work moves from 8th.io to a self-hosted build, only `project.js` changes and printed codes keep working.

## Deploy on Amplify

1. Amplify console > Create new app > GitHub > `quinnhopkinsart/XR`, branch `main`. Amplify reads `amplify.yml`.
2. App settings > Environment variables: set `VITE_SITE_URL` to the domain the site will live on (default `https://noodin.studio`). The QR codes use it.
3. Hosting > Rewrites and redirects > Manage redirects, add this rule so React Router handles deep links:

   | Source address | Target address | Type |
   |---|---|---|
   | `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|jpeg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp\|glb\|gltf\|bin\|mp3\|mp4\|webm\|wasm\|mind\|usdz\|html\|md)$)([^.]+$)/>` | `/index.html` | 200 (Rewrite) |

   Paste the source without the backslashes in front of the pipes; they are only there to keep this table intact. The pattern skips any request ending in a file extension, so `/builds/<slug>/index.html` and model files are served directly.
4. Hosting > Custom domains: connect the domain through Route 53.

Pitfall: if `noodin.studio` already serves another Amplify app at the apex, connect this one as a subdomain (for example `xr.noodin.studio`) and update `VITE_SITE_URL` to match before printing any codes.

## Change the look

Edit `src/brand/tokens.css`. The ground is the Noodin red-orange `#FF3314`, with deep purple and forest green as accents. The floating field reads the same tokens, so the purple and green light on the models follows any change. Contrast ratios for each text pairing are noted at the top of the file.

Type follows the Noodin Studio logo. Surfaces read like the city around the organic work:

- **Type.** Comfortaa for display, a monoline face with a fully round lowercase n, set lowercase. Nunito for reading. Both are self-hosted through `@fontsource`, so there's no Google Fonts request.
- **Glass.** Cards, the description, the sidebar, the embed bar, the footer and the controls are hard-edged translucent panels (`--glass-purple`, `--glass-forest`). They have a background blur, cream hairline edges and hard offset shadows (`--shadow-hard`), and the floating models show through them softly. The glass stays dark enough that cream text holds 8.5:1 or better whatever passes behind.
- **Spray lines.** The one raw mark. `src/brand/SprayFilters.jsx` holds `#spray`: a thrown line with a crisp core and a speckled overspray. Section rules use it, and `SprayTag.jsx` draws a single tag under each big title.
- **Plates.** The hero lede sits on hard-edged red plates (`.plate`), so it stays readable as pieces drift behind.
- **Grain.** A light stipple over the page ground only (`src/brand/grain.png`).
- **Logo.** `src/brand/logo.png` is the original artwork. `logo-on-red.png` is the version for the red ground, with grey strokes in cream and red marks in deep purple, and the grain untouched. The favicon is the central arch and spiral.
