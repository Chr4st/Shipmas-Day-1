import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { SnowShader } from '../shaders/SnowShader';

class Floor {
    scene: THREE.Scene;
    material: ShaderMaterial | null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.material = null;
    }

    load(): Promise<void> {
        return new Promise((resolve) => {
            const floorSize = 40; 
            const segments = 256;
            const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize, segments, segments);
            
            floorGeometry.rotateX(-Math.PI / 2);

            this.material = new ShaderMaterial({
                vertexShader: SnowShader.vertexShader,
                fragmentShader: SnowShader.fragmentShader,
                uniforms: THREE.UniformsUtils.clone(SnowShader.uniforms),
                side: THREE.DoubleSide
            });

            const floor = new THREE.Mesh(floorGeometry, this.material);
            floor.receiveShadow = true;
            floor.position.y = -0.5;
            this.scene.add(floor);

            resolve();
        });
    }

    update(camera: THREE.Camera) {
        if (this.material) {
            this.material.uniforms.viewVector.value.copy(camera.position);
        }
    }
}

export default Floor;

