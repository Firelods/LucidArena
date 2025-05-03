import { Engine, Scene } from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';

export class BabylonEngine {
    private engine: Engine;
    private scene: Scene;

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        Inspector.Show(this.scene, {
            // embedMode: true,
            showInspector: true,
        });
        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener('resize', () => this.engine.resize());
    }

    public getScene() {
        return this.scene;
    }
    public getEngine() {
        return this.engine;
    }
}
