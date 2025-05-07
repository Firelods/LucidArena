import {
    Scene,
    Vector3,
    Animation,
    EasingFunction,
    QuinticEase,
    Mesh,
    ArcRotateCamera,
    Tools,
} from '@babylonjs/core';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';

const targetOrientations: Record<number, Vector3> = {
    1: new Vector3(0, 0, 0),
    2: new Vector3(Math.PI / 2, 0, 0),
    3: new Vector3(0, 0, Math.PI / 2),
    4: new Vector3(0, 0, -Math.PI / 2),
    5: new Vector3(-Math.PI / 2, 0, 0),
    6: new Vector3(Math.PI, 0, 0),
};

export class DiceModule {
    private scene: Scene;
    private dice!: Mesh;
    private originalScaling!: Vector3;
    private originalRotation!: Vector3;

    constructor(
        scene: Scene,
        private camera: ArcRotateCamera,
    ) {
        this.scene = scene;
    }

    async init() {
        await AppendSceneAsync('/assets/de.glb', this.scene);
        const root = this.scene.getMeshByName('__root__')!;
        root.name = 'diceRoot';
        this.dice = this.scene.meshes.find((m) =>
            m.name.includes('diceRoot'),
        ) as Mesh;
        this.dice.setParent(this.camera);
        this.dice.position = new Vector3(0, 0, 5);
        this.dice.rotation = new Vector3(
            Tools.ToRadians(0),
            Tools.ToRadians(270),
            Tools.ToRadians(90),
        );
        this.dice.scaling = new Vector3(0.5, 0.5, 0.5);
        this.originalScaling = this.dice.scaling.clone();
        this.originalRotation = this.dice.rotation.clone();
    }

    async roll(result: number) {
        this.dice.rotation = this.originalRotation.clone();
        const fps = 60;
        const holdFrame = 120;
        const midFrame = 60;

        const anim = new Animation(
            'roll',
            'rotation',
            fps,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        anim.setKeys([
            { frame: 0, value: this.originalRotation.clone() },
            {
                frame: midFrame,
                value: new Vector3(
                    Math.random() * Math.PI * 4,
                    Math.random() * Math.PI * 4,
                    Math.random() * Math.PI * 4,
                ),
            },
            {
                frame: holdFrame - 30,
                value: targetOrientations[result]
                    .clone()
                    .add(new Vector3(Math.PI / 2, 0, 0)),
            },
            {
                frame: holdFrame,
                value: targetOrientations[result]
                    .clone()
                    .add(new Vector3(Math.PI / 2, 0, 0)),
            },
        ]);

        const ease = new QuinticEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        anim.setEasingFunction(ease);

        this.dice.animations = [anim];
        this.scene.beginAnimation(this.dice, 0, holdFrame, false);

        await new Promise((r) => setTimeout(r, (holdFrame / fps) * 1000));
    }

    private animateScaling(
        from: Vector3,
        to: Vector3,
        frames = 20,
    ): Promise<void> {
        const anim = new Animation(
            'scaleAnim',
            'scaling',
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        anim.setKeys([
            { frame: 0, value: from },
            { frame: frames, value: to },
        ]);
        this.dice.animations = [anim];
        this.scene.beginAnimation(this.dice, 0, frames, false);
        return new Promise((r) => {
            setTimeout(r, (frames / 60) * 2000);
        });
    }

    async hide() {
        // animation
        await this.animateScaling(
            this.dice.scaling.clone(),
            this.originalScaling.scale(0),
        );
        this.dice.setEnabled(false);
    }
    async show() {
        this.dice.setEnabled(true);
        // animation
        await this.animateScaling(
            this.originalScaling.scale(0),
            this.originalScaling,
        );
    }
}
