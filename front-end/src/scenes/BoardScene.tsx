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
import { AppendSceneAsync, SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
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
    const initialHeight = 1.2; // Hauteur initiale du personnage

    useImperativeHandle(ref, () => ({
        movePlayer: async (steps: number) => {
          const height = initialHeight;
          for (let i = 1; i < steps; i++) {
            const from = boardTiles[currentIndex].clone();
            const to   = boardTiles[++currentIndex].clone();
      
            from.y = height;
            to.y   = height;
      
            await animateJump(from, to);
          }
        },
      }));

      const getYRotation = (from: Vector3, to: Vector3) => {
        const dir = to.subtract(from);
        // atan2(x, z) car Z est l’axe forward
        return Math.atan2(dir.x, dir.z);
      };

      const animateJump = (from: Vector3, to: Vector3) => {
        return new Promise<void>((resolve) => {
          // rotation instantanée
          playerRef.current.rotation.y = getYRotation(from, to);
      
          const frameRate = 60;
          const jumpHeight = 1;
          const midPos = new Vector3(
            (from.x + to.x) / 2,
            from.y + jumpHeight,
            (from.z + to.z) / 2,
          );
      
          const anim = new Animation(
            'jumpAnim',
            'position',
            frameRate,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
          );
          anim.setKeys([
            { frame: 0, value: from.clone() },
            { frame: frameRate / 2, value: midPos },
            { frame: frameRate, value: to.clone() },
          ]);
      
          playerRef.current.animations = [anim];
          sceneRef.current!.beginAnimation(
            playerRef.current,
            0,
            frameRate,
            false,
            1,
            () => resolve(),
          );
        });
      };
      

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
            const boardRoot = scene.getMeshByName('__root__')!;
            boardRoot.name = 'boardRoot';

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

            // 2) Character
            await AppendSceneAsync('/assets/character.glb', scene);
            const characterRoot = scene.getMeshByName('__root__')!;
            characterRoot.name = 'characterRoot';
            characterRoot.rotationQuaternion = null; // on annule la rotation quaternion pour pouvoir utiliser la rotation en euler
            characterRoot.parent = boardRoot; 
            // positionnement initial
            characterRoot.position = boardTiles[0].clone();
            characterRoot.position.y = 1.2;
            characterRoot.rotation.y = Math.PI / 2; 
            // on scale le personnage pour qu'il soit plus petit
            characterRoot.scaling = new Vector3(0.5, 0.5, 0.5);

            // on anime ensuite characterRoot
            playerRef.current = characterRoot;
            const initialHeight = characterRoot.position.y;
            
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
