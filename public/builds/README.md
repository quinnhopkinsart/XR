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

## Wildlife Portals XR

Built from the `wildlife-ar-selfhosted` project folder (8thWall Projects). The 8th Wall export "wildlife-ar" had the engine and the targets but no scene code, so the scenes, models and images were recovered from the hosted app (`wildlife-ar-hosted-recovery.zip` beside the folder) and rebuilt as A-Frame, the same setup as Stellar Narratives. Its README lists every change from the hosted project.

```
npm run build
```

Copy `dist/` here. The 3D view hangs one print at a time on a wall with its portal open. `?view=ar` runs the camera AR on all five targets at once: `PolarBearTarget`, `eagleTarget`, `deerTarget`, `lynxTarget`, `salmonTarget`. The models are meshopt-compressed and the decoder ships in `external/vendor/meshopt_decoder.js`, so nothing loads from 8th Wall's CDN. The camera's screen shows a live view (`live-view.js`). `arctic-sea-animals.glb` is fixed by `config/fix-animals.mjs` in the source folder: re-run it if that model is ever replaced.

## The Erratics

Built from the `the-erratics-selfhosted` project folder (8thWall Projects). It merges two 8th Wall Studio projects, "the-erratic-at-dunlop-gallery" (the three Central Branch walls) and "the-erratics-sherwood", into one scene with four spaces, one per wall. It runs on the Studio runtime, like Biidaaban, not A-Frame. The 3D view (`src/desktop/`), the wall list (`src/common/views.ts`) and the AR wall switching (`src/app.ts`) live in that folder's `src/`. Its README lists every change from the hosted projects.

```
npm run build
```

Copy `dist/` here (the webpack config cleans `dist/` first). The 3D view shows one wall at a time and paints each hider box with the mural photo, so the doorway sits in the wall the way it does in AR. `?view=ar` tracks all four targets at once: `Dunlop-Central Branch-left-target`, `-middle-target`, `-right-target` and `Dunlop-SherwoodBranch-Erratic-print-small`. Whichever one the camera finds loads its space. `?wall=central-left|central-middle|central-right|sherwood` picks the first wall in either view. Models are Draco-compressed with WebP textures; the Studio runtime decodes Draco from its own `external/runtime/resources/draco/`, so nothing loads from 8th Wall's CDN.
