'use client'

// Three.js Christmas scene loading animation
// Exact copy of cconsta1/christmas-scene integrated with signal tracking

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import Lights from './scene/Lights'
import Gift from './scene/Gift'
import ChristmasTree from './scene/ChristmasTree'
import Floor from './scene/Floor'
import Skybox from './scene/Skybox'
import Particles from './scene/Particles'
import Fireflies from './scene/Fireflies'
import { PopArtShader } from './shaders/PopArtShader'

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
  const [falseEnding, setFalseEnding] = useState(false) // False ending state

  // Reset signals when component mounts
  useEffect(() => {
    signalsRef.current = {
      pixelsMoved: 0,
      clicks: 0,
      idleMs: 0,
      lastMoveTime: Date.now(),
      lastX: 0,
      lastY: 0,
      isTracking: true,
    }
    setProgress(0)
    setIsOpening(false)
  }, [])

  // Three.js setup - exact copy of App.js
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x06061b)
    scene.fog = new THREE.FogExp2(0x06061b, 0.028)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 2, 12)
    camera.lookAt(0, 1.5, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0 // Reduced exposure to prevent flashing
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Post-processing
    const composer = new EffectComposer(renderer)
    
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const popArtPass = new ShaderPass(PopArtShader)
    popArtPass.material.uniforms.uResolution.value.set(width, height)
    popArtPass.material.uniforms.uPosterizeLevels.value = 10 // More levels = less harsh
    popArtPass.material.uniforms.uHalftoneStrength.value = 0.06 // Reduced halftone
    popArtPass.material.uniforms.uRGBShift.value = 0.1 // Reduced RGB shift to prevent flashing
    composer.addPass(popArtPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5,
      0.4,
      0.85
    )
    bloomPass.strength = 0.3 // Reduced to prevent flashing
    bloomPass.radius = 0.2 // Tighter radius
    bloomPass.threshold = 0.9 // Higher threshold - only very bright things bloom
    composer.addPass(bloomPass)

    // Vignette Shader
    const VignetteShader = {
      uniforms: {
        "tDiffuse": { value: null },
        "offset": { value: 1.0 },
        "darkness": { value: 1.1 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        uniform float offset;
        uniform float darkness;
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D( tDiffuse, vUv );
          vec2 uv = ( vUv - vec2( 0.5 ) ) * vec2( offset );
          gl_FragColor = vec4( mix( texel.rgb, vec3( 1.0 - darkness ), dot( uv, uv ) ), texel.a );
        }
      `
    }

    const vignettePass = new ShaderPass(VignetteShader)
    composer.addPass(vignettePass)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.5, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.02
    controls.minDistance = 5
    controls.maxDistance = 15
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.3

    // Scene components
    const lights = new Lights(scene)
    const gift = new Gift(scene, camera, renderer)
    const christmasTree = new ChristmasTree(scene, camera, renderer)
    const floor = new Floor(scene)
    const skybox = new Skybox(scene)
    const particles = new Particles(scene)
    const fireflies = new Fireflies(scene)

    // Unique interactive elements
    // 1. Magical sparkle trail that follows mouse movement
    const sparkleTrail: Array<{
      mesh: THREE.Mesh
      life: number
      velocity: THREE.Vector3
    }> = []
    const maxTrailLength = 20

    function addSparkleToTrail(x: number, y: number) {
      const geometry = new THREE.SphereGeometry(0.03, 6, 6)
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL((Math.random() * 0.3 + 0.5) % 1, 1, 0.6),
        transparent: true,
        opacity: 0.8,
      })
      const sparkle = new THREE.Mesh(geometry, material)

      // Convert screen to world coords
      const worldX = ((x / width) * 2 - 1) * 4
      const worldY = (-(y / height) * 2 + 1) * 3
      sparkle.position.set(worldX, worldY, 0)

      sparkleTrail.push({
        mesh: sparkle,
        life: 1.0,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
      })

      scene.add(sparkle)

      // Limit trail length
      if (sparkleTrail.length > maxTrailLength) {
        const old = sparkleTrail.shift()
        if (old) {
          scene.remove(old.mesh)
          old.mesh.geometry.dispose()
          ;(old.mesh.material as THREE.Material).dispose()
        }
      }
    }

    // 2. Gift opening particles on click
    const giftBursts: Array<{
      particles: THREE.Points
      life: number
      giftIndex: number
    }> = []

    function createGiftBurst(giftIndex: number, giftPosition: THREE.Vector3) {
      const burstCount = 30
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(burstCount * 3)
      const colors = new Float32Array(burstCount * 3)
      const sizes = new Float32Array(burstCount)

      const color = new THREE.Color()
      const giftColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181]

      for (let i = 0; i < burstCount; i++) {
        const i3 = i * 3
        const angle = (i / burstCount) * Math.PI * 2
        const speed = 0.5 + Math.random() * 0.5
        positions[i3] = giftPosition.x + Math.cos(angle) * speed
        positions[i3 + 1] = giftPosition.y + Math.sin(angle) * speed + 0.2
        positions[i3 + 2] = giftPosition.z + (Math.random() - 0.5) * 0.3

        color.setHex(giftColors[giftIndex % giftColors.length])
        colors[i3] = color.r
        colors[i3 + 1] = color.g
        colors[i3 + 2] = color.b

        sizes[i] = 0.05 + Math.random() * 0.05
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float time;
          void main() {
            vColor = color;
            vec3 pos = position;
            pos.y -= time * 2.0;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 - time);
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
        vertexColors: true,
      })

      const burst = new THREE.Points(geometry, material)
      scene.add(burst)

      giftBursts.push({
        particles: burst,
        life: 0,
        giftIndex,
      })
    }

    // 3. Floating progress indicator (magical orb)
    const progressOrbGeometry = new THREE.SphereGeometry(0.15, 16, 16)
    const progressOrbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    })
    const progressOrb = new THREE.Mesh(progressOrbGeometry, progressOrbMaterial)
    progressOrb.position.set(-3, 3, 0)
    scene.add(progressOrb)

    // Cursor follow particles
    const cursorParticles: Array<{
      mesh: THREE.Mesh
      life: number
      targetX: number
      targetY: number
    }> = []
    let lastCursorX = 0
    let lastCursorY = 0

    // 4. Dynamic tree light colors based on interactions
    const treeLights: THREE.PointLight[] = []
    const lightColorPalette = [
      new THREE.Color(0xff6b6b),
      new THREE.Color(0x4ecdc4),
      new THREE.Color(0xffe66d),
      new THREE.Color(0x95e1d3),
      new THREE.Color(0xf38181),
      new THREE.Color(0xa8e6cf),
    ]

    // Load assets
    Promise.all([
      lights.load(),
      gift.load(),
      christmasTree.load(),
      floor.load(),
      skybox.load(),
      particles.load(),
      fireflies.load()
    ]).then(() => {
      console.log('All assets loaded')
      
      // Initialize tree lights after tree is loaded
      if (christmasTree.tree) {
        for (let i = 0; i < 8; i++) {
          const light = new THREE.PointLight(0xffffff, 0.5, 5)
          const angle = (i / 8) * Math.PI * 2
          light.position.set(
            Math.cos(angle) * 1.5,
            1 + (i % 3) * 0.8,
            Math.sin(angle) * 1.5
          )
          scene.add(light)
          treeLights.push(light)
        }
      }
    })

    // Animation loop
    const clock = new THREE.Clock()
    let previousTime = 0
    const loadingDuration = reducedMotion ? 4000 : 10000
    const startTime = Date.now()

    function animate() {
      const now = Date.now()
      const elapsed = now - startTime
      const currentProgress = Math.min(elapsed / loadingDuration, 1)
      setProgress(currentProgress)

      const elapsedTime = clock.getElapsedTime()
      let deltaTime = elapsedTime - previousTime
      previousTime = elapsedTime

      if (deltaTime > 0.1) deltaTime = 0.1

      // Update scene components
      if (gift) {
        gift.update(deltaTime, elapsedTime)
      }

      if (christmasTree) {
        christmasTree.update(deltaTime)
      }

      if (particles) {
        particles.update(deltaTime)
      }

      if (fireflies) {
        fireflies.update(deltaTime, elapsedTime)
      }

      if (floor) {
        floor.update(camera)
      }

      if (popArtPass?.material?.uniforms?.uTime) {
        popArtPass.material.uniforms.uTime.value = elapsedTime
      }

      // Interactive effects based on signals
      const turbulence = Math.min(signalsRef.current.pixelsMoved / 10000, 1)
      const crystallization = Math.min(signalsRef.current.idleMs / 5000, 1)
      const clickIntensity = Math.min(signalsRef.current.clicks / 20, 1)

      // Tree sway
      if (christmasTree.tree) {
        christmasTree.tree.rotation.z = Math.sin(elapsedTime * 2) * turbulence * 0.1
        christmasTree.tree.rotation.x = Math.cos(elapsedTime * 1.5) * turbulence * 0.05
      }

      // Update sparkle trail
      sparkleTrail.forEach((sparkle, index) => {
        sparkle.life -= deltaTime * 2
        if (sparkle.life <= 0) {
          scene.remove(sparkle.mesh)
          sparkle.mesh.geometry.dispose()
          ;(sparkle.mesh.material as THREE.Material).dispose()
          sparkleTrail.splice(index, 1)
        } else {
          sparkle.mesh.position.add(
            sparkle.velocity.clone().multiplyScalar(deltaTime * 2)
          )
          ;(sparkle.mesh.material as THREE.MeshBasicMaterial).opacity =
            sparkle.life * 0.8
          sparkle.mesh.scale.setScalar(0.5 + sparkle.life * 0.5)
        }
      })

      // Update gift bursts
      giftBursts.forEach((burst, index) => {
        burst.life += deltaTime
        if (burst.life >= 1) {
          scene.remove(burst.particles)
          burst.particles.geometry.dispose()
          ;(burst.particles.material as THREE.Material).dispose()
          giftBursts.splice(index, 1)
        } else {
          ;(burst.particles.material as any).uniforms.time.value = burst.life
        }
      })

      // Update progress orb - smoother to prevent flashing
      const progress = Math.min(elapsed / loadingDuration, 1)
      progressOrb.position.y = 3 + Math.sin(elapsedTime * 1) * 0.15 // Slower movement
      progressOrb.rotation.y += deltaTime * 1.5 // Slower rotation
      progressOrb.rotation.x = Math.sin(elapsedTime * 1) * 0.2 // Gentler tilt
      // Smoother emissive intensity change
      const targetEmissive = 0.4 + progress * 0.4
      const currentEmissive = (progressOrbMaterial as THREE.MeshStandardMaterial).emissiveIntensity
      ;(progressOrbMaterial as THREE.MeshStandardMaterial).emissiveIntensity =
        currentEmissive + (targetEmissive - currentEmissive) * deltaTime * 2
      progressOrb.scale.setScalar(0.8 + progress * 0.3) // Less dramatic scaling

      // Dynamic tree lights (colorful point lights that shift based on interactions)
      // Made smoother to prevent flashing
      treeLights.forEach((light, i) => {
        const colorIndex =
          (Math.floor(elapsedTime * 0.2) + i) % lightColorPalette.length // Slower color change
        const baseColor = lightColorPalette[colorIndex]
        const clickColor = lightColorPalette[
          (colorIndex + Math.floor(clickIntensity * lightColorPalette.length)) %
            lightColorPalette.length
        ]
        light.color.lerpColors(baseColor, clickColor, clickIntensity * 0.3)
        // Smoother intensity changes to prevent flashing
        const baseIntensity = 0.4
        const pulse = Math.sin(elapsedTime * 1.5 + i) * 0.15 // Slower, gentler pulse
        light.intensity = baseIntensity + pulse + clickIntensity * 0.3
      })

      // Controls update
      controls.update()

      // Update existing cursor particles
      if (signalsRef.current.isTracking) {
        cursorParticles.forEach((particle, index) => {
          particle.life -= deltaTime * 2
          if (particle.life <= 0) {
            scene.remove(particle.mesh)
            particle.mesh.geometry.dispose()
            ;(particle.mesh.material as THREE.Material).dispose()
            cursorParticles.splice(index, 1)
          } else {
            ;(particle.mesh.material as THREE.MeshBasicMaterial).opacity = particle.life * 0.6
            particle.mesh.scale.setScalar(0.5 + particle.life * 0.5)
          }
        })
      }

      // Opening animation
      if (isOpening) {
        const openingProgress = Math.min((now - (startTime + loadingDuration)) / 1500, 1)
        camera.position.z = 12 + openingProgress * 2
        camera.position.y = 2 + openingProgress * 1

        // Progress orb fades out and moves to center
        progressOrb.position.lerp(new THREE.Vector3(0, 2, 0), openingProgress * 0.1)
        ;(progressOrbMaterial as THREE.MeshStandardMaterial).opacity = 1 - openingProgress

        // Tree lights intensify
        treeLights.forEach((light) => {
          light.intensity = 0.5 + openingProgress * 1.5
        })
      }

      // Render
      composer.render()

      // Check if loading is complete - FALSE ENDING
      if (currentProgress >= 1 && !falseEnding && !isOpening && signalsRef.current.isTracking) {
        signalsRef.current.isTracking = false
        setFalseEnding(true) // Enter false ending state

        const finalIdleMs = Date.now() - signalsRef.current.lastMoveTime
        if (finalIdleMs > 100) {
          signalsRef.current.idleMs += finalIdleMs
        }

        // Everything calms - slow down all motion
        // This happens automatically as turbulence/crystallization values stabilize

        // SUSPENSION: Wait 750ms (the crucial pause)
        setTimeout(() => {
          setIsOpening(true) // Transition to opening
          onComplete({
            pixelsMoved: signalsRef.current.pixelsMoved,
            clicks: signalsRef.current.clicks,
            idleMs: signalsRef.current.idleMs,
          })
        }, 750) // Suspension delay
      }

      // During false ending - calm everything
      if (falseEnding) {
        // Gradually reduce all motion
        controls.autoRotateSpeed = Math.max(0.05, controls.autoRotateSpeed * 0.95)
        if (particles && particles.particleSystem) {
          // Slow down particles
          const positions = particles.particleSystem.geometry.attributes.position.array as Float32Array
          if (positions) {
            for (let i = 0; i < positions.length / 3; i++) {
              positions[i * 3 + 1] -= deltaTime * 0.1 // Much slower fall
            }
            particles.particleSystem.geometry.attributes.position.needsUpdate = true
          }
        }
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

      // Add sparkle to trail (throttled)
      if (distance > 5) {
        addSparkleToTrail(e.clientX, e.clientY)
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (!signalsRef.current.isTracking) return
      signalsRef.current.clicks++

      // Create gift burst on click
      if (gift && gift.gifts && gift.gifts.length > 0) {
        const giftIndex = Math.floor(Math.random() * gift.gifts.length)
        const giftMesh = gift.gifts[giftIndex]
        if (giftMesh) {
          const worldPosition = new THREE.Vector3()
          giftMesh.getWorldPosition(worldPosition)
          createGiftBurst(giftIndex, worldPosition)

          // Animate gift bounce
          const originalY = giftMesh.position.y
          let bounceTime = 0
          const bounceInterval = setInterval(() => {
            bounceTime += 0.1
            if (bounceTime >= 1) {
              giftMesh.position.y = originalY
              clearInterval(bounceInterval)
            } else {
              giftMesh.position.y =
                originalY + Math.sin(bounceTime * Math.PI) * 0.3
            }
          }, 16)
        }
      }
    }

    // Idle time tracking
    const idleCheckInterval = setInterval(() => {
      if (!signalsRef.current.isTracking) return
      const now = Date.now()
      const timeSinceLastMove = now - signalsRef.current.lastMoveTime
      if (timeSinceLastMove > 100) {
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      
      composer.setSize(newWidth, newHeight)
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      if (popArtPass?.material?.uniforms?.uResolution) {
        popArtPass.material.uniforms.uResolution.value.set(newWidth, newHeight)
      }
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

      // Cleanup unique elements
      sparkleTrail.forEach((sparkle) => {
        scene.remove(sparkle.mesh)
        sparkle.mesh.geometry.dispose()
        ;(sparkle.mesh.material as THREE.Material).dispose()
      })

      giftBursts.forEach((burst) => {
        scene.remove(burst.particles)
        burst.particles.geometry.dispose()
        ;(burst.particles.material as THREE.Material).dispose()
      })

      treeLights.forEach((light) => scene.remove(light))
      scene.remove(progressOrb)
      progressOrbGeometry.dispose()
      ;(progressOrbMaterial as THREE.Material).dispose()

      if (renderer && container) {
        container.removeChild(renderer.domElement)
        renderer.dispose()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete, reducedMotion])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  )
}
