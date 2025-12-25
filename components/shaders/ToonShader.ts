import { Color } from 'three';

const PALETTE = [
  new Color("#ff003b"), // Vivid cherry red
  new Color("#00eaff"), // Electric cyan
  new Color("#fff200"), // Acid yellow
  new Color("#39ffb3"), // Neon mint
];

function getRandomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

export function createToonShader() {
  const base = getRandomColor();
  const shadow = base.clone().multiplyScalar(0.62);
  const accent = getRandomColor();
  const ink = new Color("#05010a");

  return {
    uniforms: {
      uBaseColor: { value: base },
      uShadowColor: { value: shadow },
      uAccentColor: { value: accent },
      uInkColor: { value: ink },
    },
    vertexShader: /* glsl */ `
      precision highp float;
      precision highp int;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normal;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      precision highp int;

      uniform mat4 modelMatrix;

      uniform vec3 uBaseColor;
      uniform vec3 uShadowColor;
      uniform vec3 uAccentColor;
      uniform vec3 uInkColor;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      float luma(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      vec3 saturateColor(vec3 c, float s) {
        vec3 g = vec3(luma(c));
        return mix(g, c, s);
      }

      void main() {
        vec3 n = normalize(vec3(modelMatrix * vec4(normalize(vNormal), 0.0)));
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.2));
        float diff = max(dot(n, lightDir), 0.0);
        // 2-band toon
        float band = step(0.55, diff);
        vec3 flatCol = mix(uShadowColor, uBaseColor, band);

        // Subtle comic stripe/pattern (playful, not noisy)
        float stripe = step(0.5, fract(vWorldPosition.y * 6.0 + vWorldPosition.x * 0.35));
        vec3 patterned = mix(flatCol, uAccentColor, stripe * 0.22);

        vec3 col = patterned;

        // Tiny ink edge via Fresnel for a comic feel
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.0);
        float edge = smoothstep(0.55, 0.95, fresnel);

        // Light-bulb glow: boost saturation + luminance and add emissive core + halo
        vec3 neon = saturateColor(col, 1.45);

        float facing = pow(max(dot(n, viewDir), 0.0), 2.2);
        float rim = smoothstep(0.35, 0.92, fresnel);

        // HDR emissive so bloom can pick it up
        vec3 emissiveCore = neon * (0.70 + 1.05 * facing);
        vec3 halo = neon * (1.20 * rim);

        // Gentle spec glint (small, tasteful)
        float spec = pow(max(dot(reflect(-lightDir, n), viewDir), 0.0), 24.0);
        vec3 glint = vec3(1.0) * (spec * 0.12);

        // Reduce ink edge so bulbs don't look "painted"
        vec3 outCol = neon * 1.22 + emissiveCore + halo + glint;
        outCol = mix(outCol, uInkColor, edge * 0.10);

        gl_FragColor = vec4(outCol, 1.0);
      }`,
  };
}

