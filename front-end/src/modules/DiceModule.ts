import {
    Scene,
    Vector3,
    Animation,
    EasingFunction,
    QuinticEase,
    Mesh,
} from '@babylonjs/core';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';

const targetOrientations: Record<number, Vector3> = {
    1: new Vector3(0, 0, 0),
    2: new Vector3(Math.PI / 2, 0, 0),
    3: new Vector3(0, 0, -Math.PI / 2),
    4: new Vector3(0, 0, Math.PI / 2),
    5: new Vector3(-Math.PI / 2, 0, 0),
    6: new Vector3(Math.PI, 0, 0),
};

export class DiceModule {
    private scene: Scene;
    private dice!: Mesh;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    async init() {
        await AppendSceneAsync('/assets/de.glb', this.scene);
        const root = this.scene.getMeshByName('__root__')!;
        root.name = 'diceRoot';
        this.dice = this.scene.meshes.find((m) =>
            m.name.includes('diceRoot'),
        ) as Mesh;
        this.dice.position = new Vector3(0, 5, 0);
        this.dice.scaling = new Vector3(0.5, 0.5, 0.5);
    }

    async roll(result: number) {
        const anim = new Animation(
            'roll',
            'rotation',
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        anim.setKeys([
            { frame: 0, value: this.dice.rotation.clone() },
            {
                frame: 30,
                value: new Vector3(
                    Math.random() * Math.PI * 4,
                    Math.random() * Math.PI * 4,
                    Math.random() * Math.PI * 4,
                ),
            },
            { frame: 60, value: targetOrientations[result] },
        ]);
        const ease = new QuinticEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        anim.setEasingFunction(ease);

        this.dice.animations = [anim];
        this.scene.beginAnimation(this.dice, 0, 60, false);
        await new Promise((r) => setTimeout(r, 1000));
    }
}
