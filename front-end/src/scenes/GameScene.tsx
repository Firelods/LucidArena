import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
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
  const createdScenesRef = useRef(false);
  const [introDone, setIntroDone] = useState(false);

  // 1) Initialisation du moteur Babylon + scène d'intro
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BabylonEngine(canvasRef.current);
    const sceneMgr = new SceneManager(engine.getEngine());
    sceneMgrRef.current = sceneMgr;

    // Scène d'introduction
    sceneMgr.createScene('intro', (scene) => {
      importSkyBox(scene);
      initIntroScene(scene, sceneMgr).then(() => setIntroDone(true));
    });

    sceneMgr.run();
    sceneMgr.switchTo('intro');

    return () => engine.getEngine().dispose();
  }, []);

  // 2) Dès que gameState est non-null, on crée MAIN + mini-jeux & on bascule sur MAIN
  useEffect(() => {
    const sceneMgr = sceneMgrRef.current;
    console.log('GameState: ', gameStateRef.current);
    console.log('sceneMgr: ', sceneMgr);
    console.log(`createdScenesRef: ${createdScenesRef.current}`);
    if (!sceneMgr || !gameState || (createdScenesRef.current && introDone))
      return;
    createdScenesRef.current = true;
    const playerIdx = gameState.players.findIndex(
      (p) => p.nickname === nickname,
    );
    gameStateRef.current = gameState;

    // 2.a) Scène principale "main"
    sceneMgr.createScene('main', async (scene: Scene) => {
      importSkyBox(scene);
      await initBoard(
        scene,
        boardMod,
        diceMod,
        () => gameStateRef.current,
        rollDice,
        nickname,
        gameState.players.length,
        playerIdx,
        sceneMgr,
      );
    });

    // 2.b) Mini-jeu CloudGame
    sceneMgr.createScene('CloudGame', (scene: Scene) => {
      importSkyBox(scene);
      initCloudGame(scene, sceneMgr, playerIdx);
    });

    // 2.c) Mini-jeu MiniGame1
    sceneMgr.createScene('mini1', (scene: Scene) => {
      importSkyBox(scene);
      initMiniGame1(scene, canvasRef.current!, sceneMgr, playerIdx);
    });

    // Bascule vers la scène principale
    sceneMgr.switchTo('main');
  }, [gameState]);

  useEffect(() => {
    if (gameState) {
      gameStateRef.current = gameState;
    }
  }, [gameState, introDone]);

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
