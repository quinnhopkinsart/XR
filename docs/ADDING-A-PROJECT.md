# Adding a project

Every work is one folder in `src/projects/`. The folder name is the URL: `src/projects/biidaaban/` becomes `/xr/biidaaban`. The home grid, the work page, the QR code and the filters all build themselves from `project.js`. Nothing else needs editing.

## 1. Scaffold

```bash
npm run new -- "Biidaaban" --year 2026            # React experience in the repo
npm run new -- "Wildlife Portals XR" --build       # self-hosted 8th Wall build
```

This copies `src/projects/_template/` into a new folder and fills in the title, year and slug.

## 2. Fill in project.js

| Field | Required | What it does |
|---|---|---|
| `title` | yes | Shown on the card and as the page heading. |
| `year` | yes | String. Sorts the grid, newest first. `'2024'` or `'2024 to 2025'` both work; sorting reads the first four digits. |
| `summary` | yes | One sentence for the card. |
| `description` | yes | Array of paragraphs. Follow the voice guide in the Noodin Studio Website project. |
| `kind` | no | Medium. Drives the filter buttons on the home page. Default `'Augmented reality'`. Use the same wording across works, for example `'Interactive projection'`, `'Virtual reality'`. |
| `status` | no | `live`, `migrating`, `in-development` or `archived`. Default `live`. Anything but `live` shows a pill. |
| `venue`, `location` | no | Shown in the page header. |
| `howTo` | no | Array of steps for the "How to try it" list. |
| `credits` | no | `[{ role: 'Commissioned by', name: 'City of Toronto' }]` |
| `launch` | no | Where the Launch button goes. See below. `null` hides the button. |
| `legacy` | no | `{ url: 'https://8th.io/xxxxx', until: '2027-02-28' }`. When `launch.url` matches, the page shows the shutdown date and hides the button after it. |
| `cover` | no | Imported image. Without one, the card shows the title set in type. |
| `coverAlt` | no | Alt text for the cover on the work page. |
| `targets` | no | `[{ src: importedImage, label: 'Panel 1', alt: '...' }]`. Listed so people can try the work away from the site. |
| `tags` | no | Free-form, not shown yet. |
| `order` | no | Higher numbers sit first within the same year. |
| `slug` | no | Overrides the folder name. Leave it out. |

### Images

Put images in the work's folder and import them so Vite fingerprints and caches them:

```js
import cover from './cover.jpg';
import panel1 from './targets/panel-1.jpg';

export default {
  // ...
  cover,
  targets: [{ src: panel1, label: 'Panel 1' }],
};
```

Keep covers around 1600 px on the long edge. The 2400 px web exports from the portfolio folders work, but they are heavier than a card needs.

## 3. Pick a launch type

**`build`**: a self-hosted 8th Wall build, or any static WebAR build.

```js
launch: { type: 'build', path: '/builds/wildlife-portals-xr/index.html' },
```

Copy the build output into `public/builds/<slug>/`. Asset paths in the build must be relative; see `public/builds/README.md`. `npm run check` fails if `index.html` is missing, so a half-moved work cannot ship.

**`external`**: hosted somewhere else, such as the 8th.io link until February 28, 2027, a subdomain like `mcdonald-physics.noodin.studio`, or STYLY.

```js
launch: { type: 'external', url: 'https://8th.io/997et' },
legacy: { url: 'https://8th.io/997et', until: '2027-02-28' },
```

**`component`**: a React experience that lives in this repo (WebXR, three.js, react-three-fiber, camera or sensor work). It opens full screen at `/xr/<slug>/launch` and loads only when someone opens it.

```js
launch: { type: 'component', load: () => import('./Experience.jsx') },
```

## 4. Check and ship

```bash
npm run dev      # http://localhost:5173/xr/<slug>
npm run check    # validates every project.js
npm run build    # runs check, then builds to dist/
```

Push to `main` and Amplify deploys. Phones need HTTPS for the camera, so test AR on the deployed site or an Amplify preview branch, not on `localhost` over Wi-Fi.

## Moving a work off 8th Wall

1. Build the export with the self-hosted engine (see the AR Catalogue 2026 README for that work).
2. Copy the output to `public/builds/<slug>/`.
3. Change `launch` from `external` to `build`, delete `legacy`, set `status: 'live'`.

The QR code on the page already points at `/xr/<slug>`, so printed codes keep working through the move.
