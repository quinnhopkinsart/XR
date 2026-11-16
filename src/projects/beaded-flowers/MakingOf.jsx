import LoopVideo from '../../components/LoopVideo.jsx';

import lineup from './making-of/lineup.jpg';
import photoVs3d from './making-of/photo_vs_3d.jpg';
import buildMp4 from './making-of/build.mp4?url';
import buildWebm from './making-of/build.webm?url';
import buildPoster from './making-of/build_poster.jpg';
import meshRoute from './making-of/mesh_route.jpg';
import flatPanels from './making-of/flat_panels.jpg';
import sprites from './making-of/sprites.jpg';
import ladderMp4 from './making-of/ladder.mp4?url';
import ladderWebm from './making-of/ladder.webm?url';
import ladderPoster from './making-of/ladder_poster.jpg';
import windMp4 from './making-of/wind.mp4?url';
import windWebm from './making-of/wind.webm?url';
import windPoster from './making-of/wind_poster.jpg';
import g01 from './making-of/g01.jpg';
import g02 from './making-of/g02.jpg';
import g03 from './making-of/g03.jpg';
import g05 from './making-of/g05.jpg';

// The making-of for Beaded Flowers. The page's own text (summary, description, credits) is
// in content.json; this is the story of how the flowers were built, set in the work page
// after the description. Every picture and video sits on a black panel, because the renders
// have a near-black ground of their own.

function Figure({ caption, children }) {
  return (
    <figure className="making__fig">
      <div className="making__media">{children}</div>
      <figcaption className="label">{caption}</figcaption>
    </figure>
  );
}

const Img = ({ src, w, h, alt }) => <img src={src} width={w} height={h} alt={alt} loading="lazy" decoding="async" />;

const FLOWERS = [
  { img: g01, alt: 'A coneflower head with dull yellow beads and a black centre beside the same head in bright yellow with an orange centre.', title: 'Dull yellows, black centre', line: 'The Diffuse Color pass misses glass colour. A custom Base Color pass fixed it.' },
  { img: g02, alt: 'A green and red normal map beside a correct blue-purple normal map of the same coneflower head.', title: 'Normals facing away', line: 'Cycles camera space points Z away from you. Flipping Z fixed it.' },
  { img: g03, alt: 'A flower rig re-imported with 10 bones beside the same rig with 13 bones, the three missing tip bones highlighted.', title: 'Missing bones', line: 'Ignore Leaf Bones drops the last bone of each chain. Off, all 13 came back.' },
  { img: g05, alt: 'Two close-ups of the same beaded card, lit from the wrong side and from the right side.', title: 'Light from the wrong side', line: 'Unreal flipped a green channel I had already flipped. Two flips, wrong light.' },
];

