import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
  StandardMaterial,
  Color3,
  MeshBuilder,
  DynamicTexture,
  TransformNode,
  AbstractMesh,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  TextBlock,
  Rectangle,
  Control,
} from '@babylonjs/gui';

import '@babylonjs/inspector';
import { SceneManager } from '../engine/SceneManager';
import { MiniGameResult } from '../hooks/useGameSocket';
import { playerFiles, showPopups } from '../utils/utils';

export async function initClickerGame(
  scene: Scene,
  activePlayer: number,
  sceneManager: SceneManager,
  canPlay: boolean,
  onMiniGameEnd: (result: MiniGameResult) => void,
): Promise<void> {
  // --- INITIALISATION BASIQUE SCENE ---
  const camera = new ArcRotateCamera(
    'camClicker',
    1.578,
    1.331,
    64.0535,
    new Vector3(10, 15, 0),
    scene,
  );
  new HemisphericLight('lightClicker', new Vector3(0, 1, 0), scene).intensity =
    0.7;

  // Chargement du joueur
  const { meshes: charMeshes } = await SceneLoader.ImportMeshAsync(
    '',
    '/assets/',
    playerFiles[activePlayer],
    scene,
  );
  const charMesh = charMeshes[0] as AbstractMesh;
  charMesh.position = new Vector3(9.6, 20, 0);

  let score = 0;
  const duration = 20; // durée en secondes
  const objectif = 80;

  // Création du sol damier
  const Z_PLANE = 5;
  const gridLength = Z_PLANE * 6;
  const gridWidth = Z_PLANE * 9;
  const cols = 10;
  const rows = Math.ceil((cols * gridLength) / gridWidth);
  const size = 512;
  const dt = new DynamicTexture('grid', { width: size, height: size }, scene);
  const ctx = dt.getContext();
  const cellW = size / cols;
  const cellH = size / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#000';
      ctx.fillRect(i * cellW, j * cellH, cellW, cellH);
    }
  }
  dt.update();
  const groundMat = new StandardMaterial('gridMat', scene);
  groundMat.diffuseTexture = dt;
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = Color3.White();
  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: gridWidth, height: gridLength },
    scene,
  );
  ground.material = groundMat;
  ground.position.set(10, 0, 0);

  // Pot et liane
  const pot = MeshBuilder.CreateCylinder(
    'pot',
    { diameter: 4, height: 2, tessellation: 24 },
    scene,
  );
  pot.position.set(10, 1, -1);

  const lianeData = await SceneLoader.ImportMeshAsync(
    '',
    '/assets/',
    'liane.glb',
    scene,
  );
  const lianeMeshes = lianeData.meshes.filter((m) => m.getTotalVertices() > 0);
  const minY = Math.min(
    ...lianeMeshes.map((m) => m.getBoundingInfo().boundingBox.minimum.y),
  );
  const maxY = Math.max(
    ...lianeMeshes.map((m) => m.getBoundingInfo().boundingBox.maximum.y),
  );
  lianeMeshes.forEach((m) => (m.position.y -= minY));
  const heightLiane = maxY - minY;

  // Cercle cible à la hauteur de la liane
  const targetCircle = MeshBuilder.CreateTorus(
    'targetCircle',
    {
      diameter: 4.5,
      thickness: 0.1,
      tessellation: 64,
    },
    scene,
  );
  // Orienter à plat
  // targetCircle.rotation.x = Math.PI / 2;
  // Positionner au-dessus du pot à la hauteur cible
  const initialCharY = charMesh.position.y;
  targetCircle.position.set(10, initialCharY - 10 + heightLiane * 0.2, -1);
  const circleMat = new StandardMaterial('circleMat', scene);
  circleMat.emissiveColor = new Color3(1, 0, 0);
  targetCircle.material = circleMat;

  const pivotNode = new TransformNode('pivotNode', scene);
  lianeMeshes.forEach((m) => (m.parent = pivotNode));
  pivotNode.position.set(0, 0, 0);
  pivotNode.setPivotPoint(Vector3.Zero());

  const rotationNode = new TransformNode('rotationNode', scene);
  rotationNode.position.set(7, -2, 0);
  rotationNode.rotation.set(0, Math.PI / 6, 0);
  pivotNode.parent = rotationNode;
  pivotNode.scaling.scaleInPlace(0.2);

  const initialScaling = pivotNode.scaling.clone();

  // Affiche une séquence de popups avant le lancement
  const gui = AdvancedDynamicTexture.CreateFullscreenUI(
    'uiClicker',
    true,
    scene,
  );
  if (!canPlay) {
    await showPopups(gui, [
      'Prêt ? Cliquez sur le bouton pour commencer le mini-jeu!',
    ]);
  }

  // Lancement du jeu
  async function launchGame() {
    score = 0;
    charMesh.position.y = initialCharY;
    pivotNode.scaling.copyFrom(initialScaling);
    rotationNode.rotation.set(0, Math.PI / 6, 0);

    const scoreText = createTextPanel(gui, 'Score: 0 / ' + objectif, true);
    const timerText = createTextPanel(gui, 'Temps : ' + duration + 's', false);

    const clickBtn = Button.CreateSimpleButton('btnClick', 'Cliquez !');
    styleButton(clickBtn);
    gui.addControl(clickBtn);

    let gameEnded = false;
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    clickBtn.onPointerUpObservable.add(() => {
      if (gameEnded) return;
      score++;
      scoreText.text = `Score: ${score} / ${objectif}`;
      charMesh.position.y += 0.12;
      pivotNode.scaling.y += 0.001;
      if (score >= objectif) finish(true);
    });

    scene.onBeforeRenderObservable.add(() => {
      if (gameEnded) return;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      timerText.text = `Temps : ${remaining}s`;
      if (remaining <= 0) finish(score >= objectif);
    });

    function finish(win: boolean) {
      gameEnded = true;
      clickBtn.isEnabled = false;
      showPopups(gui, [
        win
          ? `Bravo ! Tu as gagné !\nScore : ${score} / ${objectif}`
          : `Partie terminée ! Tu as perdu !\nScore : ${score} / ${objectif}`,
      ]).then(() => {
        onMiniGameEnd({ name: 'ClickerGame', score });
        resetClickerGame();
        sceneManager.switchTo('main');
      });
    }
  }

  async function resetClickerGame() {
    // Réinitialise score et positions
    score = 0;
    charMesh.position.y = initialCharY;
    pivotNode.scaling.copyFrom(initialScaling);
    rotationNode.rotation.set(0, Math.PI / 6, 0);
    // Nettoie observables et UI existants
    scene.onBeforeRenderObservable.clear();
    // Affiche popup d'intro
    const guiReset = AdvancedDynamicTexture.CreateFullscreenUI(
      'resetUI',
      true,
      scene,
    );
    await showPopups(guiReset, [
      'Nouvelle partie prête ! Clique pour débuter.',
    ]);
    launchGame();
  }

  // Démarrage
  if (canPlay) {
    launchGame();
  } else {
    showPopups(gui, [
      `Clique sur 'Cliquez !' le plus rapidement possible pour atteindre l'objectif en moins de ${duration}s`,
    ]).then(() => launchGame());
  }
}

