import {
  ArcRotateCamera,
  HemisphericLight,
  Scene,
  Vector3,
  Animation,
  EasingFunction,
  QuadraticEase,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Image,
  Control,
  Rectangle,
  TextBlock,
  Button,
} from '@babylonjs/gui';
import { BoardModule } from '../modules/BoardModule';
import { DiceModule } from '../modules/DiceModule';
import { RefObject } from 'react';
import { GameStateDTO } from '../dto/GameStateDTO';
import { isItMyTurn } from '../hooks/useGameSocket';
import { Inspector } from '@babylonjs/inspector';
import { SceneManager } from '../engine/SceneManager';

export async function initBoard(
  scene: Scene,
  boardMod: React.RefObject<BoardModule>,
  diceMod: React.RefObject<DiceModule>,
  getGameState: () => GameStateDTO | null,
  rollDice: () => void,
  nickname: string,
  playerCount: number,
  currentPlayer: number,
  sceneMgr: SceneManager,
): Promise<void> {
  // 1) Caméra
  const camera = new ArcRotateCamera(
    'camera',
    -1,
    Math.PI / 3,
    20,
    new Vector3(10, 2, 9),
    scene,
  );
  scene.activeCamera = camera;
  camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);

  // 2) Lumière
  new HemisphericLight('light', new Vector3(0, 1, 0), scene).intensity = 0.8;

  // —————————————
  // Début de la Board Scene
  // —————————————

  // 3) Modules Plateau et Dé
  boardMod.current = new BoardModule(scene);
  diceMod.current = new DiceModule(scene, camera);
  const initialGameState = getGameState();
  if (!initialGameState) {
    throw new Error('Game state is not available during board initialization');
  }
  await boardMod.current.init(playerCount, initialGameState);
  await diceMod.current.init();
  await diceMod.current.hide();

  // 4) GUI principal
  const gui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
  // —————————————
  // Animation de balayage du nuage
  // —————————————
  const slideUI = AdvancedDynamicTexture.CreateFullscreenUI(
    'slideUI',
    true,
    scene,
  );
  const cloud = new Image('cloudSweep', '/assets/textures/cloud.png');
  cloud.width = '150%';
  cloud.height = '300%';
  cloud.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  cloud.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

  // Position initiale hors-écran
  const canvas = scene.getEngine().getRenderingCanvas()!;
  const cloudWidth = canvas.width * 1.5; // 150% de l’écran
  const cloudCenter = -cloudWidth / 4; // centre du nuage
  cloud.left = -cloudWidth;
  slideUI.addControl(cloud);

  // Préparation de l’easing
  const easing = new QuadraticEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

  // Création de l’animation
  const slideAnim = new Animation(
    'slideCloud',
    'left',
    30, // fps
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  slideAnim.setEasingFunction(easing);
  slideAnim.setKeys([
    { frame: 0, value: cloudCenter },
    { frame: 60, value: canvas.width },
  ]);
  cloud.animations = [slideAnim];

  // Lancer et attendre la fin
  const anim = scene.beginAnimation(cloud, 0, 60, false, 1);
  await new Promise<void>((res) =>
    anim.onAnimationEndObservable.addOnce(() => res()),
  );
  // Cleanup de l’UI de slide
  slideUI.dispose();

  // Fonction d’affichage des popups
  async function showPopups(messages: string[]): Promise<void> {
    return new Promise((resolve) => {
      let idx = 0;
      const panel = new Rectangle('panel');
      panel.width = '50%';
      panel.height = '200px';
      panel.cornerRadius = 20;
      panel.background = '#dfe8ed';
      panel.color = '#34acec';
      panel.thickness = 4;
      panel.shadowColor = '#34acec';
      panel.shadowBlur = 8;
      gui.addControl(panel);

      const txt = new TextBlock('txt', '');
      txt.textWrapping = true;
      txt.fontFamily = 'Bangers, cursive';
      txt.fontSize = 20;
      txt.color = '#333b40';
      panel.addControl(txt);

      const btn = Button.CreateSimpleButton('btn', '➜');
      btn.width = '50px';
      btn.height = '50px';
      btn.cornerRadius = 25;
      btn.top = '55px';
      panel.addControl(btn);

      const next = () => {
        if (idx >= messages.length) {
          panel.dispose();
          resolve();
        } else {
          txt.text = messages[idx++];
        }
      };
      btn.onPointerUpObservable.add(next);
      next();
    });
  }

  // --- UI SCORE ---
  const scorePanel = new Rectangle('scorePanel');
  scorePanel.width = '80%';
  scorePanel.height = '60px';
  scorePanel.cornerRadius = 10;
  scorePanel.thickness = 0;
  scorePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  scorePanel.top = '10px';
  gui.addControl(scorePanel);

  // Placeholders dynamiques
  const scoreBlocks: TextBlock[] = [];
  for (let i = 0; i < 4; i++) {
    const tb = new TextBlock(`score${i}`, '');
    tb.color = ['#ff9500', '#e91e63', '#2196f3', '#4caf50'][i];
    tb.fontSize = 24;
    tb.fontFamily = 'Arial Black';
    tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    tb.width = '25%';
    tb.left = `${i * 25}%`;
    scorePanel.addControl(tb);
    scoreBlocks.push(tb);
  }

  // --- Bouton Lancer le Dé ---
  const rollBtn = Button.CreateImageOnlyButton(
    'rollBtn',
    '/assets/bouton_dice.png',
  );
  rollBtn.width = '80px';
  rollBtn.height = '80px';
  rollBtn.cornerRadius = 15;
  rollBtn.background = 'white';
  rollBtn.thickness = 5;
  rollBtn.color = 'white';
  rollBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  rollBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  rollBtn.left = '-20px';
  rollBtn.top = '-20px';
  rollBtn.isVisible = false; // affiché seulement à ton tour
  gui.addControl(rollBtn);

  rollBtn.onPointerUpObservable.add(() => {
    rollDice();
  });

  // --- Affichage du joueur courant ---
  const playerTurnText = new TextBlock('turn', '');
  playerTurnText.color = '#333b40';
  playerTurnText.fontSize = 20;
  playerTurnText.fontWeight = 'bold';
  playerTurnText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  playerTurnText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  playerTurnText.top = '-110px';
  gui.addControl(playerTurnText);

  // --- Synchro boucle: adapte la scène à l’état serveur ---
  let lastPositions: number[] = [];
  let lastDice: number | null = null;
  let currentPlayerIndex = -1;
  let isMyTurn = false;
  scene.onBeforeRenderObservable.add(async () => {
    // console.log('--- Synchronisation de la scène ---');
    const state = getGameState();
    // console.log('Game state:', state);
    if (!state) return;
    if (state.currentPlayer !== currentPlayerIndex) {
      currentPlayerIndex = state.currentPlayer;
      console.log(
        `Changement de joueur: ${state.players[currentPlayerIndex].nickname}`,
      );
      isMyTurn = isItMyTurn(state, nickname);
    }
    // --- 1. Met à jour les scores UI ---
    state.scores.forEach((s, i) => {
      if (!state.players[i]) return; // sécurité si moins de 4 joueurs
      scoreBlocks[i].text = `${state.players[i].nickname}: ${s}`;
    });

    // --- 2. Affiche joueur courant ---
    playerTurnText.text =
      'Tour de ' +
      (state.players[state.currentPlayer].nickname ?? '-') +
      (isMyTurn ? ' (à vous de jouer !)' : '');

    // --- 3. Montre/cache le bouton dé ---
    rollBtn.isVisible = isMyTurn;

    // --- 4. Animations de déplacement pas à pas ---
    if (!lastPositions.length) {
      // initialisation de lastPositions la première fois
      lastPositions = [...state.positions];
      console.log(`Positions initiales: ${lastPositions}`);
      await boardMod.current.setPositions(state.positions);
    } else {
      for (let i = 0; i < state.positions.length; i++) {
        const oldIdx = lastPositions[i];
        const newIdx = state.positions[i];
        const steps = newIdx - oldIdx;
        if (steps > 0) {
          // fait sauter le pion 'steps' fois
          console.log(
            `Déplacement joueur ${i} de ${oldIdx} à ${newIdx} (${steps} pas)`,
          );
          lastPositions[i] = newIdx;
          await boardMod.current.movePlayer(i, steps);
        }
      }
      lastPositions = [...state.positions];
    }
    // --- 5. Animation du dé si valeur a changé ---
    if (state.lastDiceRoll && state.lastDiceRoll !== lastDice) {
      console.log(`Lancer de dé: ${state.lastDiceRoll}`);

      lastDice = state.lastDiceRoll;
      await diceMod.current.show();
      await diceMod.current.roll(state.lastDiceRoll);
      await diceMod.current.hide();
    }
  });

  await showPopups([
    'Bienvenue dans LucidArena ! Prêt·e pour l’aventure ?',
    'À tour de rôle, affrontez-vous sur le plateau.',
    'Sur chaque case, découvrez :',
    '• Un bonus d’étoiles \n• Un mini-jeu pour en gagner davantage \n• Une chance de rejouer',
    'Le premier à 10 étoiles remporte la partie !',
    'Bonne chance et amusez-vous bien !',
  ]);
}
