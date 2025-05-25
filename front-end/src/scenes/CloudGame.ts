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
import { Inspector } from '@babylonjs/inspector';
import { SceneManager } from '../engine/SceneManager';

export async function initCloudGame(
  scene: Scene,
  sceneMgr: SceneManager,
): Promise<void> {
  // 0) Récupération de la scène
  // 1) Caméra fixe
  const camera = new ArcRotateCamera(
    'camCloudGame',
    0,
    Math.PI / 4,
    30,
    Vector3.Zero(),
    scene,
  );
  scene.activeCamera = camera;
  camera.inputs.clear();

  // Prépare le canvas pour recevoir le focus clavier
  const canvas = scene.getEngine().getRenderingCanvas() as HTMLCanvasElement;
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';
  canvas.focus();

  // 2) Lumière principale
  new HemisphericLight(
    'lightCloudGame',
    new Vector3(0, 1, 0),
    scene,
  ).intensity = 0.6;

  // 3) Plateforme
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

  // 4) Chargement des personnages et des étoiles
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
  const spanX = effectiveWidth / (playerFiles.length - 1);
  const startZ = -trackLength / 2 + paddingZ;
  const starHeightY = 1.5;

  const stars: Mesh[] = [];
  for (let i = 0; i < playerFiles.length; i++) {
    // personnage
    await AppendSceneAsync(`/assets/${playerFiles[i]}`, scene);
    const root = scene.getMeshByName('__root__')!;
    root.name = `player${i}`;
    root.rotationQuaternion = null;
    root.rotation.y = 0;
    root.scaling.setAll(0.5);
    root.position.set(-trackWidth / 2 + paddingX + spanX * i, 0, startZ);

    // étoile
    const before = scene.meshes.length;
    await AppendSceneAsync(`/assets/${starFiles[i]}`, scene);
    const newMeshes = scene.meshes.slice(before);
    const star = newMeshes[0] as Mesh;
    star.name = `star${i}`;
    star.scaling.setAll(0.5);
    star.position.set(
      -trackWidth / 2 + paddingX + spanX * i,
      starHeightY,
      startZ,
    );
    stars.push(star);
  }

  // Sauvegarde des positions initiales des étoiles
  const initialStarPositions = stars.map((s) => s.position.clone());

  // 5) Bande de départ quadrillée + image de sol
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

  // 6) Zones de scoring (avec randomisation)
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

  // Création des bandes
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

  // Fonction de randomisation de la zone
  function randomizeZone() {
    zoneCenterZ = (Math.random() * 2 - 1) * maxOffset;
    bands.forEach((b, i) => {
      b.position.z = zoneCenterZ + (i - mid) * depth;
    });
  }
  randomizeZone();

  // 7) GUI Popups et Scoreboard
  const popupGUI = AdvancedDynamicTexture.CreateFullscreenUI(
    'popupUI',
    true,
    scene,
  );
  const scoreGUI = AdvancedDynamicTexture.CreateFullscreenUI(
    'scoreUI',
    true,
    scene,
  );

  // 1) Créez un panel global semi-transparent
  const scorePanel = new Rectangle('scorePanel');
  scorePanel.width = '90%';
  scorePanel.height = '60px';
  scorePanel.cornerRadius = 10;
  scorePanel.thickness = 0;
  scorePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  scorePanel.top = '10px';
  scoreGUI.addControl(scorePanel);

  // 2) Configurez la grid à l’intérieur du panel
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

  // 3) Pour chaque colonne, on crée une cellule colorée
  const playerNames = [
    'Orange Player',
    'Pink Player',
    'Blue Player',
    'Green Player',
  ];
  const playerColors = ['#f39c12', '#e91e63', '#3498db', '#2ecc71'];

  const scores = new Array(stars.length).fill(0);

  // 2) Pour chaque colonne, créez la cellule ET le TextBlock avec le nom/color dès le début
  const textBlocks: TextBlock[] = [];
  stars.forEach((_, i) => {
    // cellule arrondie colorée
    const cell = new Rectangle(`cell${i}`);
    cell.width = 1;
    cell.height = '100%';
    cell.cornerRadius = 8;
    cell.thickness = 2;
    cell.color = '#fff'; // bordure blanche
    cell.background = playerColors[i]; // couleur de fond par joueur
    cell.paddingLeft = '8px';
    cell.paddingRight = '8px';
    cell.paddingTop = '5px';
    cell.paddingBottom = '5px';
    gridUI.addControl(cell, 0, i);

    // TextBlock avec nom + score initial
    const tb = new TextBlock(`scoreText${i}`, `${playerNames[i]} : 0/3`);
    tb.color = 'white';
    tb.fontSize = 22;
    tb.fontFamily = 'Arial Black';
    tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    tb.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    cell.addControl(tb);

    textBlocks.push(tb);
  });

  // 3) Simplifiez la mise à jour
  function updateScoreboard() {
    scores.forEach((v, i) => {
      textBlocks[i].text = `${playerNames[i]} : ${v}/3`;
    });
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

  // 8) Reset entre manches
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

  // Popups d'intro
  await showPopups([
    'Bienvenue dans Cloud Game !',
    'Maintenez la touche Espace pour doser la puissance de votre lancer.',
    'Relâchez Espace quand vous pensez que votre étoile atteindra la bande centrale.',
    'Le joueur le plus proche du centre gagne la manche !',
    'Le premier à 3 points gagne la partie !',
  ]);
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
      const clamped = Math.min(dur, maxPress);
      const star = stars[current];

      pressStart = 0;
      thrown = true;

      // 1) Paramètres
      const frameRate = 60; // 60 fps
      const totalFrame = 120; // 120 images → 2 s
      const dist = (clamped / maxPress) * maxDist;
      const jumpHeight = 2; // hauteur du saut
      const startY = star.position.y;

      // 1) Animation translation Z “lancer”
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

      // 2) Animation saut Y
      const jumpAnim = new Animation(
        'jump',
        'position.y',
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      jumpAnim.setKeys([
        { frame: 0, value: startY },
        { frame: totalFrame / 2, value: startY + jumpHeight },
        { frame: totalFrame, value: startY },
      ]);
      const quadEase = new QuadraticEase();
      quadEase.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      jumpAnim.setEasingFunction(quadEase);

      // 4) On combine toutes les animations
      star.animations = [throwAnim, jumpAnim];
      const animatable = scene.beginAnimation(star, 0, totalFrame, false);

      animatable.onAnimationEnd = () => {
        setTimeout(() => {
          // calcul du gagnant de la manche
          const dists = stars.map((s) => Math.abs(s.position.z - zoneCenterZ));
          const minD = Math.min(...dists);
          const winner = dists.findIndex((d) => d === minD);

          scores[winner]++;
          updateScoreboard();

          if (scores[winner] >= 3) {
            // fin de partie : on affiche d'abord la victoire...
            showPopups([`🎉 Joueur ${winner + 1} remporte la partie !`])
              // ...puis le gain d'une étoile...
              .then(() => showPopups(['⭐️ Il remporte alors une étoile !']))
              // ...puis on retourne à la scène principale
              .then(() => {
                sceneMgr.switchTo('main');
              });
          } else {
            // manche suivante
            showPopups([`Manche gagnée par le joueur ${winner + 1}`])
              .then(() => showPopups([`🔄 Manche suivante !`]))
              .then(resetRound);
          }
        }, 1500);
      };
    }
  });
}
