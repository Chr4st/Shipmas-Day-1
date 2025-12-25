import { Color } from 'three';

export const GiftShader = {
  uniforms: {
    uBaseColor: { value: new Color("#ff0000") },
    uRibbonColor: { value: new Color("#ffd400") },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uBaseColor;
    uniform vec3 uRibbonColor;
    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // Ribbon logic (cross shape)
      float ribbonWidth = 0.15;
      float inRibbonX = step(0.5 - ribbonWidth, vUv.x) * step(vUv.x, 0.5 + ribbonWidth);
      float inRibbonY = step(0.5 - ribbonWidth, vUv.y) * step(vUv.y, 0.5 + ribbonWidth);
      float isRibbon = max(inRibbonX, inRibbonY);

      vec3 color = mix(uBaseColor, uRibbonColor, isRibbon);

      // Flat, screen-print style lighting: slight 2-band shading only
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(vec3(0.4, 1.0, 0.3));
      float diff = max(dot(normal, lightDir), 0.0);
      float band = step(0.55, diff);
      vec3 shaded = mix(color * 0.75, color, band);

      gl_FragColor = vec4(shaded, 1.0);
    }`,
};

