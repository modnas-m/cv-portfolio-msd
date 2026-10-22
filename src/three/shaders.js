// One voxel shader, two passes: COLOR writes flat pixel-art tones,
// NORMAL writes view-space normals for the outline pass.
export const voxelVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aBorn;    // when this voxel was added (seconds)
  uniform float uTime;
  varying vec3 vColor;
  varying vec3 vViewNormal;
  varying float vAge;
  void main() {
    vColor = aColor;
    vAge = uTime - aBorn;
    vec4 local = instanceMatrix * vec4(position, 1.0);
    // a new room settles into place in one piece
    float t = clamp(vAge / 0.2, 0.0, 1.0);
    local.y += (1.0 - t) * (1.0 - t) * 1.5;
    vViewNormal = normalize(mat3(viewMatrix) * mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * local;
  }
`

export const voxelFragment = /* glsl */ `
  uniform float uSelected;  // 0..1
  uniform float uHover;     // 0..1
  uniform float uDim;       // 0..1, another layer is selected
  uniform vec3 uPaper;
  uniform vec3 uSignal;
  varying vec3 vColor;
  varying vec3 vViewNormal;
  varying float vAge;
  void main() {
    if (vAge < 0.0) discard;
    // when another layer is chosen, this one goes see-through with a 50%
    // pixel dither, so you can see what's inside (the skeleton, mostly)
    if (uDim > 0.5 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
  #ifdef NORMAL_PASS
    gl_FragColor = vec4(vViewNormal * 0.5 + 0.5, 1.0);
  #else
    // three tones, like hand-drawn isometric pixel art
    float shade = vViewNormal.y > 0.5 ? 1.0 : (vViewNormal.x < 0.0 ? 0.86 : 0.70);
    // selected: the layer turns red but keeps its light and dark, so the
    // analysis buckets stay readable
    float lum = dot(vColor, vec3(0.299, 0.587, 0.114));
    vec3 red = mix(uSignal * 0.45, mix(uSignal, vec3(1.0), 0.6), lum);
    vec3 base = mix(mix(vColor, uSignal, uHover * 0.4), red, uSelected);
    vec3 col = base * shade;
    col = mix(col, uPaper, uDim * 0.78);
    // alpha tells the outline pass which ink to use
    float tag = uDim > 0.5 ? 0.33 : (uSelected > 0.5 ? 0.66 : 1.0);
    gl_FragColor = vec4(col, tag);
  #endif
  }
`

export const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

// Outline: silhouettes from depth jumps, creases from normal changes.
// Only one side of each edge is inked, so lines stay one pixel wide.
export const compositeFragment = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tNormal;
  uniform sampler2D tDepth;
  uniform vec2 uTexel;
  uniform float uDepthStep;   // a depth jump bigger than a flat face's slope
  uniform vec3 uInk;
  uniform vec3 uSignal;
  uniform vec3 uPaper;
  uniform float uNight;      // at night, no outline against the empty sky
  varying vec2 vUv;

  float depthAt(vec2 uv) { return texture2D(tDepth, uv).x; }

  void main() {
    vec4 c = texture2D(tColor, vUv);
    if (c.a < 0.01) { gl_FragColor = vec4(0.0); return; }
    // dithered, faded layers get no outline: they stay quiet
    if (c.a < 0.5) { gl_FragColor = vec4(c.rgb, 1.0); return; }
    float d = depthAt(vUv);
    vec3 n = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
    float edge = 0.0, sky = 0.0;
    vec2 offs[4];
    offs[0] = vec2(uTexel.x, 0.0); offs[1] = vec2(-uTexel.x, 0.0);
    offs[2] = vec2(0.0, uTexel.y); offs[3] = vec2(0.0, -uTexel.y);
    for (int i = 0; i < 4; i++) {
      vec2 uv = vUv + offs[i];
      float dn = depthAt(uv);
      vec4 nn = texture2D(tNormal, uv);
      if (dn - d > uDepthStep) {                                 // neighbour is farther: silhouette
        if (nn.a < 0.5) sky = 1.0; else edge = 1.0;
      }
      if (i == 0 || i == 2) {
        if (nn.a > 0.5 && dot(n, nn.xyz * 2.0 - 1.0) < 0.6) edge = 1.0;   // crease
      }
    }
    // by day the sky edge is inked too; at night it would hide thin members
    edge = max(edge, sky * (1.0 - uNight));
    vec3 ink = c.a > 0.8 ? uInk : (c.a > 0.5 ? uSignal * 0.75 : mix(uPaper, uInk, 0.22));
    gl_FragColor = vec4(mix(c.rgb, ink, edge), 1.0);
  }
`
