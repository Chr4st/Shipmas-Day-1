import { Color, Vector3 } from 'three';

export const GhibliShader = {
  uniforms: {
    colorMap: {
      value: [
        new Color("#2f8f4e"), // highlight
        new Color("#277f45"), // mid
        new Color("#1f6b3a"), // base
        new Color("#153f25"), // shadow
      ],
    },
    brightnessThresholds: {
      value: [0.72, 0.34, 0.08],
    },
    lightPosition: { value: new Vector3(5, 10, 5) },
  },
  vertexShader: /* glsl */ `
    precision highp float;
    precision highp int;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normal;
      vPosition = position;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    precision highp int;

    uniform mat4 modelMatrix;

    uniform vec3 colorMap[4];
    uniform float brightnessThresholds[3];
    uniform vec3 lightPosition;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
      vec3 worldPosition = vWorldPosition;
      vec3 worldNormal = normalize( vec3( modelMatrix * vec4( vNormal, 0.0 ) ) );
      vec3 lightVector = normalize( lightPosition - worldPosition );
      float brightness = dot( worldNormal, lightVector );

      vec4 final;

      if (brightness > brightnessThresholds[0])
        final = vec4(colorMap[0], 1);
      else if (brightness > brightnessThresholds[1])
        final = vec4(colorMap[1], 1);
      else if (brightness > brightnessThresholds[2])
        final = vec4(colorMap[2], 1);
      else
        final = vec4(colorMap[3], 1);

      // Soft comic outline via Fresnel
      vec3 viewDir = normalize(cameraPosition - worldPosition);
      float fresnel = pow(1.0 - max(dot(worldNormal, viewDir), 0.0), 2.0);
      float outline = smoothstep(0.35, 0.9, fresnel);

      // Controlled shine (soft emissive highlight + gentle spec)
      float spec = pow(max(dot(reflect(-lightVector, worldNormal), viewDir), 0.0), 22.0);
      vec3 shine = final.rgb * (0.035 * outline) + vec3(1.0) * (spec * 0.06);

      // Micro shimmer: sparse specks that catch light (screen-print sparkle, not realism)
      float h = fract(sin(dot(floor(worldPosition.xz * 22.0 + worldPosition.y * 3.0), vec2(41.0, 289.0))) * 43758.5453);
      float speck = step(0.992, h);
      vec3 shimmer = vec3(1.0) * speck * (0.03 + 0.02 * outline);

      // Faint rim-light tint (cinematic separation)
      vec3 rimTint = vec3(0.55, 0.65, 1.0) * outline * 0.02;

      vec3 ink = vec3(0.04, 0.03, 0.06);
      vec3 outColor = mix(final.rgb + shine + shimmer + rimTint, ink, outline * 0.45);

      gl_FragColor = vec4(outColor, 1.0);
    }`,
};

