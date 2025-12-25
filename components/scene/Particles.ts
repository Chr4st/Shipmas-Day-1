import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { SnowParticleShader } from '../shaders/SnowParticleShader';

class Particles {
    scene: THREE.Scene;
    particleSystem: THREE.Points | null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.particleSystem = null;
    }

    load(): Promise<void> {
        return new Promise((resolve) => {
            const particleCount = 6000;

            const particles = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            const particleScales = new Float32Array(particleCount);
            for (let i = 0; i < particleCount; i++) {
                particlePositions[i * 3] = (Math.random() - 0.5) * 20;
                particlePositions[i * 3 + 1] = Math.random() * 20;
                particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

                particleScales[i] = 0.7 + Math.random() * 1.6;
            }
            particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            particles.setAttribute('aScale', new THREE.BufferAttribute(particleScales, 1));

            const particleMaterial = new ShaderMaterial({
                vertexShader: SnowParticleShader.vertexShader,
                fragmentShader: SnowParticleShader.fragmentShader,
                uniforms: {
                    color: { value: new THREE.Color('#fff3ef') },
                    size: { value: 0.16 * window.devicePixelRatio },
                    scale: { value: window.innerHeight / 2 }
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.NormalBlending
            });

            this.particleSystem = new THREE.Points(particles, particleMaterial);
            this.scene.add(this.particleSystem);

            resolve();
        });
    }

    update(deltaTime: number) {
        if (!this.particleSystem) return;
        const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length / 3; i++) {
            positions[i * 3 + 1] -= deltaTime * 0.42;
            
            positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.6) * deltaTime * 0.25;
            positions[i * 3 + 2] += Math.cos(positions[i * 3 + 1] * 0.35) * deltaTime * 0.14;

            if (positions[i * 3 + 1] < -0.2) {
                positions[i * 3 + 1] = 15;
                positions[i * 3] = (Math.random() - 0.5) * 20;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
            }
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
}

export default Particles;

