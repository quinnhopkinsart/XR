// The lens: depth of field for the floating field, drawn after the scene.
//
// It replaces three's BokehPass, which drew a second depth pass with an override material.
// That pass could not draw the work titles (sprites), so a title took the depth of whatever
// stood behind it and was blurred to match, out of step with the work it names. This lens
// reads the depth the scene was drawn with, so every title, cut-out and line sits at its own
// depth.
//
// Three passes a frame, all cheap next to the scene:
//   1. focus   one pixel that holds the distance in focus. It eases toward a distance the
//              field gives it, or, in free roam, toward the depth under the pointer, as
//              an autofocus does (`focus.mouse`, `focus.point`). Where the pointer is over
//              empty sky the focus stays where it was.
//   2. coc     the scene's colour with each pixel's circle of confusion in alpha: how far its
//              light spreads, in pixels, negative in front of the focus and positive behind.
//   3. gather  each pixel collects light from a disc of neighbours, weighted by whether the
//              neighbour's own blur reaches it. That keeps a sharp work crisp against a
//              blurred ground and lets a blurred foreground spread over what is behind it
//              (a disc bokeh, not a box blur).
//
// The circle of confusion follows a thin lens: it grows with how far a thing is from the focus
// in proportion to its own distance, `(distance - focus) / distance`, so the same setting works
// when the focus is five units out or ninety. `tol` is the part of that ratio kept sharp, which
// is the depth of field itself.

import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const DEPTH = /* glsl */ `
  #include <packing>
  uniform sampler2D tDepth;
  uniform float uNear;
  uniform float uFar;
  // How far along the view axis the surface at this point is.
  float distAt(vec2 uv) {
    return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar);
  }
`;

const FOCUS_FRAG = /* glsl */ `
  ${DEPTH}
  uniform sampler2D tPrev;
  uniform vec2 uPoint;
  uniform vec2 uTexel;
  uniform float uExplicit;
  uniform float uMouse;
  uniform float uRate;
  uniform float uSnap;
  varying vec2 vUv;
  void main() {
    float prev = max(texture2D(tPrev, vec2(0.5)).r, 0.5);
    float target = uExplicit;
    if (uMouse > 0.5) {
      float limit = uFar * 0.97;
      float here = distAt(uPoint);
      if (here < limit) {
        target = here;
      } else {
        // Just off an edge or a thin line: take the nearest surface close by.
        float best = limit;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7853982;
          best = min(best, distAt(uPoint + vec2(cos(a), sin(a)) * 8.0 * uTexel));
        }
        target = best < limit ? best : prev;
      }
    }
    target = max(target, 0.5);
    // Eased in the log of the distance, so a pull from near to far feels like one rack.
    float v = exp(mix(log(prev), log(target), uSnap > 0.5 ? 1.0 : uRate));
    gl_FragColor = vec4(v, 0.0, 0.0, 1.0);
  }
`;

const COC_FRAG = /* glsl */ `
  ${DEPTH}
  uniform sampler2D tDiffuse;
  uniform sampler2D tFocus;
  uniform float uWidth;
  uniform float uAperture;
  uniform float uMaxBack;
  uniform float uMaxNear;
  uniform float uTol;
  varying vec2 vUv;
  void main() {
    float focus = texture2D(tFocus, vec2(0.5)).r;
    float dist = distAt(vUv);
    float r = (dist - focus) / max(dist, 0.001);
    r = sign(r) * max(abs(r) - uTol, 0.0);
    float coc = clamp(uAperture * r, -uMaxNear, uMaxBack) * uWidth;
    gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, coc);
  }
`;

const GATHER_FRAG = /* glsl */ `
  #define TAPS 32
  uniform sampler2D tCoc;
  uniform vec2 uRes;
  uniform float uRadius;
  uniform float uBoost;
  varying vec2 vUv;
  float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  }
  void main() {
    vec4 centre = texture2D(tCoc, vUv);
    float own = abs(centre.a);
    vec3 sum = centre.rgb;
    float weight = 1.0;
    // Each pixel turns the same spiral by its own small angle: no rings, only fine grain.
    float spin = 6.2831853 * ign(gl_FragCoord.xy);
    for (int i = 0; i < TAPS; i++) {
      float t = (float(i) + 0.5) / float(TAPS);
      float reach = sqrt(t) * uRadius;
      float a = float(i) * 2.3999632 + spin;
      vec4 s = texture2D(tCoc, vUv + vec2(cos(a), sin(a)) * reach / uRes);
      float blur = abs(s.a);
      // Something behind this pixel cannot spill further than this pixel's own blur.
      if (s.a > centre.a) blur = min(blur, own);
      float w = clamp(blur - reach + 1.0, 0.0, 1.0);
      float l = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
      w *= 1.0 + uBoost * smoothstep(0.8, 2.5, l);
      sum += s.rgb * w;
      weight += w;
    }
    gl_FragColor = vec4(sum / weight, 1.0);
  }
`;

