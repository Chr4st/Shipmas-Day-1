import * as THREE from 'three';

export const SkyboxShader = {
  uniforms: {
    topColor: { value: new THREE.Color(0x01010a) },
    bottomColor: { value: new THREE.Color(0x070a24) },
    offset: { value: 10 },
    exponent: { value: 0.8 }
  },
  vertexShader: /* glsl */ `
    varying vec3 vWorldPosition;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;

    varying vec3 vWorldPosition;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec3 dir = normalize(vWorldPosition + offset);
      float h = dir.y;
      vec3 base = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));

      // Procedural stars (screen-print dots)
      float u = atan(dir.z, dir.x) / 6.2831853 + 0.5;
      float v = asin(clamp(dir.y, -1.0, 1.0)) / 3.1415926 + 0.5;
      vec2 cell = floor(vec2(u, v) * 170.0);
      float n = hash(cell);
      float star = step(0.996, n);
      float tw = 0.6 + 0.4 * hash(cell + 19.0);

      // Stronger contrast near vertical axis above the tree
      float axis = 1.0 - smoothstep(0.25, 0.9, length(dir.xz));
      float topMask = smoothstep(0.1, 0.7, dir.y);
      float starStrength = star * tw * (0.10 + 0.22 * axis) * topMask;

      vec3 outCol = base + vec3(1.0) * starStrength;
      gl_FragColor = vec4(outCol, 1.0);
    }`,
};

