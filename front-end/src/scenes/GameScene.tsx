import React, {
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
} from 'react';
import { BabylonEngine } from '../engine/BabylonEngine';
import { BoardModule } from '../modules/BoardModule';
import { DiceModule } from '../modules/DiceModule';
import { ArcRotateCamera, Vector3, HemisphericLight } from '@babylonjs/core';

export type GameSceneHandle = {
    rollAndMove: (steps: number) => Promise<void>;
};

const GameScene = forwardRef<GameSceneHandle>((_, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const boardMod = useRef<BoardModule>(null!);
    const diceMod = useRef<DiceModule>(null!);

    useEffect(() => {
        if (!canvasRef.current) return;
        const be = new BabylonEngine(canvasRef.current);
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

        boardMod.current = new BoardModule(scene);
        diceMod.current = new DiceModule(scene, camera);

        (async () => {
            await boardMod.current.init();
            await diceMod.current.init();
            await diceMod.current.hide();
        })();

        return () => {
            scene.dispose();
            be.getEngine().dispose();
        };
    }, []);

    useImperativeHandle(ref, () => ({
        async rollAndMove(steps: number) {
            await diceMod.current.show();
            await diceMod.current.roll(steps);
            await diceMod.current.hide();
            await boardMod.current.movePlayer(steps);
        },
    }));

    

    return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
});

export default GameScene;
