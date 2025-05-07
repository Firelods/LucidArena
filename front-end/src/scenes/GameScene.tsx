// src/components/GameScene.tsx
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
  /** Lance le dé et déplace le joueur courant */
  rollAndMove: (steps: number) => Promise<void>;
};

const GameScene = forwardRef<GameSceneHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardMod = useRef<BoardModule>(null!);
  const diceMod = useRef<DiceModule>(null!);
  const playerCount = 4;
  let currentPlayer = 0;

  useEffect(() => {
    if (!canvasRef.current) return;
    const be = new BabylonEngine(canvasRef.current);
    const scene = be.getScene();

    // caméra + contrôle
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);

    // lumière
    const light = new HemisphericLight(
      'hemiLight',
      new Vector3(0, 1, 0),
      scene
    );
    light.intensity = 0.8;

    boardMod.current = new BoardModule(scene);
    // on passe bien camera ici
    diceMod.current = new DiceModule(scene, camera);

    (async () => {
      // init avec 4 persos
      await boardMod.current.init(
        4,
        [
          '/assets/character.glb',
          '/assets/character_pink.glb',
          '/assets/character_blue.glb',
          '/assets/character_green.glb',
        ]
      );
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
      // affiche + lance le dé
      await diceMod.current.show();
      await diceMod.current.roll(steps);
      await diceMod.current.hide();

      // déplace le joueur courant
      await boardMod.current.movePlayer(currentPlayer, steps);
      // passe au suivant
      currentPlayer = (currentPlayer + 1) % playerCount;
    },
  }));

  return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
});

export default GameScene;
