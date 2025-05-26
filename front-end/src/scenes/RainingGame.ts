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
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  TextBlock,
  Control,
  Rectangle,
  Button,
} from '@babylonjs/gui';
import '@babylonjs/loaders';
import { Inspector } from '@babylonjs/inspector';

// --- Constants & Assets ---
const Z_PLANE = 5;
const GOOD_PROBABILITY = 0.4;
const GOOD = ['cherry.glb', 'etoile.glb'];
const BAD = ['poubelle.glb'];
const OBJECT_SCALE = 0.5;
const CHAR_FILES = [
  'character_blue.glb',
  'character_green.glb',
  'character_pink.glb',
  'character.glb',
];
const ASSETS_ROOT = '/assets/';
const GAME_DURATION_MS = 20000; // 20 secondes
const FALL_SPEED = 0.05;
const SPAWN_HEIGHT = Z_PLANE * 3;
const SPAWN_INTERVAL_MS = 500;
const LANE_WIDTH = 3;
const LANES = [-2, -1, 0, 1, 2];

export async function initRainingGame(
  scene: Scene,
  targetScore: number,
  onFinish: (won: boolean) => void,
): Promise<void> {
  // Setup engine and canvas
  const engine = scene.getEngine();
  const canvas = engine.getRenderingCanvas() as HTMLCanvasElement;
  canvas.tabIndex = 0;
  canvas.addEventListener('click', () => canvas.focus());
  canvas.focus();

  // Camera
  let camera = scene.activeCamera as ArcRotateCamera;
  if (!camera) {
    camera = new ArcRotateCamera(
      'Camera',
      Math.PI / 2,
      1.3,
      Z_PLANE * 3,
      new Vector3(0, 5, 0),
      scene,
    );
    camera.lowerRadiusLimit = Z_PLANE * 3;
    camera.upperRadiusLimit = Z_PLANE * 3;
    camera.attachControl(canvas, true);
  }
  Inspector.Show(scene, { embedMode: true });

  // Light and ground
  new HemisphericLight('hemiLight', new Vector3(10, 2, 3), scene).intensity =
    1.2;
  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: Z_PLANE * 6, height: Z_PLANE * 6 },
    scene,
  );
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.95, 0.95, 0.95);
  ground.material = groundMat;

  // Character
  const { meshes: charMeshes } = await SceneLoader.ImportMeshAsync(
    '',
    ASSETS_ROOT,
    CHAR_FILES[0],
    scene,
  );
  const charMesh = charMeshes[0] as AbstractMesh;
  charMesh.position = new Vector3(0, 1, 0);

  // Score & Timer state
  let score = 0;
  const startTime = Date.now();

  // Permanent popup-style overlay top-left
  const gui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
  const panel = new Rectangle('statusPanel');
  panel.width = '200px';
  panel.height = '70px';
  panel.cornerRadius = 12;
  panel.background = '#393e46cc';
  panel.thickness = 2;
  panel.color = '#00adb5';
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  panel.paddingLeft = '4px';
  panel.paddingTop = '4px';
  panel.paddingRight = '4px';
  panel.paddingBottom = '4px';
  gui.addControl(panel);

  const scoreText = new TextBlock('scoreText', `Score: 0`);
  scoreText.color = 'white';
  scoreText.fontSize = 16;
  scoreText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  panel.addControl(scoreText);

  const timerText = new TextBlock(
    'timerText',
    `Temps: ${(GAME_DURATION_MS / 1000).toFixed(1)}s`,
  );
  timerText.color = 'white';
  timerText.fontSize = 16;
  timerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  timerText.top = '20px';
  panel.addControl(timerText);

  // Player movement
  const player = { mesh: charMesh, lane: 0, alive: true };
  let isMoving = false;
  let moveToX = 0;
  window.onkeydown = (e) => {
    if (!player.alive || isMoving) return;
    const half = ground.getBoundingInfo().boundingBox.extendSize.x;
    if (e.key === 'ArrowLeft' && player.lane > -half) {
      isMoving = true;
      moveToX = player.mesh.position.x + LANE_WIDTH;
      player.lane--;
    }
    if (e.key === 'ArrowRight' && player.lane < half) {
      isMoving = true;
      moveToX = player.mesh.position.x - LANE_WIDTH;
      player.lane++;
    }
  };

  // Frame update
  scene.onBeforeRenderObservable.add(() => {
    if (isMoving) {
      charMesh.position.x = moveToX;
      isMoving = false;
    }
    // Update timer
    const elapsed = Date.now() - startTime;
    const rem = Math.max(0, GAME_DURATION_MS - elapsed) / 1000;
    timerText.text = `Temps: ${rem.toFixed(1)}s`;
  });

  // Object spawning and collision
  const spawnHandle = setInterval(async () => {
    const isGood = Math.random() < GOOD_PROBABILITY;
    const list = isGood ? GOOD : BAD;
    const file = list[Math.floor(Math.random() * list.length)];
    const { meshes } = await SceneLoader.ImportMeshAsync(
      '',
      ASSETS_ROOT,
      file,
      scene,
    );
    const inst = meshes[0] as AbstractMesh;
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    inst.position = new Vector3(lane * LANE_WIDTH, SPAWN_HEIGHT, 0);
    inst.scaling = new Vector3(OBJECT_SCALE, OBJECT_SCALE, OBJECT_SCALE);
    const cb = () => {
      inst.position.y -= FALL_SPEED;
      if (inst.intersectsMesh(charMesh, false)) {
        score += isGood ? 1 : -1;
        scoreText.text = `Score: ${score >= 0 ? score : score}`;
        scene.onBeforeRenderObservable.removeCallback(cb);
        inst.dispose();
      } else if (inst.position.y <= 0) {
        scene.onBeforeRenderObservable.removeCallback(cb);
        inst.dispose();
      }
    };
    scene.onBeforeRenderObservable.add(cb);
  }, SPAWN_INTERVAL_MS);

  // End of game popup
  setTimeout(async () => {
    clearInterval(spawnHandle);
    const won = score >= targetScore;
    const endPanel = new Rectangle('endPanel');
    endPanel.width = '350px';
    endPanel.height = '180px';
    endPanel.cornerRadius = 14;
    endPanel.background = '#393e46';
    endPanel.thickness = 3;
    endPanel.color = '#00adb5';
    endPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    endPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(endPanel);

    const msg = new TextBlock(
      'endText',
      won
        ? `🎉 Bien joué ! Vous avez ${score} points.`
        : `😞 Trop nul ! Seulement ${score} points.`,
    );
    msg.fontSize = 20;
    msg.color = 'white';
    msg.textWrapping = true;
    msg.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    msg.paddingTop = '12px';
    endPanel.addControl(msg);

    const btn = Button.CreateSimpleButton('endBtn', 'Quitter');
    btn.width = '120px';
    btn.height = '50px';
    btn.cornerRadius = 10;
    btn.top = '60px';
    btn.background = '#00adb5';
    btn.color = 'white';
    btn.fontSize = 18;
    btn.onPointerUpObservable.add(() => {
      gui.dispose();
      onFinish(won);
    });
    endPanel.addControl(btn);
  }, GAME_DURATION_MS);
}
