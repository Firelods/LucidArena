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
import { useGameSocket } from '../hooks/useGameSocket';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GameStateDTO } from '../dto/GameStateDTO';

export type GameSceneHandle = {
  /** Lance le dé et déplace le joueur courant */
  rollAndMove: (steps: number) => Promise<void>;
};

const GameScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardMod = useRef<BoardModule>(null!);
  const diceMod = useRef<DiceModule>(null!);
  const sceneMgrRef = useRef<SceneManager>(null);
  const gameStateRef = useRef<GameStateDTO | null>(null);

  // Récupère contexte jeu (state synchrone)
  const { roomId } = useParams();
  const auth = useAuth();
  const user = auth?.user;
  const nickname = user?.nickname || '';
  // On récupère l'état du jeu (gameState), l'action pour lancer le dé et si c'est à mon tour
  const { gameState, rollDice } = useGameSocket(roomId!);

  // --- Stocke la dernière scène Babylon
  const boardSceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BabylonEngine(canvasRef.current);
    const sceneMgr = new SceneManager(engine.getEngine());
    sceneMgrRef.current = sceneMgr;
    gameStateRef.current = gameState;
    const indexOfPlayer =
      gameState?.players.findIndex((p) => p.nickname === nickname) || 0; // On prend le joueur courant ou -1 par défaut
    console.log(
      `GameScene: joueur courant est ${nickname} (index ${indexOfPlayer})`,
    );
    // Main board (piloté online)
    sceneMgr.createScene('main', async (scene) => {
      importSkyBox(scene);
      await initBoard(
        scene,
        boardMod,
        diceMod,
        () => gameStateRef.current, // getter de state serveur
        rollDice,
        nickname,
          gameState!.players.length,
          indexOfPlayer,
          sceneMgr
      );
      boardSceneRef.current = scene;
    });

    // Scène d'introduction
    sceneMgr.createScene('introScene', (scene) => {
      importSkyBox(scene);
      initIntroScene(scene, sceneMgr);
    });

    // Scène CloudGame
    sceneMgr.createScene('CloudGame', (scene) => {
      importSkyBox(scene);
      initCloudGame(scene, sceneMgr,indexOfPlayer);
    });
    // Scene MiniGame1 (subway surfer)
    sceneMgr.createScene('mini1', (scene) => {
      importSkyBox(scene);
      console.log('Initialisation du mini-jeu 1');
      console.log('GameState actuel:', gameStateRef.current);

      initMiniGame1(scene, canvasRef.current!, sceneMgr, indexOfPlayer);
    });

    // Démarrage de la boucle et affichage de la scène principale
    sceneMgr.run();
    sceneMgr.switchTo('introScene');

    return () => engine.getEngine().dispose();
  }, []);

  // --- Synchronisation à chaque update du state ---
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
};

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
