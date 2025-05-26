import {
  ArcRotateCamera,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Button,
  Control,
} from '@babylonjs/gui';
import { BoardModule } from '../modules/BoardModule';
import { DiceModule } from '../modules/DiceModule';

export async function initBoard(
  scene: Scene,
  boardMod: React.RefObject<BoardModule>,
  diceMod: React.RefObject<DiceModule>,
  playerCount: number,
  currentPlayer: number,
): Promise<void> {
  // Caméra
  const camera = new ArcRotateCamera(
    'camera',
    -1,
    Math.PI / 3,
    20,
    new Vector3(10, 2, 9),
    scene,
  );
  scene.activeCamera = camera;

  // Lumière
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.8;

  // Modules Plateau et Dé
  boardMod.current = new BoardModule(scene);
  diceMod.current = new DiceModule(scene, camera);
  // Inspector.Show(scene, { embedMode: true });

  await boardMod.current.init(playerCount, [
    '/assets/character.glb',
    '/assets/character_pink.glb',
    '/assets/character_blue.glb',
    '/assets/character_green.glb',
  ]);
  await diceMod.current.init();
  await diceMod.current.hide();

  // GUI
  const gui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);

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

  // Affichage des popups d'accueil
  await showPopups([
    'Bienvenue dans LucidArena ! Prêt·e pour l’aventure ?',
    'À tour de rôle, affrontez-vous sur le plateau.',
    'Sur chaque case, découvrez :',
    '• Un bonus d’étoiles \n• Un mini-jeu pour en gagner davantage \n• Une chance de rejouer',
    'Le premier à 10 étoiles remporte la partie !',
    'Bonne chance et amusez-vous bien !',
  ]);

  // 1) Création du bouton BabylonJS
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

  // 4) Ajout du bouton à la GUI
  gui.addControl(rollBtn);

  // 5) Gestion du clic sur le bouton
  rollBtn.onPointerUpObservable.add(async () => {
    const n = Math.floor(Math.random() * 6) + 1;
    await diceMod.current.show();
    await diceMod.current.roll(n);
    await diceMod.current.hide();
    await boardMod.current.movePlayer(currentPlayer, n);
    currentPlayer = (currentPlayer + 1) % playerCount;
  });
}
