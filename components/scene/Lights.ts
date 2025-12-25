import * as THREE from 'three';

class Lights {
    scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    load(): Promise<void> {
        return new Promise((resolve) => {
            const ambientLight = new THREE.AmbientLight(0x0b1030, 0.35);
            this.scene.add(ambientLight);

            const moonLight = new THREE.DirectionalLight(0xd7e4ff, 1.05);
            moonLight.position.set(5, 10, 5);
            moonLight.castShadow = true;
            
            moonLight.shadow.mapSize.width = 2048;
            moonLight.shadow.mapSize.height = 2048;
            moonLight.shadow.camera.near = 0.1;
            moonLight.shadow.camera.far = 30;
            moonLight.shadow.camera.left = -10;
            moonLight.shadow.camera.right = 10;
            moonLight.shadow.camera.top = 10;
            moonLight.shadow.camera.bottom = -10;
            moonLight.shadow.bias = -0.0005;
            
            this.scene.add(moonLight);

            const treeLight = new THREE.PointLight(0xffffff, 1.25, 9);
            treeLight.position.set(0, 2, 0);
            this.scene.add(treeLight);

            const rimLight = new THREE.SpotLight(0x2b2f6f, 1.6);
            rimLight.position.set(-5, 5, -5);
            rimLight.lookAt(0, 0, 0);
            this.scene.add(rimLight);

            resolve();
        });
    }
}

export default Lights;

