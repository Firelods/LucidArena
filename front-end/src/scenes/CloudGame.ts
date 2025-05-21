import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Texture,
  Animation,
  KeyboardEventTypes,
} from '@babylonjs/core';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';

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

  // 4) Données des persos et des étoiles
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
  const starOffsetZ = 3;
  const starHeightY = 1.5;

  // Tableau pour stocker les meshes d'étoile
  const stars: any[] = [];

  // 5) Chargement et positionnement des persos + étoiles
  for (let i = 0; i < playerFiles.length; i++) {
    // 5a) Chargement du personnage
    await AppendSceneAsync(`/assets/${playerFiles[i]}`, scene);
    const playerRoot = scene.getMeshByName('__root__')!;
    playerRoot.name = `playerRoot${i + 1}`;
    playerRoot.rotationQuaternion = null;
    playerRoot.rotation.y = 0;
    playerRoot.scaling.setAll(0.5);
    playerRoot.position.set(-trackWidth / 2 + paddingX + spanX * i, 0, startZ);

    // 5b) Chargement de l'étoile
    const beforeCount = scene.meshes.length;
    await AppendSceneAsync(`/assets/${starFiles[i]}`, scene);
    const newMeshes = scene.meshes.slice(beforeCount);
    const starMesh = newMeshes[0];
    starMesh.name = `star${i + 1}`;
    starMesh.scaling.setAll(0.5);
    starMesh.position.set(
      -trackWidth / 2 + paddingX + spanX * i,
      starHeightY,
      startZ,
    );
    stars.push(starMesh);
  }

  // 6) Bande de départ quadrillée
  {
    const gridLength = 2;
    const gridWidth = effectiveWidth + 2 * paddingX;
    const gridCols = 10;
    const gridRows = Math.ceil(gridCols * (gridLength / gridWidth));

    const textureSize = 512;
    const dt = new DynamicTexture(
      'startGridTexture',
      { width: textureSize, height: textureSize },
      scene,
    );
    const ctx = dt.getContext();
    const cellW = textureSize / gridCols;
    const cellH = textureSize / gridRows;

    for (let i = 0; i < gridCols; i++) {
      for (let j = 0; j < gridRows; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(i * cellW, j * cellH, cellW, cellH);
      }
    }
    dt.update();

    const gridMat = new StandardMaterial('gridMat', scene);
    gridMat.diffuseTexture = dt;
    gridMat.specularColor = new Color3(0, 0, 0);
    gridMat.emissiveColor = new Color3(1, 1, 1);

    const startGrid = MeshBuilder.CreateGround(
      'startGrid',
      { width: gridWidth, height: gridLength },
      scene,
    );
    startGrid.position.y = 0.02;
    startGrid.position.z = startZ + gridLength / 2 + 0.01;
    startGrid.material = gridMat;

    // (Optionnel) texture image pour la plateforme
    const groundImgMat = new StandardMaterial('groundImgMat', scene);
    groundImgMat.diffuseTexture = new Texture('/assets/image.png', scene);
    platform.material = groundImgMat;
  }

  // 7) Zones de scoring avec 3 teintes de bleu
  {
    const zoneLength = trackLength * 0.2;
    const maxOffset = (trackLength - 2 * paddingZ - zoneLength) / 2;
    const randomOffset = (Math.random() * 2 - 1) * maxOffset;
    const zoneCenterZ = randomOffset;
    const bandCount = 5;
    const bandDepth = zoneLength / bandCount;
    const bandY = thickness / 2 + 0.01;
    const bandWidth = trackWidth - paddingX;

    // Couleurs fixes
    const lightBlue = new Color3(0.53, 0.81, 0.92);
    const midBlue = new Color3(0.0, 0.48, 1.0);
    const darkBlue = new Color3(0.0, 0.0, 0.55);
    const middle = Math.floor(bandCount / 2);

    for (let i = 0; i < bandCount; i++) {
      const band = MeshBuilder.CreateBox(
        `band${i + 1}`,
        { width: bandWidth, height: 0.02, depth: bandDepth },
        scene,
      );
      band.position.set(0, bandY, zoneCenterZ + (i - middle) * bandDepth);

      const mat = new StandardMaterial(`bandMat${i + 1}`, scene);
      if (i === middle) mat.diffuseColor = darkBlue;
      else if (i === middle - 1 || i === middle + 1) mat.diffuseColor = midBlue;
      else mat.diffuseColor = lightBlue;

      band.material = mat;
    }
  }

  // 8) Mécanique : appui long sur Entrée pour lancer l’étoile une seule fois
  let pressStart = 0;
  const maxPressTime = 5; // secondes max
  const maxDistance = 100; // distance max
  let currentIndex = 0; // quelle étoile lancer
  let hasThrown = false; // <- drapeau pour n’autoriser qu’un seul press

  scene.onKeyboardObservable.add((kbInfo) => {
    // si on a déjà lancé, ou ce n'est pas la touche Enter, on sort
    if (hasThrown || kbInfo.event.code !== 'Enter') {
      return;
    }

    if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
      pressStart = performance.now();
    } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
      // on calcule la durée d’appui
      const duration = (performance.now() - pressStart) / 1000;
      const t = Math.min(duration / maxPressTime, 1);
      const distance = t * maxDistance * 2;
      const star = stars[currentIndex];

      // on crée et démarre l’anim directement sur star
      const anim = new Animation(
        'starThrow',
        'position.z',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      anim.setKeys([
        { frame: 0, value: star.position.z },
        { frame: 10, value: star.position.z + distance },
      ]);
      star.animations = [anim];
      scene.beginDirectAnimation(star, [anim], 0, 10, false);

      // on passe le drapeau à true pour bloquer les prochaines press
      hasThrown = true;
    }
  });
}
