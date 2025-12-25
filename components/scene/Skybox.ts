import * as THREE from 'three';
import { SkyboxShader } from '../shaders/SkyboxShader';

class Skybox {
    scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    load(): Promise<void> {
        return new Promise((resolve) => {
            const skyboxSize = 20;  
            const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);
            const skyboxMaterial = new THREE.ShaderMaterial({
                vertexShader: SkyboxShader.vertexShader,
                fragmentShader: SkyboxShader.fragmentShader,
                uniforms: THREE.UniformsUtils.clone(SkyboxShader.uniforms),
                side: THREE.BackSide
            });

            const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
            this.scene.add(skybox);

            resolve();
        });
    }
}

export default Skybox;

