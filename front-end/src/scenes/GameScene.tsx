import React, { useEffect, useRef, useState } from 'react';
import { BabylonEngine } from '../engine/BabylonEngine';
import { BoardModule } from '../modules/BoardModule';
import { DiceModule } from '../modules/DiceModule';
import { Scene, CubeTexture } from '@babylonjs/core';
import Notification from '../components/Notification';
import { SceneManager } from '../engine/SceneManager';
import { initRainingGame } from './RainingGame';
import { initCloudGame } from './CloudGame';
import { initBoard } from './Board';
import { initClickerGame } from './ClickerGame';
import { initMiniGame1 } from './MiniGame1';
import { initIntroScene } from './IntroScene';
import { useGameSocket } from '../hooks/useGameSocket';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GameStateDTO } from '../dto/GameStateDTO';
import { initEndGaming } from './EndScene';

interface GameSceneProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const GameScene = ({ canvasRef }: GameSceneProps) => {
  const boardMod = useRef<BoardModule>(null!);
  const diceMod = useRef<DiceModule>(null!);
  const sceneMgrRef = useRef<SceneManager>(null);
  const gameStateRef = useRef<GameStateDTO | null>(null);
  const [status, setStatus] = useState<string>('');
  const animQueueRef = useRef<Promise<void>>(Promise.resolve());

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
  // Ref pour savoir si c'est le tout premier gameState
  const initialLoadRef = useRef(true);
  // Ref pour mémoriser la dernière valeur de lastDiceRoll
  const lastDiceRef = useRef<number | null>(null);

  // 1) Initialisation du moteur Babylon + scène d'intro
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BabylonEngine(canvasRef.current);
    const sceneMgr = new SceneManager(engine.getEngine());
    sceneMgrRef.current = sceneMgr;

    // Scène d'introduction
    sceneMgr.createScene('intro', (scene) => {
      importSkyBox(scene);
      initIntroScene(scene).then(() => setIntroDone(true));
    });

    sceneMgr.run();
    sceneMgr.switchTo('intro');

