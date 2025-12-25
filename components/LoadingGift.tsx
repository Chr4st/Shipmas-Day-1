'use client'

// Three.js Christmas scene loading animation
// Integrates the Christmas scene from cconsta1/christmas-scene
// Tracks user interactions: mouse movement, clicks, and idle time

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

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

  // Three.js setup
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene setup with fog
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
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

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

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0b1030, 0.35)
    scene.add(ambientLight)

    const moonLight = new THREE.DirectionalLight(0xd7e4ff, 1.05)
    moonLight.position.set(5, 10, 5)
    moonLight.castShadow = true
    moonLight.shadow.mapSize.width = 2048
    moonLight.shadow.mapSize.height = 2048
    moonLight.shadow.camera.near = 0.1
    moonLight.shadow.camera.far = 30
    moonLight.shadow.camera.left = -10
    moonLight.shadow.camera.right = 10
    moonLight.shadow.camera.top = 10
    moonLight.shadow.camera.bottom = -10
    scene.add(moonLight)

    const treeLight = new THREE.PointLight(0xffffff, 1.25, 9)
    treeLight.position.set(0, 2, 0)
    scene.add(treeLight)

    const rimLight = new THREE.SpotLight(0x2b2f6f, 1.6)
    rimLight.position.set(-5, 5, -5)
    rimLight.lookAt(0, 0, 0)
    scene.add(rimLight)

    // Scene objects
    let tree: THREE.Group | null = null
    const gifts: THREE.Mesh[] = []
    let particleSystem: THREE.Points | null = null
    let fireflies: THREE.Points | null = null

    // Load Christmas tree
    const gltfLoader = new GLTFLoader()
    gltfLoader.load(
      '/models/christmas-tree/christmas_tree_2.glb',
      (gltf) => {
        gltf.scene.scale.set(0.8, 0.8, 0.8)
        gltf.scene.position.set(0, 0, 0)
        scene.add(gltf.scene)
        tree = gltf.scene
      },
      undefined,
      (error) => {
        console.error('Error loading tree model:', error)
        // Fallback: create a simple tree
        const treeGroup = new THREE.Group()
        const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x0d5f2d })
        for (let i = 0; i < 4; i++) {
          const geometry = new THREE.ConeGeometry(0.5 - i * 0.1, 1 - i * 0.2, 8)
          const mesh = new THREE.Mesh(geometry, treeMaterial)
          mesh.position.y = i * 0.8 - 1
          treeGroup.add(mesh)
        }
        scene.add(treeGroup)
        tree = treeGroup
      }
    )

    // Create gifts
    const giftGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6)
    const palettes = [
      { base: 0xe10600, ribbon: 0xffd400 },
      { base: 0x0047ff, ribbon: 0xffffff },
      { base: 0xffd400, ribbon: 0x0047ff },
      { base: 0xb8f4d6, ribbon: 0xe10600 },
      { base: 0xffffff, ribbon: 0xe10600 },
    ]
    const giftPositions = [
      { x: -2.5, z: 2, r: 0.2 },
      { x: -1.8, z: -2, r: -0.5 },
      { x: 2.2, z: 2.2, r: 0.8 },
      { x: 1.5, z: -1.5, r: -0.2 },
      { x: 0, z: 2.5, r: 0 },
    ]

    giftPositions.forEach((pos, index) => {
      const palette = palettes[index % palettes.length]
      const material = new THREE.MeshStandardMaterial({
        color: palette.base,
        metalness: 0.3,
        roughness: 0.7,
      })
      const gift = new THREE.Mesh(giftGeometry, material)
      gift.position.set(pos.x, 0.3, pos.z)
      gift.rotation.y = pos.r
      gift.castShadow = true
      gift.receiveShadow = true
      scene.add(gift)
      gifts.push(gift)
    })

    // Snow particles
    const particleCount = reducedMotion ? 1000 : 3000
    const particles = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    const particleScales = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 20
      particlePositions[i * 3 + 1] = Math.random() * 20
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20
      particleScales[i] = 0.7 + Math.random() * 1.6
    }

    particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particles.setAttribute('aScale', new THREE.BufferAttribute(particleScales, 1))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xfff3ef,
      size: 0.16 * Math.min(window.devicePixelRatio, 2),
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending,
    })

    particleSystem = new THREE.Points(particles, particleMaterial)
    scene.add(particleSystem)

    // Fireflies
    const firefliesCount = reducedMotion ? 15 : 30
    const firefliesGeometry = new THREE.BufferGeometry()
    const firefliesPositions = new Float32Array(firefliesCount * 3)
    const firefliesScales = new Float32Array(firefliesCount)

    for (let i = 0; i < firefliesCount; i++) {
      firefliesPositions[i * 3] = (Math.random() - 0.5) * 10
      firefliesPositions[i * 3 + 1] = Math.random() * 4 + 0.5
      firefliesPositions[i * 3 + 2] = (Math.random() - 0.5) * 10
      firefliesScales[i] = Math.random()
    }

    firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(firefliesPositions, 3))
    firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(firefliesScales, 1))

    const firefliesMaterial = new THREE.PointsMaterial({
      color: 0xffff00,
      size: 50,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial)
    scene.add(fireflies)

    // Floor
    const floorSize = 40
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize, 32, 32)
    floorGeometry.rotateX(-Math.PI / 2)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.1,
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.position.y = -0.5
    floor.receiveShadow = true
    scene.add(floor)

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
    const clock = new THREE.Clock()

    function animate() {
      const now = Date.now()
      const deltaTime = (now - lastTime) / 1000
      lastTime = now

      const elapsed = now - startTime
      const currentProgress = Math.min(elapsed / loadingDuration, 1)
      setProgress(currentProgress)

      const elapsedTime = clock.getElapsedTime()
      const time = elapsedTime

      // Update controls
      controls.update()

      // Tree sway based on mouse movement
      const turbulence = Math.min(signalsRef.current.pixelsMoved / 10000, 1)
      if (tree) {
        tree.rotation.z = Math.sin(time * 2) * turbulence * 0.1
        tree.rotation.x = Math.cos(time * 1.5) * turbulence * 0.05
      }

      // Update gifts
      gifts.forEach((gift, i) => {
        gift.rotation.y += deltaTime * 0.5
        gift.position.y = 0.3 + Math.sin(time * 2 + i) * 0.1 * turbulence
      })

      // Update particles (snow)
      if (particleSystem) {
        const positions = particleSystem.geometry.attributes.position.array as Float32Array
        const windEffect = turbulence * 0.5
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3 + 1] -= deltaTime * 0.42
          positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.6) * deltaTime * (0.25 + windEffect)
          positions[i * 3 + 2] += Math.cos(positions[i * 3 + 1] * 0.35) * deltaTime * 0.14

          if (positions[i * 3 + 1] < -0.2) {
            positions[i * 3 + 1] = 15
            positions[i * 3] = (Math.random() - 0.5) * 20
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20
          }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true
      }

      // Update fireflies
      if (fireflies) {
        const positions = fireflies.geometry.attributes.position.array as Float32Array
        const crystallization = Math.min(signalsRef.current.idleMs / 5000, 1)
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3] += Math.sin(time * 2 + i) * deltaTime * 0.2 * (1 - crystallization * 0.5)
          positions[i * 3 + 1] += Math.cos(time * 1.5 + i) * deltaTime * 0.15 * (1 - crystallization * 0.5)
          positions[i * 3 + 2] += Math.sin(time * 1.8 + i) * deltaTime * 0.1 * (1 - crystallization * 0.5)
        }
        fireflies.geometry.attributes.position.needsUpdate = true
      }

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
        treeLight.intensity = 2 + Math.sin(time * 5) * 0.5
        camera.position.z = 12 + openingProgress * 2
        camera.position.y = 2 + openingProgress * 1
      }

      renderer.render(scene, camera)

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

      sparkles.forEach((sparkle) => {
        scene.remove(sparkle.mesh)
        sparkle.mesh.geometry.dispose()
        ;(sparkle.mesh.material as THREE.Material).dispose()
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