const quadMaterial = (fragmentShader, uniforms) =>
  new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });

export class LensPass extends Pass {
  constructor(camera) {
    super();
    this.camera = camera;
    this.needsSwap = true;

    // What the field sets each frame.
    this.focus = {
      explicit: 14, // the distance to hold when the pointer is not choosing
      mouse: false, // focus on whatever is under `point`
      point: new THREE.Vector2(0.5, 0.5), // 0 to 1 across the screen, y up
      rate: 0.16, // how much of the way to the new distance it goes each frame
    };
    this.lens = { aperture: 0.02, back: 0.01, near: 0.005, tol: 0.08, boost: 0.6 };
    this.snap = true; // jump to the first distance, not ease to it

    this.res = new THREE.Vector2(1, 1);
    this.cocTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.focusTargets = [0, 1].map(
      () =>
        new THREE.WebGLRenderTarget(1, 1, {
          type: THREE.FloatType,
          depthBuffer: false,
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
        }),
    );
    this.read = 0;

    this.focusMaterial = quadMaterial(FOCUS_FRAG, {
      tDepth: { value: null },
      tPrev: { value: null },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      uPoint: { value: this.focus.point },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uExplicit: { value: 14 },
      uMouse: { value: 0 },
      uRate: { value: 0.16 },
      uSnap: { value: 1 },
    });
    this.cocMaterial = quadMaterial(COC_FRAG, {
      tDepth: { value: null },
      tDiffuse: { value: null },
      tFocus: { value: null },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      uWidth: { value: 1 },
      uAperture: { value: 0 },
      uMaxBack: { value: 0 },
      uMaxNear: { value: 0 },
      uTol: { value: 0 },
    });
    this.gatherMaterial = quadMaterial(GATHER_FRAG, {
      tCoc: { value: this.cocTarget.texture },
      uRes: { value: this.res },
      uRadius: { value: 1 },
      uBoost: { value: 0 },
    });
    this.focusQuad = new FullScreenQuad(this.focusMaterial);
    this.cocQuad = new FullScreenQuad(this.cocMaterial);
    this.gatherQuad = new FullScreenQuad(this.gatherMaterial);
  }

  setSize(width, height) {
    this.res.set(width, height);
    this.cocTarget.setSize(width, height);
    this.focusMaterial.uniforms.uTexel.value.set(1 / width, 1 / height);
  }

  /** The distance the lens is focused at now, once a frame has been drawn. */
  render(renderer, writeBuffer, readBuffer) {
    const depth = readBuffer.depthTexture;
    if (!depth) return;
    const { camera, focus, lens } = this;

    const f = this.focusMaterial.uniforms;
    f.tDepth.value = depth;
    f.tPrev.value = this.focusTargets[this.read].texture;
    f.uNear.value = camera.near;
    f.uFar.value = camera.far;
    f.uExplicit.value = focus.explicit;
    f.uMouse.value = focus.mouse ? 1 : 0;
    f.uRate.value = focus.rate;
    f.uSnap.value = this.snap ? 1 : 0;
    f.uPoint.value.set(THREE.MathUtils.clamp(focus.point.x, 0.001, 0.999), THREE.MathUtils.clamp(focus.point.y, 0.001, 0.999));
    renderer.setRenderTarget(this.focusTargets[1 - this.read]);
    this.focusQuad.render(renderer);
    this.read = 1 - this.read;
    this.snap = false;

    const c = this.cocMaterial.uniforms;
    c.tDepth.value = depth;
    c.tDiffuse.value = readBuffer.texture;
    c.tFocus.value = this.focusTargets[this.read].texture;
    c.uNear.value = camera.near;
    c.uFar.value = camera.far;
    c.uWidth.value = this.res.x;
    c.uAperture.value = lens.aperture;
    c.uMaxBack.value = lens.back;
    c.uMaxNear.value = lens.near;
    c.uTol.value = lens.tol;
    renderer.setRenderTarget(this.cocTarget);
    this.cocQuad.render(renderer);

    const g = this.gatherMaterial.uniforms;
    g.uRadius.value = Math.max(lens.back, lens.near) * this.res.x;
    g.uBoost.value = lens.boost;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.gatherQuad.render(renderer);
  }

  dispose() {
    this.cocTarget.dispose();
    this.focusTargets.forEach((t) => t.dispose());
    [this.focusMaterial, this.cocMaterial, this.gatherMaterial].forEach((m) => m.dispose());
    [this.focusQuad, this.cocQuad, this.gatherQuad].forEach((q) => q.dispose());
  }
}
