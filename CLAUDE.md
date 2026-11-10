# Notes for Claude

- Each XR work is one folder in `src/projects/<slug>/` with a `project.js` default export. The registry auto-discovers it. Do not add works to a central list.
- Field rules live in `src/projects/schema.js`; the human guide is `docs/ADDING-A-PROJECT.md`. Keep the two in sync when a field changes.
- Scaffold new works with `npm run new -- "Title"` (add `--build` for a self-hosted 8th Wall build).
- Colours and type come only from `src/brand/tokens.css`. Components never hard-code colours.
- Copy follows Quinn's voice: first person for site copy, declarative present tense for work descriptions, no em-dashes, no rhetorical questions, no "immersive", "stunning", "vibrant", "unique", "bridging two worlds". Anishinaabemowin is translated in the same clause on first use, never italicized. Non-human figures are relatives, presences and forces, never symbols.
- Run `npm run build` before committing; it runs `npm run check` first.
- 8th.io links stop working on February 28, 2027. Use `legacy` on any work still pointing at one.
- The floating background (`src/field/`) collects `models` from every project.js. Add 3D pieces there, never in the field code. Keep each .glb under about 2 MB (Draco via `npx @gltf-transform/cli draco`).
- Text on `--ground` uses `--ink` or `--heading`; text on `--purple` or `--forest` uses `--cream`. Check contrast before adding a new pairing.
- Display type is Comfortaa, set lowercase; body is Nunito. Both are self-hosted via @fontsource, imported in src/main.jsx.
- Surfaces are hard-edged glass: `--glass-purple`/`--glass-forest`, `--blur`, a `--hairline` border and `--shadow-hard`. No rounded corners. The only raw mark is spray paint (`url(#spray)`, SprayTag.jsx) on lines and tags, never on reading text.
- Text that can sit over the 3D field needs a solid or glass backing (`.plate`, glass panels) so contrast holds.
