import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { BabylonEngine } from '../engine/BabylonEngine';
import { BoardModule } from '../modules/BoardModule';
import { DiceModule } from '../modules/DiceModule';
import { Scene, CubeTexture } from '@babylonjs/core';

import { SceneManager } from '../engine/SceneManager';
import { initMiniGame1 } from './MiniGame1';
import { initCloudGame } from './CloudGame';
import { initBoard } from './Board';
import { initIntroScene } from './IntroScene';

export type GameSceneHandle = {
  /** Lance le dé et déplace le joueur courant */
  rollAndMove: (steps: number) => Promise<void>;
};

const GameScene = forwardRef<GameSceneHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardMod = useRef<BoardModule>(null!);
  const diceMod = useRef<DiceModule>(null!);
  const sceneMgrRef = useRef<SceneManager>(null);

  const playerCount = 4;
  let currentPlayer = 0;

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BabylonEngine(canvasRef.current);
    const sceneMgr = new SceneManager(engine.getEngine());
    sceneMgrRef.current = sceneMgr;

    // scène principale
    sceneMgr.createScene('main', async (scene) => {
      importSkyBox(scene);
      initBoard(scene, boardMod, diceMod, playerCount, currentPlayer, sceneMgr);
    });

    // Scène d'introduction
    sceneMgr.createScene('introScene', (scene) => {
      importSkyBox(scene);
      initIntroScene(scene, sceneMgr);
    });

    // Scène CloudGame
    sceneMgr.createScene('CloudGame', (scene) => {
      importSkyBox(scene);
      initCloudGame(scene, sceneMgr,2);
    });
    // Scene MiniGame1 (subway surfer)
    sceneMgr.createScene('mini1', (scene) => {
      importSkyBox(scene);
      initMiniGame1(scene, canvasRef.current!, sceneMgr,2);
    });

    // Démarrage de la boucle et affichage de la scène principale
    sceneMgr.run();
    sceneMgr.switchTo('introScene');

    return () => engine.getEngine().dispose();
  }, []);

  useImperativeHandle(ref, () => ({
    async rollAndMove(steps: number) {
      await diceMod.current.show();
      await diceMod.current.roll(steps);
      await diceMod.current.hide();
      await boardMod.current.movePlayer(currentPlayer, steps);
      
      currentPlayer = (currentPlayer + 1) % playerCount;
      sceneMgrRef.current?.switchTo('CloudGame');

    },
  }));

  return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
});

function importSkyBox(scene: Scene) {
  const envTexture = CubeTexture.CreateFromPrefilteredData(
    '/assets/skybox_high_right.env',
    scene,
  );

  // 1. Définit la texture comme environnement PBR pour la scène
  scene.environmentTexture = envTexture;

  // 2. Crée la skybox "automatiquement"
  // - size = 1000 (à adapter si besoin)
  // - PBR friendly, reflection & lighting ok
  // - true = générer le matériau PBR pour la skybox
  const SKYBOX_SIZE = 100000000;
  scene.createDefaultSkybox(envTexture, true, SKYBOX_SIZE, 0);
}

export default GameScene;
