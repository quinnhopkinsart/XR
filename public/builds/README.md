# Self-hosted builds

One folder per work: `public/builds/<slug>/`. Copy the full output of a self-hosted 8th Wall build (or any static WebAR build) in here, with `index.html` at the top of the folder.

Vite copies this folder into `dist/` untouched, so the build is served at `/builds/<slug>/index.html`.

Asset paths inside the build must be relative (`./bundle.js`) or start with `/builds/<slug>/`. A build that asks for `/bundle.js` will 404. In an 8th Wall webpack config, set `output.publicPath` to `'./'` before building.

## Additions kept outside an export

Trading Post Humanism carries two changes that a fresh 8th Wall export overwrites:

- `tilt.js`: phone tilt drives the 3D view's look, through the same pointermove events the mouse uses. Re-add `<script src="tilt.js"></script>` after `bundle.js`, the `#tilt-btn` button beside `#ar-btn`, and its CSS.
- The logo link: `#brand-home` wraps the logo and goes to `/` with `target="_top"`, so it leaves the frame on the work page.

## Biidaaban

Built from the 8th Wall project `Documents\8th Wall\TwoEyedSeeing`. The 3D carousel, its Play button, captions, tilt and the logo link all live in that project's `src/` (`src/desktop/`, `src/common/`, `src/index.html`), so a rebuild keeps them. ?view=ar runs the original camera AR.

```
npm run build -- --output-public-path=./
```

Copy `dist/` here, then trim `image-targets/` to the `.json` files and the `_luminance.jpg` images. The engine loads only those.

## Stellar Narratives

Built from the `stellar-narratives` project folder (8thWall Projects), an 8th Wall code-only export given a build setup, the self-hosted engine and a 3D view. The 3D view, the scene template and the rebuilt scanner shader live in that project's `src/`, so a rebuild keeps them. Its README lists every change from the hosted project.

```
npm run build
```

Copy `dist/` here. `?view=ar` runs the camera AR on the two mural targets, `t1` (city) and `t2` (bush).

## 13 Moon Calendar

Built from the `dibiki-giizis-selfhosted` project folder (8thWall Projects), the 8th Wall code-only export "dibiki-giizis" given a build setup, the self-hosted engine and a 3D view. Its README lists every change from the hosted project.

```
npm run build
```

Copy `dist/` here. The work is made for a picture on the floor: the 3D view lays the target on the ground, and `?view=ar` runs the camera AR on the one target, `Moon_target`. The moon maths (`src/components/moons.js`) is the same file Stellar Narratives uses.
