import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { FirefliesShader } from '../shaders/FirefliesShader';

class Fireflies {
    scene: THREE.Scene;
    fireflies: THREE.Points | null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.fireflies = null;
    }

    load(): Promise<void> {
        return new Promise((resolve) => {
            const firefliesGeometry = new THREE.BufferGeometry();
            const firefliesCount = 50; // More fireflies for starry background
            const positionArray = new Float32Array(firefliesCount * 3);
            const scaleArray = new Float32Array(firefliesCount);

            // Create aligned star pattern for better visual organization
            const gridSize = Math.ceil(Math.sqrt(firefliesCount))
            let starIndex = 0
            
            for(let i = 0; i < gridSize && starIndex < firefliesCount; i++) {
                for(let j = 0; j < gridSize && starIndex < firefliesCount; j++) {
                    // Create a grid pattern with slight randomization for natural look
                    const baseX = ((i / gridSize) - 0.5) * 25
                    const baseZ = ((j / gridSize) - 0.5) * 25
                    const baseY = Math.random() * 12 + 3
                    
                    // Add slight random offset for natural alignment
                    positionArray[starIndex * 3 + 0] = baseX + (Math.random() - 0.5) * 3
                    positionArray[starIndex * 3 + 1] = baseY + (Math.random() - 0.5) * 2
                    positionArray[starIndex * 3 + 2] = baseZ + (Math.random() - 0.5) * 3

                    scaleArray[starIndex] = 0.6 + Math.random() * 0.4 // Consistent sizes
                    starIndex++
                }
            }
            
            // Fill remaining slots randomly if needed
            for(let i = starIndex; i < firefliesCount; i++) {
                positionArray[i * 3 + 0] = (Math.random() - 0.5) * 30
                positionArray[i * 3 + 1] = Math.random() * 15 + 2
                positionArray[i * 3 + 2] = (Math.random() - 0.5) * 30
                scaleArray[i] = 0.6 + Math.random() * 0.4
            }

            firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
            firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1));

            const firefliesMaterial = new ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                    uSize: { value: 150 } // Increased size for better visibility
                },
                vertexShader: FirefliesShader.vertexShader,
                fragmentShader: FirefliesShader.fragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
            this.scene.add(this.fireflies);

            resolve();
        });
    }

    update(deltaTime: number, elapsedTime: number) {
        if(this.fireflies) {
            (this.fireflies.material as any).uniforms.uTime.value = elapsedTime;
        }
    }
}

export default Fireflies;

