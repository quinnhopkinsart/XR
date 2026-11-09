// A React-native experience, opened full screen at /xr/<slug>/launch.
// Use this for WebXR, three.js / react-three-fiber, camera or sensor work that
// lives inside this repo. For a self-hosted 8th Wall build, delete this file
// and use launch: { type: 'build', ... } instead.
//
// Heavy libraries imported here are code-split: they load only when someone
// opens this work, never on the home page.

export default function Experience({ project }) {
  return (
    <div className="stage__loading">
      <p>{project.title}: the experience goes here.</p>
    </div>
  );
}
