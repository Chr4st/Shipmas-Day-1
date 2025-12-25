import { Color } from 'three';

export const SnowParticleShader = {
  uniforms: {
    color: { value: new Color("#FFFFFF") },
    size: { value: 1.0 },
    scale: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    precision highp float;
    precision highp int;

    uniform float size;
    uniform float scale;

    attribute float aScale;

    varying vec3 vColor;

    void main() {
      vColor = vec3(1.0);

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * aScale * (scale / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    precision highp int;

    uniform vec3 color;

    varying vec3 vColor;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);

      // Disc mask
      float edge = smoothstep(0.50, 0.46, dist);
      if (edge <= 0.0) discard;

      // Ink outline ring
      float ring = smoothstep(0.46, 0.40, dist) - smoothstep(0.40, 0.34, dist);
      vec3 ink = vec3(0.04, 0.03, 0.06);

      vec3 fill = color * vColor;
      vec3 finalColor = mix(fill, ink, clamp(ring * 0.9, 0.0, 1.0));

      gl_FragColor = vec4(finalColor, edge);
    }`,
};

