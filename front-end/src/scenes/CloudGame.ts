import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Texture,
} from '@babylonjs/core';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';

export async function initCloudGame(scene: Scene): Promise<void> {
  // 1) Caméra
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

  // 2) Lumière
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

  // 3a) Sol avec épaisseur
  const thickness = 0.5;
  const platformMesh = MeshBuilder.CreateBox(
    'platformBox',
    { width: trackWidth, height: thickness, depth: trackLength },
    scene,
  );
  platformMesh.position.y = -thickness / 2;
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
  platformMesh.material = groundMat;

  // 4) Chargement des persos
  const files = [
    'character.glb',
    'character_pink.glb',
    'character_blue.glb',
    'character_green.glb',
  ];
  const effectiveWidth = trackWidth - 2 * paddingX;
  const spanX = effectiveWidth / (files.length - 1);
  const startZ = -trackLength / 2 + paddingZ;

  for (let i = 0; i < files.length; i++) {
    await AppendSceneAsync(`/assets/${files[i]}`, scene);
    const playerRoot = scene.getMeshByName('__root__')!;
    playerRoot.name = `playerRoot${i + 1}`;
    playerRoot.rotationQuaternion = null;
    playerRoot.rotation.y = 0;
    playerRoot.scaling = new Vector3(0.5, 0.5, 0.5);
    playerRoot.position.x = -trackWidth / 2 + paddingX + spanX * i;
    playerRoot.position.y = 0;
    playerRoot.position.z = startZ;
  }

  // 4b) Ligne de départ quadrillée devant les joueurs
  {
    const gridLength = 2; // profondeur de la bande de départ (en unités)
    const gridWidth = effectiveWidth + paddingX * 2; // largeur de la bande de départ (en unités)
    const gridCols = 10; // cases horizontalement
    // nombre de cases verticalement, proportionnel à la profondeur
    const gridRows = Math.ceil(gridCols * (gridLength / gridWidth));

    const textureSize = 512; // taille (carrée) de la DynamicTexture
    const dt = new DynamicTexture(
      'startGridTexture',
      { width: textureSize, height: textureSize },
      scene,
    );
    const ctx = dt.getContext();

    // **Taille d’une case en pixels** sur chaque axe
    const cellW = textureSize / gridCols;
    const cellH = textureSize / gridRows;

    // **Dessiner l’intégralité** du damier
    for (let i = 0; i < gridCols; i++) {
      for (let j = 0; j < gridRows; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(i * cellW, j * cellH, cellW, cellH);
      }
    }
    dt.update();

    // Matériau et plan comme avant
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

    // 1) Créez un nouveau matériau
    const groundImgMat = new StandardMaterial('groundImgMat', scene);

    // 2) Chargez votre image (placez-la dans /public ou /assets selon votre config)
    groundImgMat.diffuseTexture = new Texture('/assets/image.png', scene);

    // 3) Appliquez sur votre mesh sol
    platformMesh.material = groundImgMat;
  }

  // 5) Zones de scoring (5 bandes aléatoires, 20% de la longueur)
  {
    const zoneLength = trackLength * 0.2;
    // on retire 2*paddingZ pour laisser la bande hors des padding, puis on divise par 2 pour avoir un décalage max
    const maxOffset = (trackLength - 2 * paddingZ - zoneLength) / 2;
    // randomOffset entre -maxOffset et +maxOffset
    const randomOffset = Math.random() * 2 * maxOffset - maxOffset;
    // centre Z de la zone
    const zoneCenterZ = randomOffset;

    const bandCount = 5;
    const bandDepth = zoneLength / bandCount;
    const bandY = thickness / 2 + 0.01;
    // largeur de bande = largeur totale moins 2*paddingX
    const bandWidth = trackWidth - 1 * paddingX;

    for (let i = 0; i < bandCount; i++) {
      // on positionne chaque bande relative au centre aléatoire
      const zPos = zoneCenterZ + (i - Math.floor(bandCount / 2)) * bandDepth;

      const band = MeshBuilder.CreateBox(
        `band${i + 1}`,
        { width: bandWidth, height: 0.02, depth: bandDepth },
        scene,
      );
      band.position.set(0, bandY, zPos);

      const mat = new StandardMaterial(`bandMat${i + 1}`, scene);
      if (i === Math.floor(bandCount / 2))
        mat.diffuseColor = new Color3(1, 0, 0); // bande centrale rouge
      else if (i === 1 || i === bandCount - 2)
        mat.diffuseColor = new Color3(1, 0.5, 0); // bandes adjacentes orange
      else mat.diffuseColor = new Color3(1, 1, 0); // bandes extérieures jaunes

      band.material = mat;
    }
  }

  // TODO : logique de clic/jauge, animations des nuages…
}
