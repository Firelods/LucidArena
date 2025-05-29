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

export async function initClickerGame(
  scene: Scene,
  activePlayer: number,
  sceneManager: SceneManager,
  canPlay: boolean,
  onMiniGameEnd: (result: MiniGameResult) => void,
): Promise<void> {
  function cleanupScene() {
    // Dispose all meshes, materials, textures
    scene.meshes.forEach((m) => m.dispose());
    scene.materials.forEach((mat) => mat.dispose());
    scene.textures.forEach((tex) => tex.dispose());
    // Clear render loop callbacks
    scene.onBeforeRenderObservable.clear();
  }
  // ---------------------- INIT SCENE -------------------------
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

  const characterFiles = [
    'character_blue.glb',
    'character_green.glb',
    'character_pink.glb',
    'character.glb',
  ];
  const { meshes: charMeshes } = await SceneLoader.ImportMeshAsync(
    '',
    '/assets/',
    characterFiles[activePlayer],
    scene,
  );
  const charMesh = charMeshes[0] as AbstractMesh;
  charMesh.position = new Vector3(9.6, 20, 0);

  let score = 0;
  const duration = 20;
  const objectif = Math.floor(Math.random() * (100 - 50)) + 50;

  // Sol damier
  const Z_PLANE = 5;
  const gridLength = Z_PLANE * 6;
  const gridWidth = Z_PLANE * 9;
  const cols = 10;
  const rows = Math.ceil((cols * gridLength) / gridWidth);
  const size = 512;
  const dt = new DynamicTexture('grid', { width: size, height: size }, scene);
  const ctx = dt.getContext();
  const cellWidth = size / cols;
  const cellHeight = size / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#000';
      ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
    }
  }
  dt.update();
  const mat = new StandardMaterial('gridMat', scene);
  mat.diffuseTexture = dt;
  mat.specularColor = Color3.Black();
  mat.emissiveColor = Color3.White();
  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: gridWidth, height: gridLength },
    scene,
  );
  ground.material = mat;
  ground.position.x = 10;
  ground.position.y = 0;

  // Pot principal
  const potHeight = 2;
  const potRadius = 1;

  const pot = MeshBuilder.CreateCylinder(
    'pot',
    {
      diameter: potRadius * 4,
      height: potHeight,
      tessellation: 24,
    },
    scene,
  );
  pot.position.x = 10;
  pot.position.y = 1;
  pot.position.z = -1;
  const potMat = new StandardMaterial('potMat', scene);
  potMat.diffuseColor = new Color3(0.35, 0.2, 0.08);
  pot.material = potMat;

  // Rebord du pot
  const potLip = MeshBuilder.CreateTorus(
    'potLip',
    {
      diameter: potRadius * 4,
      thickness: 0.3,
      tessellation: 32,
    },
    scene,
  );
  potLip.position.x = 10;
  potLip.position.y = 2;
  potLip.position.z = -1;
  potLip.material = potMat;

  // Liane
  let rotationNode: TransformNode | null = null;
  let pivotNode: TransformNode | null = null;
  let hauteurLiane = 0;

  try {
    const result = await SceneLoader.ImportMeshAsync(
      '',
      '/assets/',
      'liane.glb',
      scene,
    );
    const lianeMeshes = result.meshes.filter((m) => m.getTotalVertices() > 0);
    const minY = Math.min(
      ...lianeMeshes.map(
        (mesh) => mesh.getBoundingInfo().boundingBox.minimum.y,
      ),
    );
    const maxY = Math.max(
      ...lianeMeshes.map(
        (mesh) => mesh.getBoundingInfo().boundingBox.maximum.y,
      ),
    );
    hauteurLiane = maxY - minY;
    lianeMeshes.forEach((mesh) => {
      mesh.position.y -= minY;
    });
    pivotNode = new TransformNode('pivotNode', scene);
    pivotNode.position = Vector3.Zero();
    pivotNode.setPivotPoint(new Vector3(0, 0, 0));
    lianeMeshes.forEach((mesh) => {
      mesh.parent = pivotNode;
    });
    rotationNode = new TransformNode('rotationNode', scene);
    rotationNode.position = new Vector3(7, -2, 0);
    rotationNode.rotation = new Vector3(0, Math.PI / 6, 0);
    pivotNode.parent = rotationNode;
    pivotNode.scaling = new Vector3(0.2, 0.2, 0.2);
  } catch (error) {
    console.error('Erreur lors du chargement du modèle GLB :', error);
  }

  // Fleche
  try {
    const { meshes: arrowMeshes } = await SceneLoader.ImportMeshAsync(
      '',
      '/assets/',
      'arrow.glb',
      scene,
    );

    const arrowMesh = arrowMeshes[0] as AbstractMesh;
    arrowMesh.position = new Vector3(15, 20.5 + 0.114 * objectif, 0);
    arrowMesh.scaling = new Vector3(10, 10, 10);
  } catch (err) {
    console.error('Erreur lors du chargement de la flèche:', err);
  }

  // ---------------------- MINI-JEU / GUI / LOGIQUE -------------------
  const launchGame = async () => {
    const playerState = { mesh: charMesh, lane: 0, alive: true };

    const gui = AdvancedDynamicTexture.CreateFullscreenUI(
      'uiClicker',
      true,
      scene,
    );

    // Score Box
    const scoreUI = AdvancedDynamicTexture.CreateFullscreenUI(
      'scoreUI',
      true,
      scene,
    );
    const scorePanel = new Rectangle('scorePanel');
    scorePanel.width = '200px';
    scorePanel.height = '60px';
    scorePanel.color = '#00adb5';
    scorePanel.cornerRadius = 10;
    scorePanel.background = '#393e46';
    scorePanel.thickness = 2;
    scorePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    scorePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    scorePanel.left = '10px';
    scorePanel.top = '10px';
    gui.addControl(scorePanel);

    const scoreText = new TextBlock(
      'scoreText',
      `Score: ${score} / ${objectif}`,
    );
    scoreText.fontSize = 24;
    scoreText.color = 'white';
    scoreText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    scoreText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    scorePanel.addControl(scoreText);

    // Timer Box
    const timerText = new TextBlock(
      'timerText',
      `Temps: ${(duration / 1000).toFixed(1)}s`,
    );
    const timerPanel = new Rectangle('timerPanel');
    timerPanel.width = '200px';
    timerPanel.height = '60px';
    timerPanel.cornerRadius = 10;
    timerPanel.background = '#393e46';
    timerPanel.color = '#00adb5';
    timerPanel.thickness = 2;
    timerPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    timerPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    timerPanel.top = '10px';
    timerPanel.left = '-10px';
    gui.addControl(timerPanel);
    timerText.fontSize = 24;
    timerText.color = 'white';
    timerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    timerText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    timerPanel.addControl(timerText);

    // Bouton Click
    const clickBtn = Button.CreateSimpleButton('btnClick', 'Cliquez !');
    clickBtn.width = '240px';
    clickBtn.height = '120px';
    clickBtn.cornerRadius = 30;
    clickBtn.background = '#fff';
    clickBtn.color = '#00adb5';
    clickBtn.thickness = 4;
    clickBtn.shadowColor = '#393e46cc';
    clickBtn.shadowBlur = 18;
    clickBtn.fontSize = 25;
    clickBtn.fontFamily = 'Bangers, cursive';
    clickBtn.top = '40%';
    clickBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    clickBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    clickBtn.paddingTop = '30px';
    clickBtn.paddingBottom = '30px';
    clickBtn.paddingLeft = '10px';
    clickBtn.paddingRight = '10px';
    clickBtn.textBlock!.color = '#393e46';

    gui.addControl(clickBtn);

    let gameEnded = false;

    clickBtn.onPointerUpObservable.add(() => {
      if (gameEnded) return;
      updateScore();
      playerState.mesh.position.y += 0.12;
      if (pivotNode) {
        pivotNode.scaling.y += 0.001;
      }
      // Vérifier la victoire
      if (score >= objectif) finishGame(true);
    });

    function updateScore() {
      if (gameEnded || !pivotNode) return;
      score++;
      scoreText.text = `Score: ${score} / ${objectif}`;
    }

    // Fin du jeu
    const finishGame = (win = false) => {
      gameEnded = true;
      clickBtn.isEnabled = false;

      scoreUI.dispose();

      const panel = new Rectangle('panel');
      panel.width = '30%';
      panel.height = '180px';
      panel.cornerRadius = 20;
      panel.background = '#dfe8ed';
      panel.color = '#34acec';
      panel.thickness = 4;
      panel.shadowColor = '#34acec';
      panel.shadowBlur = 8;
      gui.addControl(panel);

      const txt = new TextBlock('txt');
      txt.text = win
        ? `Bravo ! Tu as gagné !\nScore : ${score} / ${objectif}`
        : `Partie terminée ! Tu as perdu ! \nScore : ${score} / ${objectif}`;
      txt.textWrapping = true;
      txt.fontFamily = 'Bangers, cursive';
      txt.fontSize = 26;
      txt.color = '#333b40';
      txt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      txt.top = '-25%';
      panel.addControl(txt);

      const returnBtn = Button.CreateSimpleButton(
        'btnReturn',
        'Retour au plateau',
      );
      returnBtn.width = '300px';
      returnBtn.height = '60px';
      returnBtn.cornerRadius = 30;
      returnBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      returnBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      returnBtn.paddingBottom = '20px';
      panel.addControl(returnBtn);
      returnBtn.onPointerUpObservable.add(() => {
        onMiniGameEnd({ name: 'ClickerGame', score: score });
        cleanupScene();
        sceneManager.switchTo('main');
      });
    };

    // Timer du jeu
    const start = Date.now();
    const end = start + duration * 1000;
    scene.onBeforeRenderObservable.add(() => {
      if (gameEnded) return;
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      timerText.text = `Temps : ${remaining}s`;
      if (remaining <= 0) {
        finishGame(score >= objectif);
      }
    });
  };

  if (!canPlay) {
    const waitingGui = AdvancedDynamicTexture.CreateFullscreenUI(
      'waitingUI',
      true,
      scene,
    );
    const panel = new Rectangle('waitingPanel');
    panel.width = '60%';
    panel.height = '220px';
    panel.cornerRadius = 20;
    panel.background = '#dfe8ed';
    panel.color = '#34acec';
    panel.thickness = 4;
    panel.shadowColor = '#34acec';
    panel.shadowBlur = 8;
    waitingGui.addControl(panel);

    const infoText = new TextBlock(
      'infoText',
      "Clique sur “Cliquez !” le plus rapidement pour atteindre l'objectif en moins de 20 secondes.",
    );
    infoText.fontSize = 24;
    infoText.color = '#333b40';
    infoText.textWrapping = true;
    infoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    infoText.top = '-20%';
    panel.addControl(infoText);

    const startBtn = Button.CreateSimpleButton(
      'btnStart',
      'Commencer le mini‑jeu',
    );
    startBtn.width = '300px';
    startBtn.height = '60px';
    startBtn.cornerRadius = 30;
    startBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    startBtn.paddingBottom = '20px';
    panel.addControl(startBtn);

    startBtn.onPointerUpObservable.add(() => {
      waitingGui.dispose();
      launchGame();
    });
  } else {
    launchGame();
  }
}
