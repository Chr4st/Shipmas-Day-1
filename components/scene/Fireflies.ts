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

            for(let i = 0; i < firefliesCount; i++) {
                // Spread stars across wider area for background
                positionArray[i * 3 + 0] = (Math.random() - 0.5) * 30;
                positionArray[i * 3 + 1] = Math.random() * 15 + 2;
                positionArray[i * 3 + 2] = (Math.random() - 0.5) * 30;

                scaleArray[i] = 0.5 + Math.random() * 0.5; // More consistent sizes
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

