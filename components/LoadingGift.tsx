'use client'

// Three.js Christmas tree loading animation
// Creates a festive 3D tree that responds to user interactions
// Tracks user interactions: mouse movement, clicks, and idle time

import { useEffect, useRef, useState } from 'react'
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
  }, []) // Reset on mount

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
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(0, 2, 8)
    camera.lookAt(0, 0, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
    scene.add(ambientLight)

    // Point lights for tree (will twinkle)
    const treeLights: THREE.PointLight[] = []
    const lightColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff]
    for (let i = 0; i < 12; i++) {
      const light = new THREE.PointLight(
        lightColors[i % lightColors.length],
        1,
        5
      )
      treeLights.push(light)
      scene.add(light)
    }

    // Christmas tree (layered cones)
    const treeGroup = new THREE.Group()
    const treeMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d5f2d,
      roughness: 0.8,
      metalness: 0.2,
    })

    // Create tree layers
    const layers = [
      { radius: 0.3, height: 0.8, y: -1.5 },
      { radius: 0.5, height: 1.0, y: -0.5 },
      { radius: 0.7, height: 1.2, y: 0.8 },
      { radius: 0.5, height: 0.8, y: 2.2 },
    ]

    layers.forEach((layer, i) => {
      const geometry = new THREE.ConeGeometry(layer.radius, layer.height, 8)
      const mesh = new THREE.Mesh(geometry, treeMaterial)
      mesh.position.y = layer.y
      mesh.castShadow = true
      treeGroup.add(mesh)
    })

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = -2.0
    treeGroup.add(trunk)

    // Star on top
    const starGeometry = new THREE.ConeGeometry(0.15, 0.4, 5)
    const starMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5,
    })
    const star = new THREE.Mesh(starGeometry, starMaterial)
    star.position.y = 2.8
    star.rotation.z = Math.PI / 2
    treeGroup.add(star)

    scene.add(treeGroup)

    // Ornaments (particles that float and settle on tree)
    const ornamentCount = reducedMotion ? 30 : 80
    const ornaments: Array<{
      mesh: THREE.Mesh
      targetPosition: THREE.Vector3
      velocity: THREE.Vector3
      color: number
    }> = []

    const ornamentColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0xffffff]

    for (let i = 0; i < ornamentCount; i++) {
      const size = 0.08 + Math.random() * 0.05
      const geometry = new THREE.SphereGeometry(size, 8, 8)
      const color = ornamentColors[Math.floor(Math.random() * ornamentColors.length)]
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.2,
      })

      const ornament = new THREE.Mesh(geometry, material)
      
      // Start ornaments floating around
      const angle = (i / ornamentCount) * Math.PI * 2
      const radius = 3 + Math.random() * 2
      ornament.position.set(
        Math.cos(angle) * radius,
        -1 + Math.random() * 4,
        Math.sin(angle) * radius
      )

      // Target position on tree
      const layerIndex = Math.floor(Math.random() * layers.length)
      const layer = layers[layerIndex]
      const branchAngle = Math.random() * Math.PI * 2
      const branchRadius = (Math.random() * 0.7 + 0.1) * layer.radius
      const targetY = layer.y + (Math.random() - 0.5) * layer.height * 0.6

      ornaments.push({
        mesh: ornament,
        targetPosition: new THREE.Vector3(
          Math.cos(branchAngle) * branchRadius,
          targetY,
          Math.sin(branchAngle) * branchRadius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        color,
      })

      scene.add(ornament)
    }

    // Position tree lights on branches
    layers.forEach((layer, layerIdx) => {
      const lightsPerLayer = 3
      for (let i = 0; i < lightsPerLayer; i++) {
        const lightIdx = layerIdx * lightsPerLayer + i
        if (lightIdx < treeLights.length) {
          const angle = (i / lightsPerLayer) * Math.PI * 2
          const radius = layer.radius * 0.7
          treeLights[lightIdx].position.set(
            Math.cos(angle) * radius,
            layer.y + layer.height * 0.3,
            Math.sin(angle) * radius
          )
        }
      }
    })

    // Sparkles for clicks
    const sparkles: Array<{
      mesh: THREE.Mesh
      velocity: THREE.Vector3
      life: number
    }> = []

    function createSparkles(x: number, y: number) {
      const sparkleCount = 15
      for (let i = 0; i < sparkleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 6, 6)
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
        })
        const sparkle = new THREE.Mesh(geometry, material)

        // Convert screen coords to world coords
        const worldX = ((x / width) * 2 - 1) * 4
        const worldY = (-(y / height) * 2 + 1) * 3

        sparkle.position.set(worldX, worldY, 0)

        sparkles.push({
          mesh: sparkle,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
          ),
          life: 1.0,
        })

        scene.add(sparkle)
      }
    }

    // Animation loop
    let lastTime = Date.now()
    const loadingDuration = reducedMotion ? 4000 : 10000
    const startTime = Date.now()

    function animate() {
      const now = Date.now()
      const deltaTime = (now - lastTime) / 1000
      lastTime = now

      const elapsed = now - startTime
      const currentProgress = Math.min(elapsed / loadingDuration, 1)
      setProgress(currentProgress)

      const time = elapsed / 1000

      // Update tree sway based on turbulence (mouse movement)
      const turbulence = Math.min(signalsRef.current.pixelsMoved / 10000, 1)
      const swayAmount = turbulence * 0.1
      treeGroup.rotation.z = Math.sin(time * 2) * swayAmount
      treeGroup.rotation.x = Math.cos(time * 1.5) * swayAmount * 0.5

      // Update star rotation
      star.rotation.y += deltaTime * 2
      star.rotation.z = Math.sin(time * 3) * 0.2

      // Update tree lights (twinkling)
      const crystallization = Math.min(signalsRef.current.idleMs / 5000, 1)
      treeLights.forEach((light, i) => {
        const twinkle = Math.sin(time * 3 + i) * 0.5 + 0.5
        light.intensity = 0.5 + twinkle * 1.5 * (1 + crystallization * 0.5)
        const colorShift = Math.sin(time * 2 + i * 0.5)
        light.color.setHSL((colorShift * 0.1 + i * 0.1) % 1, 1, 0.5)
      })

      // Update ornaments
      ornaments.forEach((ornament) => {
        const pos = ornament.mesh.position
        const target = ornament.targetPosition

        // Calculate crystallization effect (settle onto tree)
        const settleAmount = crystallization * 0.7

        // Apply turbulence (swirl around)
        const swirlAmount = turbulence * 0.5
        const swirlX = Math.sin(time * 2 + pos.y * 2) * swirlAmount
        const swirlZ = Math.cos(time * 1.5 + pos.y * 2) * swirlAmount

        // Interpolate towards target position
        const targetX = target.x * settleAmount + swirlX
        const targetY = target.y * settleAmount + (pos.y * (1 - settleAmount))
        const targetZ = target.z * settleAmount + swirlZ

        // Smooth movement towards target
        pos.x += (targetX - pos.x) * deltaTime * 2 + ornament.velocity.x * (1 - settleAmount)
        pos.y += (targetY - pos.y) * deltaTime * 2 + ornament.velocity.y * (1 - settleAmount)
        pos.z += (targetZ - pos.z) * deltaTime * 2 + ornament.velocity.z * (1 - settleAmount)

        // Add rotation
        ornament.mesh.rotation.y += deltaTime * 2
        ornament.mesh.rotation.x += deltaTime * 1.5

        // Update velocity with some damping
        ornament.velocity.multiplyScalar(0.98)
      })

      // Update sparkles
      sparkles.forEach((sparkle, index) => {
        sparkle.life -= deltaTime * 2
        if (sparkle.life <= 0) {
          scene.remove(sparkle.mesh)
          sparkle.mesh.geometry.dispose()
          ;(sparkle.mesh.material as THREE.Material).dispose()
          sparkles.splice(index, 1)
        } else {
          sparkle.mesh.position.add(
            sparkle.velocity.clone().multiplyScalar(deltaTime * 5)
          )
          ;(sparkle.mesh.material as THREE.MeshBasicMaterial).opacity = sparkle.life
          sparkle.mesh.scale.setScalar(1 + (1 - sparkle.life) * 2)
        }
      })

      // Opening animation
      if (isOpening) {
        const openingProgress = Math.min((now - (startTime + loadingDuration)) / 1500, 1)
        
        // Tree lights up
        treeLights.forEach((light) => {
          light.intensity = 2 + Math.sin(time * 5) * 0.5
        })

        // Star glows
        ;(star.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + openingProgress

        // Ornaments settle completely
        ornaments.forEach((ornament) => {
          const pos = ornament.mesh.position
          pos.lerp(ornament.targetPosition, openingProgress * 0.1)
        })

        // Camera pull back
        camera.position.z = 8 + openingProgress * 2
        camera.position.y = 2 + openingProgress * 1
      }

      renderer.render(scene, camera)

      // Check if loading is complete
      if (currentProgress >= 1 && !isOpening && signalsRef.current.isTracking) {
        signalsRef.current.isTracking = false
        setIsOpening(true)

        // Final idle time calculation
        const finalIdleMs = Date.now() - signalsRef.current.lastMoveTime
        if (finalIdleMs > 100) {
          signalsRef.current.idleMs += finalIdleMs
        }

        // Log signals for debugging
        console.log('Loading complete, signals:', {
          pixelsMoved: signalsRef.current.pixelsMoved,
          clicks: signalsRef.current.clicks,
          idleMs: signalsRef.current.idleMs,
        })

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
      createSparkles(e.clientX, e.clientY)
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
      ornaments.forEach((ornament) => {
        scene.remove(ornament.mesh)
        ornament.mesh.geometry.dispose()
        ;(ornament.mesh.material as THREE.Material).dispose()
      })

      sparkles.forEach((sparkle) => {
        scene.remove(sparkle.mesh)
        sparkle.mesh.geometry.dispose()
        ;(sparkle.mesh.material as THREE.Material).dispose()
      })

      treeLights.forEach((light) => scene.remove(light))
      scene.remove(treeGroup)
      scene.remove(ambientLight)

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
