# Self-hosted builds

One folder per work: `public/builds/<slug>/`. Copy the full output of a self-hosted 8th Wall build (or any static WebAR build) in here, with `index.html` at the top of the folder.

Vite copies this folder into `dist/` untouched, so the build is served at `/builds/<slug>/index.html`.

Asset paths inside the build must be relative (`./bundle.js`) or start with `/builds/<slug>/`. A build that asks for `/bundle.js` will 404. In an 8th Wall webpack config, set `output.publicPath` to `'./'` before building.

## Additions kept outside an export

Trading Post Humanism carries two changes that a fresh 8th Wall export overwrites:

- `tilt.js`: phone tilt drives the 3D view's look, through the same pointermove events the mouse uses. Re-add `<script src="tilt.js"></script>` after `bundle.js`, the `#tilt-btn` button beside `#ar-btn`, and its CSS.
- The logo link: `#brand-home` wraps the logo and goes to `/` with `target="_top"`, so it leaves the frame on the work page.
