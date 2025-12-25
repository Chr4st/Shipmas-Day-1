'use client'

// Three.js loading animation component
// Creates a gift-wrapping/opening experience with particle effects
// Tracks user interactions: mouse movement, clicks, and idle time
// Optimized for performance with InstancedMesh and capped DPR

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

interface LoadingGiftProps {
  onComplete: (signals: {
    pixelsMoved: number
    clicks: number
    idleMs: number
  }) => void
  reducedMotion?: boolean
}

export default function LoadingGift({ onComplete, reducedMotion = false }: LoadingGiftProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // User interaction tracking
  const signalsRef = useRef({
    pixelsMoved: 0,
    clicks: 0,
    idleMs: 0,
    lastMoveTime: Date.now(),
    lastX: 0,
    lastY: 0,
    isTracking: true,
  })

  const [progress, setProgress] = useState(0)
  const [isOpening, setIsOpening] = useState(false)

  // Three.js setup
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 5

    // Renderer with performance optimizations
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap DPR at 2
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Particle system using InstancedMesh for performance
    const particleCount = reducedMotion ? 500 : 2000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      // Start particles in a sphere
      const radius = 2 + Math.random() * 1
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02

      sizes[i] = Math.random() * 0.05 + 0.02
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        turbulence: { value: 0 },
        crystallization: { value: 0 },
        opening: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        uniform float time;
        uniform float turbulence;
        uniform float crystallization;
        uniform float opening;
        
        varying vec3 vColor;
        
        void main() {
          vec3 pos = position;
          
          // Base rotation
          float angle = time * 0.5;
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          pos.xy = rot * pos.xy;
          
          // Turbulence from mouse movement
          pos += vec3(
            sin(time * 2.0 + pos.y * 3.0) * turbulence * 0.3,
            cos(time * 1.5 + pos.x * 3.0) * turbulence * 0.3,
            sin(time * 1.8 + pos.z * 3.0) * turbulence * 0.2
          );
          
          // Crystallization from idle (form into ring/torus)
          float ringRadius = 2.5;
          float ringAngle = atan(pos.y, pos.x);
          float ringDist = length(pos.xy) - ringRadius;
          vec3 ringPos = vec3(
            cos(ringAngle) * ringRadius,
            sin(ringAngle) * ringRadius,
            pos.z
          );
          pos = mix(pos, ringPos, crystallization * 0.7);
          
          // Opening animation (iris expand)
          float dist = length(pos);
          float expand = opening * 3.0;
          pos = normalize(pos) * (dist + expand);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + opening * 0.5);
          
          // Color gradient
          float t = (pos.z + 2.0) / 4.0;
          vColor = mix(
            vec3(0.9, 0.3, 0.5), // Pink
            vec3(0.3, 0.7, 0.9), // Blue
            t
          );
          vColor += vec3(opening * 0.3); // Brighten on opening
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // Ripple effects for clicks
    const ripples: Array<{ mesh: THREE.Mesh; startTime: number }> = []

    function createRipple(x: number, y: number) {
      const geometry = new THREE.RingGeometry(0.1, 0.2, 32)
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geometry, material)

      // Convert screen coords to world coords (approximate)
      const worldX = ((x / width) * 2 - 1) * 3
      const worldY = (-(y / height) * 2 + 1) * 2.5
      mesh.position.set(worldX, worldY, 0)

      scene.add(mesh)
      ripples.push({ mesh, startTime: Date.now() })
    }

    // Animation loop
    let lastTime = Date.now()
    const loadingDuration = reducedMotion ? 4000 : 10000 // 4s or 10s
    const startTime = Date.now()

    function animate() {
      const now = Date.now()
      const deltaTime = (now - lastTime) / 1000
      lastTime = now

      const elapsed = now - startTime
      const currentProgress = Math.min(elapsed / loadingDuration, 1)

      // Update progress
      setProgress(currentProgress)

      // Update shader uniforms
      material.uniforms.time.value = elapsed / 1000
      material.uniforms.turbulence.value = Math.min(
        signalsRef.current.pixelsMoved / 10000,
        1
      )
      material.uniforms.crystallization.value = Math.min(
        signalsRef.current.idleMs / 5000,
        1
      )
      material.uniforms.opening.value = isOpening
        ? Math.min((now - (startTime + loadingDuration)) / 1000, 1)
        : 0

      // Update ripples
      ripples.forEach((ripple, index) => {
        const age = (now - ripple.startTime) / 1000
        if (age > 1) {
          scene.remove(ripple.mesh)
          ripple.mesh.geometry.dispose()
          ;(ripple.mesh.material as THREE.Material).dispose()
          ripples.splice(index, 1)
        } else {
          const scale = 1 + age * 3
          ripple.mesh.scale.set(scale, scale, 1)
          ;(ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - age)
        }
      })

      // Update particle positions
      const positions = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        positions[i3] += velocities[i3] * deltaTime * 10
        positions[i3 + 1] += velocities[i3 + 1] * deltaTime * 10
        positions[i3 + 2] += velocities[i3 + 2] * deltaTime * 10

        // Boundary wrapping
        if (Math.abs(positions[i3]) > 5) velocities[i3] *= -1
        if (Math.abs(positions[i3 + 1]) > 5) velocities[i3 + 1] *= -1
        if (Math.abs(positions[i3 + 2]) > 5) velocities[i3 + 2] *= -1
      }
      geometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)

      // Check if loading is complete
      if (currentProgress >= 1 && !isOpening && signalsRef.current.isTracking) {
        signalsRef.current.isTracking = false
        setIsOpening(true)

        // Wait for opening animation, then call onComplete
        setTimeout(() => {
          onComplete({
            pixelsMoved: signalsRef.current.pixelsMoved,
            clicks: signalsRef.current.clicks,
            idleMs: signalsRef.current.idleMs,
          })
        }, 1500)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Event handlers
    let lastMouseX = 0
    let lastMouseY = 0
    let isFirstMove = true

    const handleMouseMove = (e: MouseEvent) => {
      if (!signalsRef.current.isTracking) return

      const now = Date.now()
      if (isFirstMove) {
        lastMouseX = e.clientX
        lastMouseY = e.clientY
        isFirstMove = false
        signalsRef.current.lastX = e.clientX
        signalsRef.current.lastY = e.clientY
        signalsRef.current.lastMoveTime = now
        return
      }

      const dx = e.clientX - signalsRef.current.lastX
      const dy = e.clientY - signalsRef.current.lastY
      const distance = Math.sqrt(dx * dx + dy * dy)
      signalsRef.current.pixelsMoved += distance
      signalsRef.current.lastX = e.clientX
      signalsRef.current.lastY = e.clientY
      signalsRef.current.lastMoveTime = now
    }

    const handleClick = (e: MouseEvent) => {
      if (!signalsRef.current.isTracking) return
      signalsRef.current.clicks++
      createRipple(e.clientX, e.clientY)
    }

    // Idle time tracking
    const idleCheckInterval = setInterval(() => {
      if (!signalsRef.current.isTracking) return
      const now = Date.now()
      const timeSinceLastMove = now - signalsRef.current.lastMoveTime
      if (timeSinceLastMove > 100) {
        // Only count if no movement for 100ms
        signalsRef.current.idleMs += 100
      }
    }, 100)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('resize', handleResize)
      clearInterval(idleCheckInterval)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Dispose Three.js resources
      geometry.dispose()
      material.dispose()
      ripples.forEach((ripple) => {
        scene.remove(ripple.mesh)
        ripple.mesh.geometry.dispose()
        ;(ripple.mesh.material as THREE.Material).dispose()
      })

      if (renderer && container) {
        container.removeChild(renderer.domElement)
        renderer.dispose()
      }
    }
  }, [onComplete, reducedMotion, isOpening])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  )
}

