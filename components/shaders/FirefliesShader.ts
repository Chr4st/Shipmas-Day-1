export const FirefliesShader = {
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uSize;
  
      attribute float aScale;
  
      void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        
        // Add some movement
        modelPosition.y += sin(uTime + modelPosition.x * 100.0) * aScale * 0.12;
        modelPosition.x += cos(uTime + modelPosition.y * 100.0) * aScale * 0.06;
        modelPosition.z += sin(uTime + modelPosition.z * 100.0) * aScale * 0.06;
  
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;
  
        gl_Position = projectionPosition;
        gl_PointSize = uSize * aScale * uPixelRatio;
        gl_PointSize *= (1.0 / - viewPosition.z);
      }`,
    fragmentShader: /* glsl */ `
      void main() {
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        // Softer, less "real" glow (mint accent)
        float strength = 0.03 / max(distanceToCenter, 0.15) - 0.08;
        strength = clamp(strength, 0.0, 0.35);

        gl_FragColor = vec4(0.72, 0.96, 0.84, strength);
      }`,
  };