/**
 * Crée et retourne un TextBlock dans un panneau GUI.
 */
function createTextPanel(
  gui: AdvancedDynamicTexture,
  text: string,
  isLeft: boolean,
): TextBlock {
  const panel = new Rectangle();
  panel.width = '200px';
  panel.height = '60px';
  panel.cornerRadius = 10;
  panel.background = '#393e46';
  panel.color = '#00adb5';
  panel.thickness = 2;
  panel.shadowColor = '#393e46cc';
  panel.shadowBlur = 8;
  panel.horizontalAlignment = isLeft
    ? Control.HORIZONTAL_ALIGNMENT_LEFT
    : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  panel.left = isLeft ? '10px' : '0px';
  // panel.right = isLeft ? '' : '10px';
  panel.top = '10px';
  gui.addControl(panel);

  const tb = new TextBlock('', text);
  tb.fontSize = 24;
  tb.color = 'white';
  tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  tb.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  panel.addControl(tb);
  return tb;
}

/**
 * Applique un style cohérent à un button GUI.
 */
function styleButton(btn: Button) {
  btn.width = '240px';
  btn.height = '120px';
  btn.cornerRadius = 30;
  btn.background = '#fff';
  btn.color = '#00adb5';
  btn.thickness = 4;
  btn.shadowColor = '#393e46cc';
  btn.shadowBlur = 18;
  btn.fontSize = 25;
  btn.fontFamily = 'DynaPuff';
  btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  btn.textBlock!.color = '#393e46';
}
