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
import { MiniGameInstructionDTO } from '../dto/MiniGameInstructionDTO';

const GameScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardMod = useRef<BoardModule>(null!);
  const diceMod = useRef<DiceModule>(null!);
  const sceneMgrRef = useRef<SceneManager>(null);
  const gameStateRef = useRef<GameStateDTO | null>(null);
  const [status, setStatus] = useState<string>('');

  // Récupère contexte jeu (state synchrone)
  const { roomId } = useParams();
  const auth = useAuth();
  const user = auth?.user;
  const nickname = user?.nickname || '';
  // On récupère l'état du jeu (gameState), l'action pour lancer le dé et si c'est à mon tour
  const { gameState, rollDice, miniGameInstr, onMiniGameEnd, miniGameOutcome } =
    useGameSocket(roomId!);
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
    sceneMgr.createScene('StarGame', (scene: Scene) => {
      importSkyBox(scene);
      initCloudGame(scene, sceneMgr, playerIdx, onMiniGameEnd);
    });

    // 2.c) Mini-jeu MiniGame1
    sceneMgr.createScene('mini1', (scene: Scene) => {
      importSkyBox(scene);
      initMiniGame1(
        scene,
        canvasRef.current!,
        sceneMgr,
        playerIdx,
        onMiniGameEnd,
      );
    });

    // Bascule vers la scène principale
    sceneMgr.switchTo('main');
  }, [gameState]);

  useEffect(() => {
    if (gameState) {
      gameStateRef.current = gameState;
    }
  }, [gameState, introDone]);

  useEffect(() => {
    const handleMiniGameInstr = async () => {
      console.log(
        `Mini-game instruction received in GameScene: ${JSON.stringify(miniGameInstr)}`,
      );
      // wait for 1s to ensure character movement is done
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!miniGameInstr) return;
      const { playerNickname: p, miniGameName: mg } = miniGameInstr;
      if (p == null) {
        // c’est un mini-jeu de groupe, pas de joueur spécifique
        console.log(`Mini-jeu de groupe: ${mg}`);

        setStatus(`Lance le mini-jeu ${mg} !`);
        sceneMgrRef.current?.switchTo(mg);
        return;
      }
      if (p === nickname) {
        // c’est à moi de jouer
        console.log(`C'est à moi de jouer au mini-jeu: ${mg}`);

        setStatus(`À toi de jouer ! Lance le mini-jeu ${mg}`);
        sceneMgrRef.current?.switchTo(mg);
        return;
      } else {
        console.log(`C'est à ${p} de jouer au mini-jeu: ${mg}`);

        // c’est à un autre joueur
        setStatus(`${p} joue au mini-jeu ${mg}, attends ton tour…`);
      }
    };
    handleMiniGameInstr();
  }, [miniGameInstr]);

  useEffect(() => {
    console.log(
      `Mini-game outcome received in GameScene: ${JSON.stringify(miniGameOutcome)}`,
    );

    if (!miniGameOutcome) return;
    const {
      miniGameName: mg,
      winnerNickname: w,
      winnerScore: s,
    } = miniGameOutcome;

    if (w === nickname) {
      setStatus(
        `Bravo ! Tu as gagné le mini-jeu ${mg} avec un score de ${s} !`,
      );
    } else {
      setStatus(
        `${w} a gagné le mini-jeu ${mg} avec un score de ${s}. À toi de jouer !`,
      );
    }
  }, [miniGameOutcome]);

  return (
    <>
      <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />

      {status && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {status}
        </div>
      )}
    </>
  );
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
