import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { GiftShader } from '../shaders/GiftShader';

class Gift {
    scene: THREE.Scene;
    gifts: THREE.Mesh[];

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.gifts = [];
    }

    load(): Promise<void> {
        return new Promise((resolve) => {
            const giftGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            
            const palettes = [
                { base: 0xe10600, ribbon: 0xffd400 },
                { base: 0x0047ff, ribbon: 0xffffff },
                { base: 0xffd400, ribbon: 0x0047ff },
                { base: 0xb8f4d6, ribbon: 0xe10600 },
                { base: 0xffffff, ribbon: 0xe10600 },
            ];

            const positions = [
                { x: -2.5, z: 2, r: 0.2 },
                { x: -1.8, z: -2, r: -0.5 },
                { x: 2.2, z: 2.2, r: 0.8 },
                { x: 1.5, z: -1.5, r: -0.2 },
                { x: 0, z: 2.5, r: 0 }
            ];

            positions.forEach((pos, index) => {
                const palette = palettes[index % palettes.length];
                
                const material = new ShaderMaterial({
                    vertexShader: GiftShader.vertexShader,
                    fragmentShader: GiftShader.fragmentShader,
                    uniforms: THREE.UniformsUtils.clone(GiftShader.uniforms)
                });

                material.uniforms.uBaseColor.value.setHex(palette.base);
                material.uniforms.uRibbonColor.value.setHex(palette.ribbon);

                const mesh = new THREE.Mesh(giftGeometry, material);
                mesh.position.set(pos.x, 0.3, pos.z);
                mesh.rotation.y = pos.r;
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                this.scene.add(mesh);
                this.gifts.push(mesh);
            });

            resolve();
        });
    }

    update(deltaTime: number, elapsedTime: number) {
        this.gifts.forEach(gift => {
            if ((gift.material as any).uniforms) {
                (gift.material as any).uniforms.uTime.value = elapsedTime;
            }
        });
    }
}

export default Gift;

