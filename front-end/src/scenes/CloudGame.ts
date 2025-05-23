import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Texture,
  Animation,
  KeyboardEventTypes,
  Mesh,
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
} from '@babylonjs/gui';
import { Inspector } from '@babylonjs/inspector';

export async function initCloudGame(scene: Scene): Promise<void> {
  // 1) Caméra fixe
  const camera = new ArcRotateCamera(
    'camCloudGame',
    0,
    Math.PI / 4,
    30,
    Vector3.Zero(),
    scene,
  );
  camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);
  camera.detachControl();

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

  // Score data
  const scores = new Array(stars.length).fill(0);

  // Grid pour le scoreboard
  const gridUI = new Grid();
  stars.forEach(() => gridUI.addColumnDefinition(1));
  gridUI.width = '100%';
  gridUI.height = '40px';
  gridUI.top = '10px';
  gridUI.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  gridUI.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  scoreGUI.addControl(gridUI);

  Inspector.Show(scene, { embedMode: true });

  // Création des TextBlocks du scoreboard
  const textBlocks: TextBlock[] = [];
  stars.forEach((_, i) => {
    const tb = new TextBlock();
    tb.text = `Joueur ${i + 1}: 0/3`;
    tb.color = 'white';
    tb.fontSize = 20;
    tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    tb.width = '100%';
    gridUI.addControl(tb, 0, i);
    textBlocks.push(tb);
  });

  function updateScoreboard() {
    scores.forEach((v, i) => {
      textBlocks[i].text = `Joueur ${i + 1}: ${v}/3`;
    });
  }

  // Helper pour les popups
  async function showPopups(msgs: string[]) {
    return new Promise<void>((res) => {
      const panel = new Rectangle('panel');
      panel.width = '60%';
      panel.height = '220px';
      panel.cornerRadius = 20;
      panel.background = '#dfe8ed';
      panel.color = '#34acec';
      panel.thickness = 4;
      panel.shadowBlur = 8;
      panel.shadowColor = '#34acec';
      popupGUI.addControl(panel);

      const txt = new TextBlock();
      txt.textWrapping = true;
      txt.fontFamily = 'Bangers, cursive';
      txt.fontSize = 26;
      txt.color = '#333b40';
      panel.addControl(txt);

      const btn = Button.CreateSimpleButton('btn', '➜');
      btn.width = '50px';
      btn.height = '50px';
      btn.cornerRadius = 25;
      btn.top = '70px';
      panel.addControl(btn);

      let idx = 0;
      const next = () => {
        if (idx >= msgs.length) {
          panel.dispose();
          res();
        } else {
          txt.text = msgs[idx++];
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
    if (thrown || info.event.code !== 'Space') return;

    if (info.type === KeyboardEventTypes.KEYDOWN && pressStart === 0) {
      pressStart = performance.now();
    } else if (info.type === KeyboardEventTypes.KEYUP) {
      const dur = (performance.now() - pressStart) / 1000;
      const clamped = Math.min(dur, maxPress);
      const dist = (clamped / maxPress) * maxDist;
      const star = stars[current];

      pressStart = 0;
      thrown = true;

      const anim = new Animation(
        'throw',
        'position.z',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      anim.setKeys([
        { frame: 0, value: star.position.z },
        { frame: 10, value: star.position.z + dist },
      ]);
      star.animations = [anim];

      const animatable = scene.beginDirectAnimation(star, [anim], 0, 10, false);
      animatable.onAnimationEnd = () => {
        // calcul du gagnant de la manche
        const dists = stars.map((s) => Math.abs(s.position.z - zoneCenterZ));
        const minD = Math.min(...dists);
        const winner = dists.findIndex((d) => d === minD);

        scores[winner]++;
        updateScoreboard();

        if (scores[winner] >= 3) {
          // fin de partie
          showPopups([`🎉 Joueur ${winner + 1} remporte la partie !`]);
        } else {
          // manche suivante
          showPopups([`Manche gagnée par le joueur ${winner + 1}`]);
          showPopups([`🔄 Manche suivante !`]).then(resetRound);
        }
      };
    }
  });
}
