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
    renderer.toneMappingExposure = 1.35
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Post-processing
    const composer = new EffectComposer(renderer)
    
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const popArtPass = new ShaderPass(PopArtShader)
    popArtPass.material.uniforms.uResolution.value.set(width, height)
    composer.addPass(popArtPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5,
      0.4,
      0.85
    )
    bloomPass.strength = 0.75
    bloomPass.radius = 0.28
    bloomPass.threshold = 0.78
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

      // Tree sway
      if (christmasTree.tree) {
        christmasTree.tree.rotation.z = Math.sin(elapsedTime * 2) * turbulence * 0.1
        christmasTree.tree.rotation.x = Math.cos(elapsedTime * 1.5) * turbulence * 0.05
      }

      // Controls update
      controls.update()

      // Opening animation
      if (isOpening) {
        const openingProgress = Math.min((now - (startTime + loadingDuration)) / 1500, 1)
        camera.position.z = 12 + openingProgress * 2
        camera.position.y = 2 + openingProgress * 1
      }

      // Render
      composer.render()

      // Check if loading is complete
      if (currentProgress >= 1 && !isOpening && signalsRef.current.isTracking) {
        signalsRef.current.isTracking = false
        setIsOpening(true)

        const finalIdleMs = Date.now() - signalsRef.current.lastMoveTime
        if (finalIdleMs > 100) {
          signalsRef.current.idleMs += finalIdleMs
        }

        console.log('Loading complete, signals:', {
          pixelsMoved: signalsRef.current.pixelsMoved,
          clicks: signalsRef.current.clicks,
          idleMs: signalsRef.current.idleMs,
        })

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
