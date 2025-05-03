// src/scenes/BoardScene.tsx
import React, {
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
} from 'react';
import {
    Engine,
    Scene,
    Vector3,
    MeshBuilder,
    Animation,
    ArcRotateCamera,
    HemisphericLight,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { boardTiles } from '../utils/board';
import '@babylonjs/loaders/glTF'; // Nécessaire pour charger les fichiers .glb
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { BabylonEngine } from '../engine/BabylonEngine';

type BoardHandle = {
    movePlayer: (steps: number) => Promise<void>;
};

const BoardScene = forwardRef<BoardHandle>((_, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<BabylonEngine>(null);
    const sceneRef = useRef<Scene>(null);
    const playerRef = useRef<any>(null);
    let currentIndex = 0;

    useImperativeHandle(ref, () => ({
        movePlayer: async (steps: number) => {
            for (let i = 1; i < steps; i++) {
                const from = boardTiles[currentIndex].clone();

                const to = boardTiles[++currentIndex].clone();
                from.y = 2;
                to.y = 2;
                await animateMove(from, to);
            }
        },
    }));

    const animateMove = (from: Vector3, to: Vector3) => {
        return new Promise<void>((resolve) => {
            const frameRate = 60;
            const anim = new Animation(
                'moveAnim',
                'position',
                frameRate,
                Animation.ANIMATIONTYPE_VECTOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
            );
            anim.setKeys([
                { frame: 0, value: from.clone() },
                { frame: frameRate, value: to.clone() },
            ]);
            playerRef.current.animations = [anim];
            sceneRef.current!.beginAnimation(
                playerRef.current,
                0,
                frameRate,
                false,
                1,
                () => {
                    resolve();
                },
            );
        });
    };

    useEffect(() => {
        if (!canvasRef.current) return;
        // Instancie engine + scene
        const be = new BabylonEngine(canvasRef.current);
        engineRef.current = be;
        sceneRef.current = be.getScene();
        const scene = be.getScene();

        const camera = new ArcRotateCamera(
            'camera',
            -Math.PI / 2,
            Math.PI / 3,
            10,
            Vector3.Zero(),
            scene,
        );
        camera.attachControl(canvasRef.current, true);
        const light = new HemisphericLight(
            'hemiLight',
            new Vector3(0, 1, 0), // direction vers le haut
            scene,
        );
        light.intensity = 0.8;
        const init = async () => {
            await AppendSceneAsync('/assets/board.glb', scene);

            const tiles = scene.meshes
                .filter((m) => m.name.startsWith('Tile_'))
                .map((m) => ({
                    idx: parseInt(m.name.split('_')[1], 10),
                    pos: m.position,
                }))
                .sort((a, b) => a.idx - b.idx)
                .map((t) => t.pos);
            boardTiles.push(...tiles);
            console.log('Board tiles:', boardTiles);

            const sphere = MeshBuilder.CreateSphere(
                'player',
                { diameter: 1 },
                scene,
            );
            sphere.position = boardTiles[0].clone();
            sphere.position.y = 2;
            sphere.parent = scene.getMeshByName('__root__')!;
            playerRef.current = sphere;
        };

        init(); // lancement de l'init async

        return () => {
            scene.dispose();
            be.getEngine().dispose();
        };
    }, []);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
});

export default BoardScene;
