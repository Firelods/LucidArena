import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Texture,
  Animation,
  KeyboardEventTypes,
  Mesh,
  EasingFunction,
  QuadraticEase,
  SineEase,
} from '@babylonjs/core';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Rectangle,
  Grid,
  TextBlock,
  Image as GUIImage,
} from '@babylonjs/gui';
import { SceneManager } from '../engine/SceneManager';

export async function initCloudGame(
  scene: Scene,
  sceneMgr: SceneManager,
  activePlayer: number,
): Promise<void> {
  // 0) Caméra fixe
  const camera = new ArcRotateCamera(
    'camCloudGame',
    0,
    Math.PI / 4,
    30,
    Vector3.Zero(),
    scene,
  );

  // Focus clavier
  const canvas = scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';
  canvas.focus();

  // 1) Lumière
  new HemisphericLight(
    'lightCloudGame',
    new Vector3(0, 1, 0),
    scene,
  ).intensity = 0.6;

  // 2) Plateforme
  const trackWidth = 10;
  const trackLength = 50;
  const paddingX = 1;
  const paddingZ = 1;
  const thickness = 0.5;
  const platform = MeshBuilder.CreateBox(
    'platformBox',
    { width: trackWidth, height: thickness, depth: trackLength },
    scene,
  );
  platform.position.y = -thickness / 2;
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
  platform.material = groundMat;

  // 3) Chargement des persos + étoiles
  const playerFiles = [
    'character.glb',
    'character_pink.glb',
    'character_blue.glb',
    'character_green.glb',
  ];
  const starFiles = [
    'etoile_orange.glb',
    'etoile_pink.glb',
    'etoile_blue.glb',
    'etoile_green.glb',
  ];
  const effectiveWidth = trackWidth - 2 * paddingX;
  const startZ = -trackLength / 2 + paddingZ;
  const starHeightY = 1.5;
  const stars: Mesh[] = [];

  await AppendSceneAsync(`/assets/${playerFiles[activePlayer]}`, scene);
  const root = scene.getMeshByName('__root__')!;
  root.name = `player${activePlayer}`;
  root.rotationQuaternion = null;
  root.rotation.y = 0;
  root.position.set(0, 0, startZ);
  root.scaling.setAll(0.7);

  const before = scene.meshes.length;
  await AppendSceneAsync(`/assets/${starFiles[activePlayer]}`, scene);
  const newMeshes = scene.meshes.slice(before);
  const star = newMeshes[0] as Mesh;
  star.name = `star${activePlayer}`;
  star.scaling.setAll(0.7);
  star.position.set(0, starHeightY, startZ);
  stars.push(star);

  const initialStarPositions = stars.map((s) => s.position.clone());

  // 4) Grille de départ + image de sol
  {
    const gridLength = 2;
    const gridWidth = effectiveWidth + 2 * paddingX;
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
    const ground = MeshBuilder.CreateGround(
      'startGrid',
      { width: gridWidth, height: gridLength },
      scene,
    );
    ground.position.y = 0.02;
    ground.position.z = startZ + gridLength / 2 + 0.01;
    ground.material = mat;

    const groundImgMat = new StandardMaterial('groundImgMat', scene);
    groundImgMat.diffuseTexture = new Texture('/assets/image.png', scene);
    platform.material = groundImgMat;
  }

  // 5) Zones de scoring
  let zoneCenterZ = 0;
  const bands: Mesh[] = [];
  const zoneLength = trackLength * 0.2;
  const maxOffset = (trackLength - 2 * paddingZ - zoneLength) / 2;
  const count = 5;
  const depth = zoneLength / count;
  const y = thickness / 2 + 0.01;
  const w = trackWidth - paddingX;
  const colors = [
    new Color3(0.53, 0.81, 0.92),
    new Color3(0, 0.48, 1),
    new Color3(0, 0, 0.55),
  ];
  const mid = Math.floor(count / 2);

  for (let i = 0; i < count; i++) {
    const b = MeshBuilder.CreateBox(
      `band${i}`,
      { width: w, height: 0.02, depth },
      scene,
    );
    b.position.x = 0;
    b.position.y = y;
    const m = new StandardMaterial(`mat${i}`, scene);
    m.diffuseColor = colors[Math.abs(i - mid) > 1 ? 0 : i === mid ? 2 : 1];
    b.material = m;
    bands.push(b);
  }
  type Segment = { start: number; end: number; points: number };
  let segments: Segment[] = [];

  // 6) Scoring et manches
  const totalRounds = 3;
  let currentRound = 0;
  const scores = new Array(stars.length).fill(0);
  const bandPoints = (bandIndex: number): number =>
    bandIndex === mid ? 5 : Math.abs(bandIndex - mid) === 1 ? 3 : 1;

  function randomizeZone() {
    zoneCenterZ = (Math.random() * 2 - 1) * maxOffset;
    bands.forEach((b, i) => {
      b.position.z = zoneCenterZ + (i - mid) * depth;
    });

    // calcul des intervalles pour chaque bande
    segments = bands.map((_, i) => {
      // centre de la bande i
      const centre = zoneCenterZ + (i - mid) * depth;
      // début / fin = centre ± depth/2
      return {
        start: centre - depth / 2,
        end: centre + depth / 2,
        points: bandPoints(i),
      };
    });
  }

  randomizeZone();

  // 7) GUI Popups et Scoreboard
  const scoreGUI = AdvancedDynamicTexture.CreateFullscreenUI(
    'scoreUI',
    true,
    scene,
  );
  const scorePanel = new Rectangle('scorePanel');
  scorePanel.width = '90%';
  scorePanel.height = '60px';
  scorePanel.cornerRadius = 10;
  scorePanel.thickness = 0;
  scorePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  scorePanel.top = '10px';
  scoreGUI.addControl(scorePanel);

  const gridUI = new Grid();
  stars.forEach(() => gridUI.addColumnDefinition(1));
  gridUI.width = '100%';
  gridUI.height = '100%';
  gridUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  gridUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  scorePanel.addControl(gridUI);

  const inputGUI = AdvancedDynamicTexture.CreateFullscreenUI(
    'inputUI',
    true,
    scene,
  );
  const spaceIcon = new GUIImage('spaceIcon', '/assets/space-icon.png');
  spaceIcon.width = '150px';
  spaceIcon.height = '150px';
  spaceIcon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  spaceIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  spaceIcon.left = '20px';
  spaceIcon.top = '-20px';
  spaceIcon.alpha = 0.3;
  inputGUI.addControl(spaceIcon);

  const playerNames = [
    'Orange Player',
    'Pink Player',
    'Blue Player',
    'Green Player',
  ];
  const playerColors = ['#f39c12', '#e91e63', '#3498db', '#2ecc71'];
  const textBlocks: TextBlock[] = [];

  const cell = new Rectangle(`cell${activePlayer}`);
  cell.width = 0.4;
  cell.height = '100%';
  cell.cornerRadius = 8;
  cell.thickness = 2;
  cell.color = '#fff';
  cell.background = playerColors[activePlayer];
  cell.paddingLeft = '8px';
  cell.paddingRight = '8px';
  cell.paddingTop = '5px';
  cell.paddingBottom = '5px';
  gridUI.addControl(cell, 0, activePlayer);

  const tb = new TextBlock(
    `scoreText${activePlayer}`,
    `${playerNames[activePlayer]} : 0 pts`,
  );
  tb.color = 'white';
  tb.fontSize = 22;
  tb.fontFamily = 'Arial Black';
  tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  tb.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  cell.addControl(tb);
  textBlocks.push(tb);

  function updateScoreboard() {
    textBlocks[0].text = `${playerNames[activePlayer]} : ${scores[0]} pts`;
  }

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

  // Popups d'intro
  await showPopups([
    'Bienvenue dans Cloud Game !',
    'Maintenez la touche Espace pour doser la puissance de votre lancer.',
    'Relâchez Espace quand vous pensez que votre étoile atteindra la bande centrale.',
    'Plus vous serez proche du centre, plus vous gagnerez de points !',
    'Bleu foncé : 5 points, Bleu : 3 points, Bleu clair : 1 point',
    'Vous avez 3 manches pour faire le meilleur score.',
  ]);

  canvas.focus();

  // 8) Reset initial
  let pressStart = 0;
  const maxPress = 4;
  const maxDist = 50;
  let current = 0;
  let thrown = false;
  function resetRound() {
    // 1) Remise en place des étoiles
    stars.forEach((s, i) => {
      s.position.copyFrom(initialStarPositions[i]);
      s.animations = [];
    });
    // 2) Nouvelle zone aléatoire
    randomizeZone();
    // 3) Réautorise un lancer
    thrown = false;
    pressStart = 0;
  }

  function resetMatch() {
    scores.fill(0);
    currentRound = 0;
    updateScoreboard();
    resetRound();
  }

  resetRound();

  // 9) Gestion du lancer

  scene.onKeyboardObservable.add((info) => {
    if (info.event.code === 'Space') {
      spaceIcon.alpha = info.type === KeyboardEventTypes.KEYDOWN ? 1.0 : 0.3;
    }
    if (thrown || info.event.code !== 'Space') return;

    if (info.type === KeyboardEventTypes.KEYDOWN && pressStart === 0) {
      pressStart = performance.now();
      spaceIcon.alpha = info.type === KeyboardEventTypes.KEYDOWN ? 1.0 : 0.3;
    } else if (info.type === KeyboardEventTypes.KEYUP) {
      const dur = (performance.now() - pressStart) / 1000;
      const clamped = Math.min(dur, 4);
      const dist = (clamped / 4) * 50;
      pressStart = 0;
      thrown = true;

      // Création des animations
      const frameRate = 60;
      const totalFrame = 120;
      const throwAnim = new Animation(
        'throw',
        'position.z',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      throwAnim.setKeys([
        { frame: 0, value: star.position.z },
        { frame: totalFrame, value: star.position.z + dist },
      ]);
      const sineEase = new SineEase();
      sineEase.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      throwAnim.setEasingFunction(sineEase);

      const jumpAnim = new Animation(
        'jump',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      jumpAnim.setKeys([
        { frame: 0, value: star.position.y },
        { frame: totalFrame / 2, value: star.position.y + 2 },
        { frame: totalFrame, value: star.position.y },
      ]);
      const quadEase = new QuadraticEase();
      quadEase.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      jumpAnim.setEasingFunction(quadEase);

      star.animations = [throwAnim, jumpAnim];
      const animatable = scene.beginAnimation(star, 0, totalFrame, false);

      animatable.onAnimationEnd = () => {
        setTimeout(async () => {
          const z = star.position.z;

          // recherche du segment contenant z
          const seg = segments.find((s) => z >= s.start && z < s.end);
          const points = seg ? seg.points : 0;

          scores[0] += points;
          updateScoreboard();
          await showPopups([
            `🎯 Vous gagnez ${points} point${points > 1 ? 's' : ''} !`,
          ]);

          currentRound++;
          if (currentRound >= totalRounds) {
            await showPopups([
              `🏁 Partie terminée : ${scores[0]} pts sur ${totalRounds} manches !`,
            ]);
            resetMatch();
            sceneMgr.switchTo('main');
          } else {
            await showPopups([
              `🔄 Manche ${currentRound + 1} sur ${totalRounds}`,
            ]);
            resetRound();
          }
        }, 1500);
      };
    }
  });
}