export default function MakingOf({ credits }) {
  return (
    <div className="making">
      <h2 className="label plate making__kicker">Making of</h2>

      <div className="prose making__prose">
        <p>
          Robyn and I started this at the Banff Centre as a way to work together. She gave me a
          photo of one of her beaded florals, where each flower represents the land and stories of
          Métis folklore. I modelled it bead by bead, then built seven of its flowers as standalone
          plants.
        </p>

        <Figure caption="Eight flowers from one beaded floral, rendered in Cycles.">
          <Img
            src={lineup}
            w={2000}
            h={1112}
            alt="Eight beaded flowers rendered in 3D: asters, coneflowers, wild rice, blueberry, prairie crocus, table flowers, wolf willow and the full floral."
          />
        </Figure>

        <div className="making__pair">
          <Figure caption="Robyn's beadwork (left) and my 3D floral (right).">
            <Img
              src={photoVs3d}
              w={1600}
              h={1292}
              alt="Robyn Adams' beaded floral on black velvet beside the 3D version rendered in Cycles."
            />
          </Figure>
          <Figure caption="Rebuilt timelapse: the floral, strand by strand.">
            <LoopVideo
              mp4={buildMp4}
              webm={buildWebm}
              poster={buildPoster}
              width={960}
              height={540}
              label="Timelapse of the 3D floral appearing strand by strand."
            />
          </Figure>
        </div>

        <section className="section">
          <h2 className="label">The problem</h2>
          <p>
            Every bead is real geometry. The asters alone come to 5.5 million triangles. Robyn makes
            games, including <a href="https://www.robynadams.ca/video-game-design/">Kinship Table</a>,
            and she needs game-ready content.
          </p>
          <p>
            I tried cutting the polygon count first. The flowers came out mangled, the textures
            looked wrong, and they barely ran faster.
          </p>
          <Figure caption="Rebuilt: full detail (left), 2 percent (right). Still 570 times heavier than the cards.">
            <Img
              src={meshRoute}
              w={1600}
              h={900}
              alt="Close-up of beaded coneflowers at full detail beside a 2 percent decimated version with jagged, broken beads."
            />
          </Figure>
        </section>

        <section className="section">
          <h2 className="label">Billboards, in four steps</h2>
          <p>A billboard is a flat card carrying a picture of the beads.</p>
          <ol className="steps steps--media">
            <li>
              <div className="steps__text">
                <strong>Beadwork is already flat.</strong>
                <p>Almost every part is a panel one bead thick, so a flat card loses very little.</p>
              </div>
              <Figure caption="An aster head, face-on and edge-on.">
                <Img
                  src={flatPanels}
                  w={1600}
                  h={900}
                  alt="One beaded aster head seen face-on, and the same head seen edge-on as a thin vertical line."
                />
              </Figure>
            </li>
            <li>
              <div className="steps__text">
                <strong>Bake a sprite for each part.</strong>
                <p>
                  A straight-on camera renders flat colour, a cutout, and a normal map that tells the
                  light where each bead bulges.
                </p>
              </div>
              <Figure caption="From the bake: one coneflower head, four maps.">
                <Img
                  src={sprites}
                  w={1600}
                  h={420}
                  alt="Four versions of a coneflower head sprite: colour over a checkerboard, a black and white cutout, colour pushed past the edges, and a blue-purple normal map."
                />
              </Figure>
            </li>
            <li>
              <div className="steps__text">
                <strong>Swap the beads for cards.</strong>
                <p>Each part gets a card trimmed to its outline. Six triangles.</p>
                <p className="making__stat">Coneflowers: 2,460,000 triangles to 128.</p>
              </div>
              <Figure caption="From wireframe to beads to cards.">
                <LoopVideo
                  mp4={ladderMp4}
                  webm={ladderWebm}
                  poster={ladderPoster}
                  width={1280}
                  height={720}
                  label="Coneflowers shown as wireframe, solid, material preview, Cycles render, then billboard cards and their outlines."
                />
              </Figure>
            </li>
            <li>
              <div className="steps__text">
                <strong>Make them sway.</strong>
                <p>Sine waves drive a small rig and repeat every 120 frames, so the loop never pops.</p>
              </div>
              <Figure caption="Table Flowers, 4 seconds at 30 fps.">
                <LoopVideo
                  mp4={windMp4}
                  webm={windWebm}
                  poster={windPoster}
                  width={960}
                  height={540}
                  label="Table Flowers cards swaying in a four-second wind loop."
                />
              </Figure>
            </li>
          </ol>
        </section>

        <section className="section">
          <h2 className="label">Problems solved</h2>
          <ul className="making__cards">
            {FLOWERS.map((c) => (
              <li key={c.title}>
                <div className="making__media">
                  <Img src={c.img} w={1100} h={618} alt={c.alt} />
                </div>
                <h3>{c.title}</h3>
                <p>{c.line}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2 className="label">Automating it</h2>
          <p>
            By hand it's slow: forty-odd sprites, about 160 cards, eight rigs. Once I understood
            each step, I prompted Claude to write Python scripts that automated it for the rest of the
            flowers, pausing after every phase so I could check the result.
          </p>
          <p>Now the flowers go into games and onto the web.</p>
        </section>

        {credits}
      </div>
    </div>
  );
}
