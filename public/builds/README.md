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

Copy `dist/` here. The 3D view hangs one print at a time on a wall with its portal open. `?view=ar` runs the camera AR on all five targets at once: `PolarBearTarget`, `eagleTarget`, `deerTarget`, `lynxTarget`, `salmonTarget`. The models are meshopt-compressed and the decoder ships in `external/vendor/meshopt_decoder.js`, so nothing loads from 8th Wall's CDN. The camera's screen shows what a virtual camera on its lens sees (`live-view.js`). `arctic-sea-animals.glb` is fixed by `config/fix-animals.mjs` in the source folder: re-run it if that model is ever replaced.

## Aabijijiwan

Not an 8th Wall build: a plain three.js viewer (three 0.170 vendored in `vendor/`, no build step) for the design model of the suspended sculpture. It began as the standalone "Aabijijiwan 360 viewer" and was reworked for this site: the site's colours, type and cursor (copied into `style.css`, since a build cannot read `tokens.css`), the sculpture hung from a ceiling slab, a 1.7 m figure for scale, and a visitor's camera at eye height that walks the floor instead of orbiting.

- The room is set by four numbers at the top of `main.js`: `FOOTPRINT` (the installed size, 8 m long by 8 m tall by 2 m wide; the model is fitted to it on each axis), `CLEARANCE` (floor to the lowest point of the sculpture, 5.0 m), `EYE`, `FIGURE` and `ROOM`. The Rev E export measures 7.72 x 8.03 x 2.04 m, so the fit is slight: 3.6% longer, 0.4% shorter and 1.7% narrower. Set `FOOTPRINT` to null to show the model exactly as exported.
- To update the model, re-export from `Baketigweyaa_AR.blend` with Draco on and replace `models/aabijijiwan.glb`. Metres, Y up. The viewer measures the model, fits it to `FOOTPRINT` and hangs it, so nothing else needs changing.
- There is no camera AR. `?view=ar` is ignored, and the work's QR code opens the viewer without it (`hasAR` in `src/projects/launch.js`).
- The statement text is from `AJW_statements.md` v3, with Kaswentha, the Two Row Wampum belt, named in the second paragraph at Quinn's request (November 13, 2026). The work was hidden at first and has been listed on the home grid since that day.
- The room (`room.js`) is the centre's atrium, rebuilt as simple planes and boxes from MJMA's art extents diagrams (231219, sheets A01 to A03) and their interior render. From the drawings: the levels (Level 2 floor at 0, Level 3 at 5 m, Level 4 at 10 m, Level 4 ceiling at 13.5 m), the 5.95 m between grids G and H with the art zone 2.66 m from G, the 5 m beam bays, the west wall and the wood block under the work. Read off the render by eye: the facade's slat and window pattern, the V columns, the stair, and everything east of grid 4. It is for sense of place, not for measuring.
- The work hangs by its wooden suspension plate (`PLATE_FLUSH` in `main.js`): the plate's top face is flush with the Level 4 ceiling at 13.5 m and the steel posts above it are hidden in the ceiling. In the Rev E model the plate's top is 7.14 m above the lowest point, so the lowest point ends up 6.36 m above the Level 2 floor. MJMA's maximum art envelope runs from 4.575 m to 12.575 m. To bring the lowest point down to 5 m with the plate still flush, lengthen the cables in the Blender file and re-export. Setting `PLATE_FLUSH` to false hangs the work by `CLEARANCE` (5.0 m) instead, with rods drawn up to the ceiling.
- Outside the windows is a 360 degree park photo (`env/`, see its README). It is a CC0 stand-in from Poly Haven, not Moss Park. The work's reflections come from one look around the finished room from the centre of the work (`reflectRoom` in `main.js`), so the mirror tiles show the atrium.

## Woodland Be[AR]

Not an 8th Wall export: the work was a Spark AR effect, so this build is new and the files here are its source. Plain three.js (0.170, vendored in `vendor/`), no build step.

