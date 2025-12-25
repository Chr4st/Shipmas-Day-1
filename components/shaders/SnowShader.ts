import { Color, Vector3 } from 'three';

export const SnowShader = {
  uniforms: {
    color: { value: new Color("#f4c6b8") },
    lightPosition: { value: new Color("#F5F5F5") },
    viewVector: { value: new Vector3() }
  },
  vertexShader: /* glsl */ `
    precision highp float;
    precision highp int;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vDisplacement;

    // Simple noise function
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
      for (int i = 0; i < 3; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
      vNormal = normal;
      vPosition = position;
      
      // Calculate displacement (reduced for flatter poster read)
      float displacement = fbm(position.xz * 0.28) * 1.10;
      displacement += fbm(position.xz * 1.05) * 0.07;
      
      // Flatten the center area for the tree and gifts
      float dist = length(position.xz);
      float flatten = smoothstep(1.0, 4.0, dist);
      displacement *= flatten;

      vDisplacement = displacement;

      vec3 displacedPosition = position + vec3(0.0, displacement, 0.0);
      vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
      vWorldPosition = worldPosition.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    precision highp int;

    uniform vec3 color;
    uniform vec3 viewVector;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vDisplacement;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      // Calculate normal from derivatives for realistic lighting on displaced mesh
      vec3 fdx = dFdx(vWorldPosition);
      vec3 fdy = dFdy(vWorldPosition);
      vec3 normal = normalize(cross(fdx, fdy));

      // Basic lighting
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
      float brightness = max(0.0, dot(normal, lightDir));
      
        // Matte toon banding (2-band)
        float band = step(0.55, brightness);
        vec3 shadowColor = color * vec3(0.85, 0.78, 0.80);
        vec3 highlightColor = color * vec3(1.04, 1.01, 0.98);
        vec3 finalColor = mix(shadowColor, highlightColor, band);

        // Intentional sparkle: very sparse screen-print specks
        vec2 cell = floor(vWorldPosition.xz * 3.0);
        float n = hash(cell);
        float speck = step(0.996, n) * (0.05 + 0.08 * band);
        finalColor += vec3(1.0) * speck;

      // Distance fog (simple fade to black/background at edges)
      float dist = length(vWorldPosition.xz);
      float fogFactor = smoothstep(15.0, 20.0, dist);
      finalColor = mix(finalColor, vec3(0.04, 0.04, 0.12), fogFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }`,
};

