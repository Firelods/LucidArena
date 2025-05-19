import { Engine, Scene } from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';

export class BabylonEngine {
    private engine: Engine;

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true);
        window.addEventListener('resize', () => this.engine.resize());
    }

    public getEngine() {
        return this.engine;
    }
}