- `main.js`: the scene, the lights, and the controls both views share: turn left and right, smaller and bigger, reset, and Motion on or off (the breathing). Arrow keys turn, plus and minus resize, 0 resets.
- `sculpture.js`: loads `models/woodland-bear.glb`, fits it to `HEIGHT` (1.5 m at 100%) and makes it breathe: the colour layers move out from the body and back in on one axis, the one they stand off it on. The `BREATH` values set how far they travel, how long a breath takes and how much the outer layers trail the inner ones. Nothing bobs, rocks or sways. Motion is off for visitors with reduced motion turned on.
- `viewer.js`: the 3D view. Drag orbits, pinch or scroll zooms (inside the work page the wheel zooms only with ctrl, so the page still scrolls). The sculpture does not turn on its own.
- `ar.js`: `?view=ar`. World tracking on the self-hosted engine (`external/xr/xr.js` and `xr-slam.js`, nothing else from 8th Wall). Start AR asks for the camera and, on iOS, the motion sensors. Tap the ground to move the sculpture, drag to turn it, pinch to resize or twist. The round button takes a photo of the camera picture with the sculpture on it, then offers Share and Save. The floor is y = 0 and the phone starts `EYE` (1.4) units up, so a unit is about a metre.
- The model is made from `WoodlandBear_mural.glb` in `Documents\Art\2022\Medicine Bear\Project Files` with `optimize.mjs` (in `Medicine Bear\\Code\\Web`; the output is also in `Medicine Bear\\3D\\Web`): 633,000 triangles and 17 MB down to about 75,000 and 300 KB, Draco-compressed, with the 52 colour parts kept as separate nodes and the black body as `Body` and `Outline`. Re-run it and replace the .glb here and in `src/projects/woodland-bear/models/` if the sculpture changes.
- `style.css` copies the site's tokens. The stage is saffron because the red parts disappear on the red ground.
- Tested in headless Chromium only. World tracking, the motion prompt on iOS and the photo share sheet need a real phone.

## She Bends the Light to Her Will

A collaboration with Feather Miigwans. Plain three.js (0.170 in `vendor/`), no build step, so the files here are the source. It is rebuilt from the 8th Wall export `she-bends-the-light-to-her-will.zip` (8th Wall Projects\Archives), an A-Frame 1.4.1 world-tracking scene.

- `main.js` is the scene both views share. The numbers at the top (`MOON`, `RAYS`, `STAR`, `WORD`) are the ones in the export's `body.html` and `components.js`: the moon's height and float, 200 rays in a cone, the half-metre star, and words at half size that take a new place across their row every 3 seconds and show for 5 when the star is within half a metre.
- `viewer.js` is the 3D view. The star follows the pointer: the mouse, one finger, or the arrow keys. Dragging with the mouse or two fingers looks around. The ground is a dark stage in the colours of the work's opening picture, and until someone aims the light it drifts on its own.
- `ar.js` is `?view=ar`: world tracking on the self-hosted engine (`external/xr/xr.js` and `xr-slam.js`, nothing else from 8th Wall). As in the export, the phone starts at (0, 2, 2) facing the moon at (0, 2, 0), the camera picture is black and white, darkened, with a vignette (the export's shader, unchanged), the star sits on the floor where the phone points, pulled 3 units back toward the visitor, a tap recentres the scene and a drag turns the moon. Start AR starts the sound.
- Changes from the export, in both views: a word shows when the light is on its letters (the export measures from each model's origin, which sits off to one side); a word stays put while it is showing; words fade in and out.
- Changes in AR: the star's 3-unit pull follows the visitor as they turn (the export pulls along a fixed axis, which only suits someone who never turns); the round button takes a photo with the engine's `CanvasScreenshot` and offers Share and Save, where the export recorded video through xrextras with a Noodin Studio watermark. No xrextras, landing page, A-Frame or 8frame.
- Sound: `assets/feather-ambient.mp3` is the export's `Feather_Ambient.mp3` at 128 kbps (2.5 MB, from 6.3 MB), looped at the export's volume.
- The export's three image targets are unused leftovers (two from 13 Moon Calendar, one 8th Wall sample) and are not here.
- Tested in headless Chromium only, AR with a fake camera and no gyroscope. Tracking, the motion prompt on iOS, sound and the share sheet need a real phone.
