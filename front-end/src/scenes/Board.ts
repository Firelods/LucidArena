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
  Grid,
  StackPanel,
} from '@babylonjs/gui';
import { BoardModule } from '../modules/BoardModule';
import { DiceModule } from '../modules/DiceModule';
import { RefObject } from 'react';
import { GameStateDTO } from '../dto/GameStateDTO';
import { isItMyTurn } from '../hooks/useGameSocket';
import { SceneManager } from '../engine/SceneManager';
import { Inspector } from '@babylonjs/inspector';

export async function initBoard(
  scene: Scene,
  boardMod: RefObject<BoardModule>,
  diceMod: RefObject<DiceModule>,
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
  // Inspector.Show(scene, { embedMode: true });
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

  // 4) GUI unique
  await document.fonts.load('20px "DynaPuff"');
  await document.fonts.ready;
  const gui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);

  // Animation cloud sweep
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
  const canvas = scene.getEngine().getRenderingCanvas()!;
  const cloudWidth = canvas.width * 1.5;
  cloud.left = -cloudWidth;
  slideUI.addControl(cloud);
  const easing = new QuadraticEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  const slideAnim = new Animation(
    'slideCloud',
    'left',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  slideAnim.setEasingFunction(easing);
  slideAnim.setKeys([
    { frame: 0, value: -cloudWidth / 4 },
    { frame: 60, value: canvas.width },
  ]);
  cloud.animations = [slideAnim];
  const anim = scene.beginAnimation(cloud, 0, 60, false, 1);
  await new Promise<void>((res) =>
    anim.onAnimationEndObservable.addOnce(() => res()),
  );
  slideUI.dispose();

  // Popups
  async function showPopups(messages: string[]): Promise<void> {
    return new Promise((resolve) => {
      let idx = 0;
      const panel = new Rectangle();
      panel.width = '50%';
      panel.height = '200px';
      panel.cornerRadius = 20;
      panel.background = '#dfe8ed';
      panel.color = '#34acec';
      panel.thickness = 4;
      panel.shadowColor = '#34acec';
      panel.shadowBlur = 8;
      gui.addControl(panel);

      const txt = new TextBlock();
      txt.textWrapping = true;
      txt.fontFamily = 'DynaPuff';
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

  // --- SCOREBOARD RESPONSIVE ---
  const scorePanel = new Rectangle('scorePanel');
  scorePanel.width = '100%';
  scorePanel.height = '60px';
  scorePanel.cornerRadius = 10;
  scorePanel.thickness = 0;
  scorePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  scorePanel.top = '10px';
  gui.addControl(scorePanel);

  const gridUI = new Grid();
  for (let i = 0; i < playerCount; i++) {
    gridUI.addColumnDefinition(1);
  }
  gridUI.width = '100%';
  gridUI.height = '100%';
  scorePanel.addControl(gridUI);

  const scoreTexts: TextBlock[] = [];
  const baseFont = 24 - (playerCount - 2) * 2;
  const fontSize = Math.max(16, baseFont);
  for (let i = 0; i < playerCount; i++) {
    const cell = new Rectangle(`cell${i}`);
    cell.height = '100%';
    cell.cornerRadius = 8;
    cell.thickness = 2;
    cell.color = '#fff';
    cell.background = ['#f39c12', '#e91e63', '#3498db', '#2ecc71'][i];
    cell.paddingLeft = '8px';
    cell.paddingRight = '8px';
    cell.paddingTop = '5px';
    cell.paddingBottom = '5px';
    gridUI.addControl(cell, 0, i);

    const tb = new TextBlock(`scoreText${i}`, '');
    tb.color = 'white';
    tb.fontSize = fontSize;
    tb.fontFamily = 'DynaPuff';
    tb.textWrapping = true;
    tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    tb.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    cell.addControl(tb);
    scoreTexts.push(tb);
  }

  function updateScoreboard(state: GameStateDTO) {
    state.scores.forEach((pts, idx) => {
      const name = state.players[idx]?.nickname ?? `Joueur ${idx + 1}`;
      scoreTexts[idx].text = `${name}: ${pts} étoile${pts > 1 ? 's' : ''}`;
    });
  }

  // --- LÉGENDE DU JEU ---
  // Conteneur Rectangle pour dimensionner dynamiquement la hauteur
  const legendContainer = new Rectangle('legendBg');
  legendContainer.width = '250px';
  legendContainer.height = '250px';
  legendContainer.paddingRight = '30px';
  legendContainer.thickness = 2;
  legendContainer.cornerRadius = 8;
  legendContainer.background = 'white';
  legendContainer.alpha = 0.8;
  legendContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  legendContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  legendContainer.zIndex = 100;
  // --- Initialisation état & position de la légende hidden ---
  let legendOpen = false;
  const legendWidth = 250; // même valeur que legendContainer.width en px

  // On place la légende hors écran (à droite)
  legendContainer.left = legendWidth;
  legendContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;

  // --- Création du bouton flèche ---
  const toggleBtn = Button.CreateSimpleButton('toggleLegend', '◀');
  toggleBtn.width = '30px';
  toggleBtn.height = '60px';
  toggleBtn.thickness = 0;
  toggleBtn.background = 'white';
  toggleBtn.zIndex = 101; // au-dessus de legendContainer
  toggleBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  toggleBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  toggleBtn.left = '0px'; // flush à l'écran
  gui.addControl(toggleBtn);

  // --- Animation de slide ---
  const slideAnim2 = new Animation(
    'slideLegend',
    'left',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  const legendEase = new QuadraticEase();
  legendEase.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  slideAnim2.setEasingFunction(legendEase);
  // On attache l'animation au container
  legendContainer.animations = [slideAnim2];

  // --- Handler clic pour toggle ---
  toggleBtn.onPointerUpObservable.add(() => {
    const from = legendOpen ? 0 : legendWidth;
    const to = legendOpen ? legendWidth : 0;
    slideAnim2.setKeys([
      { frame: 0, value: from },
      { frame: 10, value: to },
    ]);
    scene.beginAnimation(legendContainer, 0, 10, false);
    // Change la flèche
    toggleBtn.textBlock!.text = legendOpen ? '◀' : '▶';
    legendOpen = !legendOpen;
  });
  gui.addControl(legendContainer);

  const legendPanel = new StackPanel();
  legendPanel.isVertical = true;
  legendPanel.paddingTop = legendPanel.paddingBottom = '8px';
  legendContainer.addControl(legendPanel);

  const legendItems = [
    { color: '#EE99E3', text: 'Mini-jeu solo' },
    { color: '#FA52E1', text: 'Mini-jeu multijoueur' },
    { color: '#EBC042', text: 'Malus, perte d’une étoile' },
    { color: '#81E5EC', text: 'Bonus, gain d’une étoile' },
  ];

  legendItems.forEach(({ color, text }) => {
    const row = new StackPanel();
    row.isVertical = false;
    row.width = '93%';
    row.height = '55px';
    row.paddingBottom = '4px';
    legendPanel.addControl(row);

    const swatch = new Rectangle();
    swatch.width = '100%';
    swatch.height = '100%';
    swatch.background = color;
    swatch.cornerRadius = 4;
    swatch.thickness = 0;
    row.addControl(swatch);

    const lbl = new TextBlock();
    lbl.fontFamily = 'DynaPuff';
    lbl.text = text;
    lbl.color = 'black';
    lbl.fontSize = 14;
    row.addControl(lbl);
  });

  // Bouton Dé
  const rollBtn = Button.CreateImageOnlyButton(
    'rollBtn',
    '/assets/bouton_dice.png',
  );
  rollBtn.width = '80px';
  rollBtn.height = '80px';
  rollBtn.cornerRadius = 15;
  rollBtn.background = 'white';
  rollBtn.thickness = 5;
  rollBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  rollBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  rollBtn.left = '-20px';
  rollBtn.top = '-20px';
  rollBtn.isVisible = false;
  gui.addControl(rollBtn);
  rollBtn.onPointerUpObservable.add(() => rollDice());

  // Texte du tour
  const playerTurnText = new TextBlock('turn', '');
  playerTurnText.color = '#333b40';
  playerTurnText.fontFamily = 'DynaPuff';
  playerTurnText.fontSize = 20;
  playerTurnText.fontWeight = 'bold';
  playerTurnText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  playerTurnText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  playerTurnText.top = '-180px';
  gui.addControl(playerTurnText);

  // Boucle de rendu
  let lastPositions: number[] = [];
  let lastDice: number | null = null;
  let currentPlayerIndex = -1;
  let isMyTurn = false;
  scene.onBeforeRenderObservable.add(async () => {
    const state = getGameState();
    if (!state) return;

    if (state.currentPlayer !== currentPlayerIndex) {
      currentPlayerIndex = state.currentPlayer;
      isMyTurn = isItMyTurn(state, nickname);
    }

    updateScoreboard(state);

    playerTurnText.text = `Tour de ${state.players[state.currentPlayer].nickname}${
      isMyTurn ? ' (à vous)' : ''
    }`;
    playerTurnText.color = isMyTurn ? '#AA5042' : '#333b40';
    rollBtn.isVisible = isMyTurn;

    // // --- 4. Animations de déplacement pas à pas ---
    // if (!lastPositions.length) {
    //   // initialisation de lastPositions la première fois
    //   lastPositions = [...state.positions];
    //   console.log(`Positions initiales: ${lastPositions}`);
    //   await boardMod.current.setPositions(state.positions);
    // } else {
    //   for (let i = 0; i < state.positions.length; i++) {
    //     const oldIdx = lastPositions[i];
    //     const newIdx = state.positions[i];
    //     const steps = newIdx - oldIdx;
    //     if (steps > 0) {
    //       // fait sauter le pion 'steps' fois
    //       console.log(
    //         `Déplacement joueur ${i} de ${oldIdx} à ${newIdx} (${steps} pas)`,
    //       );
    //       lastPositions[i] = newIdx;
    //       await boardMod.current.movePlayer(i, steps);
    //     }
    //   }
    //   lastPositions = [...state.positions];
    // }
    // --- 5. Animation du dé si valeur a changé ---
    // if (state.lastDiceRoll && state.lastDiceRoll !== lastDice) {
    //   console.log(`Lancer de dé: ${state.lastDiceRoll}`);

    //   lastDice = state.lastDiceRoll;
    //   await diceMod.current.show();
    //   await diceMod.current.roll(lastDice);
    //   await diceMod.current.hide();
    // }
  });

  // Popup de bienvenue
  await showPopups([
    'Bienvenue dans LucidArena ! Prêt·e pour l’aventure ?',
    'À tour de rôle, affrontez-vous sur le plateau.',
    'Le premier à 5 étoiles remporte la partie !',
    'Bonne chance !',
  ]);
}
