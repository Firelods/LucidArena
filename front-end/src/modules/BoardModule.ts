import { Scene, Vector3, Animation, Tools } from '@babylonjs/core';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { boardTiles } from '../utils/board';

export class BoardModule {
    private scene: Scene;
    private player!: any;
    private currentIndex = 0;
    private readonly initialHeight = 1.2;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    async init() {
        await AppendSceneAsync('/assets/board.glb', this.scene);
        const BoardRoot = this.scene.getMeshByName('__root__')!;
        BoardRoot.name = 'boardRoot';
        // collecte et tri des tuiles
        const tiles = this.scene.meshes
            .filter((m) => m.name.startsWith('Tile_'))
            .map((m) => ({ idx: +m.name.split('_')[1], pos: m.position }))
            .sort((a, b) => a.idx - b.idx)
            .map((t) => t.pos);
        boardTiles.splice(0, boardTiles.length, ...tiles);

        await AppendSceneAsync('/assets/character.glb', this.scene);
        const root = this.scene.getMeshByName('__root__')!;
        root.name = 'characterRoot';
        root.parent = this.scene.getMeshByName('boardRoot')!;
        root.rotation = new Vector3(0, Tools.ToRadians(180), 0);
        root.scaling = new Vector3(0.5, 0.5, 0.5);
        root.position = boardTiles[0]
            .clone()
            .add(new Vector3(0, this.initialHeight, 0));
        this.player = root;
    }

    private getYRotation(from: Vector3, to: Vector3) {
        const d = to.subtract(from);
        return Math.atan2(d.x, d.z);
    }

    private animateJump(from: Vector3, to: Vector3) {
        return new Promise<void>((res) => {
            this.player.rotation.y = this.getYRotation(from, to);
            const anim = new Animation(
                'jump',
                'position',
                60,
                Animation.ANIMATIONTYPE_VECTOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );
            anim.setKeys([
                { frame: 0, value: from.clone() },
                {
                    frame: 30,
                    value: from
                        .add(to)
                        .scale(0.5)
                        .add(new Vector3(0, 1, 0)),
                },
                { frame: 60, value: to.clone() },
            ]);
            this.player.animations = [anim];
            this.scene.beginAnimation(this.player, 0, 60, false, 1, () =>
                res(),
            );
        });
    }

    async movePlayer(steps: number) {
        for (let i = 0; i < steps; i++) {
            const from = boardTiles[this.currentIndex]
                .clone()
                .add(new Vector3(0, this.initialHeight, 0));
            this.currentIndex++;
            const to = boardTiles[this.currentIndex]
                .clone()
                .add(new Vector3(0, this.initialHeight, 0));
            await this.animateJump(from, to);
        }
    }
}
