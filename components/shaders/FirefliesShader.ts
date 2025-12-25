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
        // Softer, less "real" glow (mint accent) - made more visible and stable
        float strength = 0.1 / max(distanceToCenter, 0.1) - 0.2;
        strength = clamp(strength, 0.0, 0.6); // Increased max opacity for visibility

        // More stable, less flickering
        vec3 color = vec3(0.72, 0.96, 0.84);
        gl_FragColor = vec4(color, strength);
      }`,
  };