    return () => engine.getEngine().dispose();
  }, [canvasRef]);

  // 2) Dès que gameState est non-null, on crée MAIN + mini-jeux & on bascule sur MAIN
  useEffect(() => {
    const sceneMgr = sceneMgrRef.current;
    console.log('GameState: ', gameState);
    console.log('sceneMgr: ', sceneMgr);
    console.log(`createdScenesRef: ${createdScenesRef.current}`);
    if (!sceneMgr || !gameState || createdScenesRef.current) return;
    console.log(`Creating scenes for gameState: ${JSON.stringify(gameState)}`);

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
    // Scène ClickerGame
    sceneMgr.createScene('ClickerGame', (scene) => {
      importSkyBox(scene);
      initClickerGame(scene, 0, sceneMgr, false, onMiniGameEnd);
    });

    // Scène RainingGame
    sceneMgr.createScene('rainingGame', (scene) => {
      importSkyBox(scene);
      initRainingGame(scene, 10, 0, sceneMgr, onMiniGameEnd);
    });
  }, [gameState, canvasRef, nickname, onMiniGameEnd, rollDice]);

  useEffect(() => {
    const sceneMgr = sceneMgrRef.current;
    if (gameState?.winner != null) {
      return;
    }
    if (sceneMgr && introDone && createdScenesRef.current) {
      // 1) On bascule vers la scène principale
      sceneMgr.switchTo('main');
    }
  }, [introDone, gameState?.winner]);

  // 3) On ne lance le mini-jeu qu'après la fin de la file d'animations
  useEffect(() => {
    if (!miniGameInstr || initialLoadRef.current) return;
    (async () => {
      await animQueueRef.current; // attente de la fin de tous les movePlayer
      const { playerNickname: p, miniGameName: mg } = miniGameInstr;
      // Votre logique de switch
      if (p == null || p === nickname) {
        sceneMgrRef.current?.switchTo(mg);
        setStatus(
          p === nickname
            ? `À toi de jouer ! Lance le mini-jeu ${mg}`
            : `Lancement du mini-jeu ${mg}`,
        );
      } else {
        setStatus(`${p} joue au mini-jeu ${mg}, attends ton tour…`);
      }
    })();
  }, [miniGameInstr, nickname]);

  useEffect(() => {
    if (!miniGameOutcome) return;
    console.log(
      `Mini-game outcome received in GameScene: ${JSON.stringify(miniGameOutcome)}`,
    );

    const {
      miniGameName: mg,
      winnerNickname: w,
      winnerScore: s,
    } = miniGameOutcome;

    if (w === nickname) {
      setStatus(
        `Bravo ! Tu as gagné le mini-jeu ${mg} avec un score de ${s} !`,
      );
    } else {
      setStatus(
        `${w} a gagné le mini-jeu ${mg} avec un score de ${s}. À toi de jouer !`,
      );
    }
  }, [miniGameOutcome, nickname]);

  // 2) À chaque update de gameState, on enfile une nouvelle étape d'animation
  useEffect(() => {
    if (!gameState) return;
    // On crée un nouveau Promise chainé

    animQueueRef.current = (async () => {
      //On vérifie si le jeu n'est pas terminé
      if (gameState.winner != null) {
        sceneMgrRef.current?.createScene('endScene', (scene) => {
          importSkyBox(scene);
          // Recherche l'indice du gagnant
          const winnerIdx = gameState.players.findIndex(
            (p) => p.nickname === gameState.winner,
          );
          initEndGaming(
            scene,
            sceneMgrRef.current!,
            winnerIdx,
            gameState.players[winnerIdx]?.nickname || '',
          );
        });
        // Si le jeu est terminé, on bascule vers la scène de fin
        sceneMgrRef.current?.switchTo('endScene');
        return;
      }
      const prevPos = gameStateRef.current?.positions || [];
      const nextPos = gameState.positions;
      console.log(
        `Positions précédentes: ${prevPos.join(', ')}, Positions suivantes: ${nextPos.join(', ')}`,
      );

      // 2) Gestion du dé : on compare seulement si ce n'est PAS le premier chargement
      const newDice = gameState.lastDiceRoll;
      if (
        !initialLoadRef.current && // pas le tout premier état
        newDice != null &&
        newDice !== lastDiceRef.current // vraie différence
      ) {
        await diceMod.current.show();
        await diceMod.current.roll(newDice);
        await diceMod.current.hide();
      }
      // 2.a) Animer chaque pion là où il doit aller
      for (let i = 0; i < nextPos.length; i++) {
        // calculer le nombre de pas à faire en fonction de la position précédente avec lat
        if (!gameState.boardTypes) return;
        let steps = 0;
        if (nextPos[i] < prevPos[i]) {
          // on a fait un tour complet, on doit ajouter le nombre de tuiles
          steps = nextPos[i] + gameState.boardTypes.length - prevPos[i];
        } else {
          steps = nextPos[i] - prevPos[i];
        }

        if (steps > 0) {
          console.log(
            `Déplacement joueur ${i} de ${prevPos[i]} à ${nextPos[i]} (${steps} pas)`,
          );
          setStatus(
            `Joueur ${gameState.players[i].nickname} avance de ${steps} pas`,
          );
          await boardMod.current.movePlayer(i, steps);
          await boardMod.current.moveCameraToPlayer(i);
          console.log(`Joueur ${i} déplacé de ${prevPos[i]} à ${nextPos[i]}`);
        }
      }
      const lastScores = gameStateRef.current?.scores || [];
      const newScores = gameState.scores || [];
      // regarder si un joueur a gagné un point
      if (lastScores.length > 0 && newScores.length > 0) {
        for (let i = 0; i < newScores.length; i++) {
          if (newScores[i] > lastScores[i]) {
            // on a un gagnant
            const player = gameState.players[i];
            setStatus(`${player.nickname} a gagné un point !`);
          }
          if (newScores[i] < lastScores[i]) {
            // on a un perdant
            const player = gameState.players[i];
            setStatus(`${player.nickname} a perdu un point !`);
          }
        }
      }

      // 3) Mémoriser pour la prochaine comparaison
      lastDiceRef.current = newDice;
      initialLoadRef.current = false; // à partir de maintenant, on n’est plus au premier chargement
      gameStateRef.current = gameState; // mise à jour du ref global
    })();
  }, [gameState]);

  return (
    <>
      <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />

      <div className="notification-container">
        {status && (
          <Notification
            message={status}
            duration={8000}
            onClose={() => setStatus('')}
          />
        )}
      </div>
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
