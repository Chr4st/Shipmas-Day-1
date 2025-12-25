import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ShaderMaterial } from 'three';
import { GhibliShader } from '../shaders/GhibliShader';
import { createToonShader } from '../shaders/ToonShader';
import Star from './Star';

class ChristmasTree {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    mixer: THREE.AnimationMixer | null;
    tree: THREE.Group;
    isAnimating: boolean;
    star: Star | null;

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.mixer = null;
        this.tree = new THREE.Group(); // Temporary placeholder
        this.isAnimating = false;
        this.star = null;
    }

    load(): Promise<void> {
        return new Promise((resolve, reject) => {
            const gltfLoader = new GLTFLoader();

            gltfLoader.load(
                '/models/christmas-tree/christmas_tree_2.glb',
                (gltf: any) => {
                    gltf.scene.scale.set(0.8, 0.8, 0.8);
                    gltf.scene.position.set(0, 0, 0);
                    this.scene.add(gltf.scene);

                    this.tree = gltf.scene;

                    this.applyShaders(this.tree);
                    this.star = new Star(this.scene, this.tree);

                    this.mixer = new THREE.AnimationMixer(gltf.scene);
                    if (gltf.animations.length > 0) {
                        const action = this.mixer.clipAction(gltf.animations[0]);
                        // Animation action available if needed
                    }

                    resolve();
                },
                undefined,
                (error: any) => {
                    console.error('An error happened while loading the Christmas tree model:', error);
                    reject(error);
                }
            );
        });
    }

    applyShaders(object: THREE.Object3D) {
        const treeShaderMaterial = new ShaderMaterial({
            vertexShader: GhibliShader.vertexShader,
            fragmentShader: GhibliShader.fragmentShader,
            uniforms: THREE.UniformsUtils.clone(GhibliShader.uniforms)
        });

        object.traverse((child: any) => {
            if (child.isMesh) {
                child.material = treeShaderMaterial;

                const name = (child.name || '').toLowerCase();
                let maxDim = Infinity;

                if (child.geometry) {
                    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
                    if (child.geometry.boundingBox) {
                        const size = new THREE.Vector3();
                        child.geometry.boundingBox.getSize(size);
                        maxDim = Math.max(size.x, size.y, size.z);
                    }
                }

                const isOrnament =
                    name.startsWith('sphere') ||
                    name.includes('ornament') ||
                    name.includes('bauble') ||
                    name.includes('ball') ||
                    maxDim < 0.35;

                if (isOrnament) {
                    const toonShader = createToonShader();
                    const decorationShaderMaterial = new ShaderMaterial({
                        vertexShader: toonShader.vertexShader,
                        fragmentShader: toonShader.fragmentShader,
                        uniforms: THREE.UniformsUtils.clone(toonShader.uniforms)
                    });
                    child.material = decorationShaderMaterial;
                }
            }
        });
    }

    update(deltaTime: number) {
        if (this.mixer && this.isAnimating) {
            this.mixer.update(deltaTime);
        }
    }
}

export default ChristmasTree;

