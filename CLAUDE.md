# Notes for Claude

- Each XR work is one folder in `src/projects/<slug>/` with a `project.js` default export. The registry auto-discovers it. Do not add works to a central list.
- Field rules live in `src/projects/schema.js`; the human guide is `docs/ADDING-A-PROJECT.md`. Keep the two in sync when a field changes.
- Scaffold new works with `npm run new -- "Title"` (add `--build` for a self-hosted 8th Wall build).
- Colours and type come only from `src/brand/tokens.css`. Components never hard-code colours.
- Copy follows Quinn's voice: first person for site copy, declarative present tense for work descriptions, no em-dashes, no rhetorical questions, no "immersive", "stunning", "vibrant", "unique", "bridging two worlds". Anishinaabemowin is translated in the same clause on first use, never italicized. Non-human figures are relatives, presences and forces, never symbols.
- Run `npm run build` before committing; it runs `npm run check` first.
- 8th.io links stop working on February 28, 2027. Use `legacy` on any work still pointing at one.
- The floating background (`src/field/`) collects `models` from every project.js. Add 3D pieces there, never in the field code. Keep each .glb under about 2 MB (Draco via `npx @gltf-transform/cli draco`).
- Palette: orange-red `--ground`, `--black` for text and panels, `--saffron` as the one accent, `--oxblood` in shadows, `--white` in tiny touches only. Text on `--ground` is black; text on black panels is `--on-panel` (orange-red) or `--on-panel-strong` (white) for titles; text on saffron is black. Never saffron or white text on the ground. Check contrast before adding a new pairing.
- Nova Round (`--font-wordmark`, self-hosted in src/brand/fonts, SIL OFL) sets the header wordmark and the landing title. The landing title is WideTitle.jsx: one line, stretched to span the full page width inside the gutters, made bold with a text stroke since Nova Round has one weight. Everything else keeps Sora and Inter.
- Text that sits straight on the red ground gets a solid red plate (`<span class="plate">`, or the plate rules for short labels in global.css), so floating pieces pass behind the plate, never behind the letters.
- The Trading Post Humanism build's logo (`#brand-home` in its index.html) links to `/` with target="_top". Re-exporting the build from 8th Wall overwrites index.html, so carry that change into the source project.
