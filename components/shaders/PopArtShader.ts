import * as THREE from 'three';

export const PopArtShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPosterizeLevels: { value: 7.0 },
        uHalftoneScale: { value: 7.0 },
        uHalftoneStrength: { value: 0.12 },
        uRGBShift: { value: 0.25 },
        uEdgeStrength: { value: 0.95 },
        uInkColor: { value: new THREE.Color('#05010a') },
    },
    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform float uPosterizeLevels;
        uniform float uHalftoneScale;
        uniform float uHalftoneStrength;
        uniform float uRGBShift;
        uniform float uEdgeStrength;
        uniform vec3 uInkColor;

        varying vec2 vUv;

        float luma(vec3 c) {
            return dot(c, vec3(0.2126, 0.7152, 0.0722));
        }

        vec3 posterize(vec3 c, float levels) {
            return floor(c * levels) / levels;
        }

        void main() {
            vec2 px = 1.0 / max(uResolution, vec2(1.0));

            // Mild RGB split (print misregistration vibe)
            vec2 shift = px * uRGBShift * vec2(
                0.65 + 0.35 * sin(uTime * 0.35),
                0.65 + 0.35 * cos(uTime * 0.27)
            );

            float r = texture2D(tDiffuse, vUv + shift).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - shift).b;
            vec3 col = vec3(r, g, b);

            // Posterize into bold flat inks
            col = posterize(col, max(2.0, uPosterizeLevels));

            // Simple edge ink (screen-space luminance gradient)
            float lC = luma(col);
            float lN = luma(texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb);
            float lS = luma(texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb);
            float lE = luma(texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb);
            float lW = luma(texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb);
            float grad = abs(lN - lS) + abs(lE - lW);
            float edge = smoothstep(0.12, 0.35, grad * uEdgeStrength);

            // Halftone dots, stronger in shadows
            vec2 p = (vUv * uResolution) / max(1.0, uHalftoneScale);
            vec2 gv = fract(p) - 0.5;
            float d = length(gv);
            float dotMask = smoothstep(0.52, 0.18, d);
            float shadow = smoothstep(0.85, 0.15, lC);
            float dots = mix(1.0, dotMask, uHalftoneStrength * shadow);

            vec3 outCol = col * dots;
            outCol = mix(outCol, uInkColor, edge);

            gl_FragColor = vec4(outCol, 1.0);
        }
    `,
};

