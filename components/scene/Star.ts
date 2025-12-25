import * as THREE from 'three';
import { ShaderMaterial } from 'three';
import { StarShader } from '../shaders/StarShader';

class Star {
    scene: THREE.Scene;
    tree: THREE.Object3D;
    star: THREE.Mesh;

    constructor(scene: THREE.Scene, tree: THREE.Object3D) {
        this.scene = scene;
        this.tree = tree;

        const starGeometry = new THREE.OctahedronGeometry(0.1, 0);

        const starMaterial = new ShaderMaterial({
            vertexShader: StarShader.vertexShader,
            fragmentShader: StarShader.fragmentShader,
            uniforms: THREE.UniformsUtils.clone(StarShader.uniforms),
        });

        this.star = new THREE.Mesh(starGeometry, starMaterial);

        this.positionStar();

        this.scene.add(this.star);
    }

    positionStar() {
        const box = new THREE.Box3().setFromObject(this.tree);
        const treeHeight = box.max.y - box.min.y;

        this.star.position.set(0, treeHeight + 0.1, 0);
    }
}

export default Star;

