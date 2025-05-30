import React from 'react';
import { SceneManager } from '../engine/SceneManager';

import {
  Scene,
  ArcRotateCamera,
  Vector3,
  Color3,
  HemisphericLight,
  MeshBuilder,
  AbstractMesh,
  StandardMaterial,
  SceneLoader,
  DynamicTexture,
  KeyboardEventTypes,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  TextBlock,
  Control,
  Rectangle,
  Button,
} from '@babylonjs/gui';
import '@babylonjs/loaders';
import { MiniGameResult } from '../hooks/useGameSocket';
import { playerFiles } from '../utils/utils';

// --- Constants & Assets ---
const Z_PLANE = 5;
const GOOD_PROBABILITY = 0.5;
const GOOD = ['cherry.glb', 'etoile.glb'];
const BAD = ['poubelle.glb'];
const ALL_ASSETS = [...GOOD, ...BAD];
const OBJECT_SCALE = 0.5;
const COLLISION_THRESHOLD = OBJECT_SCALE;
const ASSETS_ROOT = '/assets/';
const GAME_DURATION_MS = 20000;
const FALL_SPEED = 0.08;
const SPAWN_HEIGHT = Z_PLANE * 4;
const SPAWN_INTERVAL_MS = 750;
const LANE_WIDTH = 5;
const LANES = [-2, -1, 0, 1, 2];

/**
 * Initialise et lance le jeu pour un seul joueur.
 * @param scene - La scène BabylonJS
 * @param validScore - Score de référence pour la victoire
 * @param activePlayer - Index du joueur actif
 * @returns Promise<number> score final
 */
