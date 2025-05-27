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
import { SceneManager } from '../engine/SceneManager';

export async function initBoard(
  scene: Scene,
  boardMod: React.RefObject<BoardModule>,
  diceMod: React.RefObject<DiceModule>,
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
  await boardMod.current.init(playerCount, [
    '/assets/character.glb',
    '/assets/character_pink.glb',
    '/assets/character_blue.glb',
    '/assets/character_green.glb',
  ]);
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

  // Pause éventuelle pour synchroniser (facultatif)
  await new Promise((res) => setTimeout(res, 500)); // petit délai si besoin

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

  // 5) Affichage des popups d’accueil
  await showPopups([
    'Bienvenue dans LucidArena ! Prêt·e pour l’aventure ?',
    'À tour de rôle, affrontez-vous sur le plateau.',
    'Sur chaque case, découvrez :',
    '• Un bonus d’étoiles \n• Un mini-jeu pour en gagner davantage \n• Une chance de rejouer',
    'Le premier à 10 étoiles remporte la partie !',
    'Bonne chance et amusez-vous bien !',
  ]);

  // 6) Bouton lancer de dé
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
  gui.addControl(rollBtn);

  // 7) Gestion du clic
  rollBtn.onPointerUpObservable.add(async () => {
    const n = Math.floor(Math.random() * 6) + 1;
    await diceMod.current.show();
    await diceMod.current.roll(n);
    await diceMod.current.hide();
    await boardMod.current.movePlayer(currentPlayer, n);
    currentPlayer = (currentPlayer + 1) % playerCount;
    sceneMgr.switchTo('mini1');
  });
}
