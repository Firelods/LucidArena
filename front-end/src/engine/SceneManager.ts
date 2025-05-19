// src/engine/SceneManager.ts
import { Engine, Scene } from '@babylonjs/core';

export class SceneManager {
    private engine: Engine;
    private scenes: Record<string, Scene> = {};
    private active?: Scene;

    constructor(engine: Engine) {
        this.engine = engine;
    }

    createScene(name: string, init: (scene: Scene) => void) {
        const scene = new Scene(this.engine);
        init(scene);
        this.scenes[name] = scene;
        return scene;
    }

    switchTo(name: string) {
        if (this.active && this.active !== this.scenes[name]) {
            this.active.dispose();
        }
        this.active = this.scenes[name];
    }

    run() {
        this.engine.runRenderLoop(() => {
            if (this.active) {
                this.active.render();
            }
        });
        window.addEventListener('resize', () => this.engine.resize());
    }
}