export function initRainingGame(
  scene: Scene,
  validScore: number,
  activePlayer: number,
  SceneManager: SceneManager,
  onMiniGameEnd: (result: MiniGameResult) => void,
): Promise<void> {
  function cleanupScene() {
    // Dispose all meshes
    scene.meshes.forEach((m) => m.dispose());
    // Dispose all materials
    scene.materials.forEach((mat) => mat.dispose());
    // Dispose all textures
    scene.textures.forEach((tex) => tex.dispose());
    // Clear GUI layers
    scene.onBeforeRenderObservable.clear();
    scene.onKeyboardObservable.clear();
  }
  return new Promise(async (resolve) => {
    const engine = scene.getEngine();
    const canvas = engine.getRenderingCanvas() as HTMLCanvasElement;
    canvas.tabIndex = 0;
    canvas.addEventListener('click', () => canvas.focus());
    canvas.focus();

    // Caméra
    let camera = scene.activeCamera as ArcRotateCamera;
    if (!camera) {
      camera = new ArcRotateCamera(
        'Camera',
        Math.PI / 2,
        1.3,
        Z_PLANE * 3,
        new Vector3(0, 10, 10),
        scene,
      );
      camera.lowerRadiusLimit = Z_PLANE * 3;
      camera.upperRadiusLimit = Z_PLANE * 3;
    }
    scene.activeCamera = camera;

    // Préchargement des assets
    const preloaded: Record<string, AbstractMesh> = {};
    await Promise.all(
      ALL_ASSETS.map(async (file) => {
        const result = await SceneLoader.ImportMeshAsync(
          '',
          ASSETS_ROOT,
          file,
          scene,
        );
        const mesh = result.meshes[0] as AbstractMesh;
        mesh.isVisible = false;
        mesh.setEnabled(false);
        preloaded[file] = mesh;
      }),
    );

    // Inspector.Show(scene, { embedMode: true });

    // Lumière et sol
    new HemisphericLight('hemiLight', new Vector3(10, 2, 3), scene).intensity =
      1.2;
    const gridLength = Z_PLANE * 6;
    const gridWidth = Z_PLANE * 9;
    const cols = 10;
    const rows = Math.ceil((cols * gridLength) / gridWidth);
    const size = 512;
    const dt = new DynamicTexture('grid', { width: size, height: size }, scene);
    const ctx = dt.getContext();
    const w = size / cols;
    const h = size / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#000';
        ctx.fillRect(i * w, j * h, w, h);
      }
    }
    dt.update();
    const mat = new StandardMaterial('gridMat', scene);
    mat.diffuseTexture = dt;
    mat.specularColor = Color3.Black();
    mat.emissiveColor = Color3.White();
    MeshBuilder.CreateGround(
      'ground',
      { width: gridWidth, height: gridLength },
      scene,
    ).material = mat;

    // Variables de jeu
    let score = 0;
    const scoreUI = AdvancedDynamicTexture.CreateFullscreenUI(
      'scoreUI',
      true,
      scene,
    );
    const scorePanel = new Rectangle('scorePanel');
    scorePanel.width = '200px';
    scorePanel.height = '60px';
    scorePanel.cornerRadius = 10;
    scorePanel.background = '#393e46';
    scorePanel.thickness = 2;
    scorePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    scorePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    scorePanel.left = '10px';
    scorePanel.top = '10px';
    scoreUI.addControl(scorePanel);

    const scoreText = new TextBlock(
      'scoreText',
      `Score: ${score} / ${validScore}`,
    );
    scoreText.fontSize = 24;
    scoreText.fontFamily = 'DynaPuff';
    scoreText.color = 'white';
    scoreText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    scoreText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    scorePanel.addControl(scoreText);
    function updateScore() {
      scoreText.text = `Score: ${score} / ${validScore}`;
    }

    // Timer
    const inputUI = AdvancedDynamicTexture.CreateFullscreenUI(
      'inputUI',
      true,
      scene,
    );
    const timerText = new TextBlock(
      'timerText',
      `Temps: ${(GAME_DURATION_MS / 1000).toFixed(1)}s`,
    );
    const timerPanel = new Rectangle('timerPanel');
    timerPanel.width = '200px';
    timerPanel.height = '60px';
    timerPanel.cornerRadius = 20;
    timerPanel.background = '#393e46cc';
    timerPanel.color = '#00adb5';
    timerPanel.thickness = 2;
    timerPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    timerPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    timerPanel.top = '-20px';
    inputUI.addControl(timerPanel);
    timerText.fontSize = 26;
    timerText.fontFamily = 'DynaPuff';
    timerText.color = 'white';
    timerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    timerText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    timerPanel.addControl(timerText);

    // Chargement du personnage
    const { meshes: charMeshes } = await SceneLoader.ImportMeshAsync(
      '',
      ASSETS_ROOT,
      playerFiles[activePlayer],
      scene,
    );
    const charMesh = charMeshes[0] as AbstractMesh;
    charMesh.position = new Vector3(0, 1, 0);

    let startTime = 0;
    const playerState = { mesh: charMesh, lane: 0, alive: true };
    let isMoving = false;
    let moveToX = 0;

    scene.onKeyboardObservable.add((kbInfo) => {
      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        kbInfo.event.preventDefault();
        if (!playerState.alive || isMoving) return;
        switch (kbInfo.event.key) {
          case 'ArrowLeft':
            isMoving = true;
            moveToX = playerState.mesh.position.x + LANE_WIDTH;
            break;
          case 'ArrowRight':
            isMoving = true;
            moveToX = playerState.mesh.position.x - LANE_WIDTH;
            break;
        }
      }
    });

    scene.onBeforeRenderObservable.add(() => {
      if (isMoving) {
        charMesh.position.x = moveToX;
        isMoving = false;
      }
      if (startTime > 0) {
        const elapsed = Date.now() - startTime;
        const rem = Math.max(0, GAME_DURATION_MS - elapsed) / 1000;
        timerText.text = `Temps: ${rem.toFixed(1)}s`;
      }
    });

    // Démarrage et boucle de spawn
    function startGame() {
      startTime = Date.now();
      const spawnHandle = setInterval(() => {
        const isGood = Math.random() < GOOD_PROBABILITY;
        const list = isGood ? GOOD : BAD;
        const file = list[Math.floor(Math.random() * list.length)];
        const lane = LANES[Math.floor(Math.random() * LANES.length)];

        const prototype = preloaded[file];
        const inst = prototype.clone(
          `inst_${file}_${Date.now()}`,
          null,
        ) as AbstractMesh;
        inst.position = new Vector3(lane * LANE_WIDTH, SPAWN_HEIGHT, 0);
        inst.scaling = new Vector3(OBJECT_SCALE, OBJECT_SCALE, OBJECT_SCALE);
        inst.setEnabled(true);

        const cb = () => {
          inst.position.y -= FALL_SPEED;
          const dx = Math.abs(inst.position.x - charMesh.position.x);
          const dy = inst.position.y - charMesh.position.y;
          if (dx < COLLISION_THRESHOLD && dy <= COLLISION_THRESHOLD + 2) {
            score += isGood ? 1 : -1;
            updateScore();
            scene.onBeforeRenderObservable.removeCallback(cb);
            inst.dispose();
          } else if (inst.position.y <= 0) {
            scene.onBeforeRenderObservable.removeCallback(cb);
            inst.dispose();
          }
        };
        scene.onBeforeRenderObservable.add(cb);
      }, SPAWN_INTERVAL_MS);

      // Fin du jeu
      setTimeout(() => {
        clearInterval(spawnHandle);
        const endUI = AdvancedDynamicTexture.CreateFullscreenUI(
          'endUI',
          true,
          scene,
        );
        const endPanel = new Rectangle('endPanel');
        endPanel.width = '300px';
        endPanel.height = '150px';
        endPanel.cornerRadius = 12;
        endPanel.background = '#393e46';
        endPanel.thickness = 2;
        endPanel.color = '#00adb5';
        endPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        endPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        endUI.addControl(endPanel);

        const message = score >= validScore ? 'Victoire !' : 'Défaite !';
        const endText = new TextBlock(
          'endText',
          `${message} Score: ${score} / ${validScore}`,
        );
        endText.fontSize = 20;
        endText.color = 'white';
        endText.fontFamily = 'DynaPuff';
        endText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        endText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        endPanel.addControl(endText);

        const okBtn = Button.CreateSimpleButton('okBtn', 'OK');
        okBtn.width = '100px';
        okBtn.height = '40px';
        okBtn.top = '40px';
        okBtn.cornerRadius = 10;
        okBtn.background = '#00adb5';
        okBtn.color = 'white';
        okBtn.fontFamily = 'DynaPuff';
        okBtn.onPointerUpObservable.add(() => {
          onMiniGameEnd({ name: 'rainingGame', score: score });
          cleanupScene();
          SceneManager.switchTo('main'); // Retour à la scène principale
        });
        endPanel.addControl(okBtn);
      }, GAME_DURATION_MS);
    }

    // Popup de départ
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('gui', true, scene);
    const startPanel = new Rectangle('startPanel');
    startPanel.width = '350px';
    startPanel.height = '200px';
    startPanel.cornerRadius = 12;
    startPanel.background = '#393e46';
    startPanel.thickness = 2;
    startPanel.color = '#00adb5';
    startPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    startPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(startPanel);

    const startText = new TextBlock(
      'startText',
      'Utilisez les flèches ← et → pour déplacer votre personnage ; attrapez les bonnes icônes et évitez les poubelles. Cliquez sur "Jouer" pour commencer !',
    );
    startText.fontSize = 16;
    startText.fontFamily = 'DynaPuff';
    startText.color = 'white';
    startText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    startText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    startText.textWrapping = true;
    startText.paddingBottom = '10px';
    startPanel.addControl(startText);

    const playBtn = Button.CreateSimpleButton('playBtn', 'Jouer');
    playBtn.width = '100px';
    playBtn.height = '40px';
    playBtn.top = '70px';
    playBtn.cornerRadius = 10;
    playBtn.fontFamily = 'DynaPuff';
    playBtn.background = '#00adb5';
    playBtn.color = 'white';
    playBtn.onPointerUpObservable.add(() => {
      gui.dispose();
      startGame();
    });
    startPanel.addControl(playBtn);
  });
}
