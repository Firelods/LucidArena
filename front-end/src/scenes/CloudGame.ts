import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Tools,
} from '@babylonjs/core';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

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

  // 2) Lumière
  new HemisphericLight(
    'lightCloudGame',
    new Vector3(0, 1, 0),
    scene,
  ).intensity = 0.6;

  // 3) Plateforme
  const trackWidth = 10;
  const trackLength = 50;
  const paddingX = 1; // marge gauche/droite
  const paddingZ = 1; // marge avant/arrière

  // 3) Sol avec épaisseur
  const thickness = 0.5; // 0.5 unité d’épaisseur
  const platformMesh = MeshBuilder.CreateBox(
    'platformBox',
    {
      width: trackWidth,
      height: thickness,
      depth: trackLength,
    },
    scene,
  );
  // Remplace la position du box pour qu’il repose “à plat”
  platformMesh.position.y = -thickness / 2;

  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
  platformMesh.material = groundMat;

  // 4) Chargement des persos avec padding
  const files = [
    'character.glb',
    'character_pink.glb',
    'character_blue.glb',
    'character_green.glb',
  ];
  const effectiveWidth = trackWidth - 2 * paddingX;
  const effectiveLength = trackLength - 2 * paddingZ;
  const spanX = effectiveWidth / (files.length - 1);
  const startZ = -trackLength / 2 + paddingZ;

  for (let i = 0; i < files.length; i++) {
    await AppendSceneAsync(`/assets/${files[i]}`, scene);
    const playerRoot = scene.getMeshByName('__root__')!;
    playerRoot.name = `playerRoot${i + 1}`;
    playerRoot.rotationQuaternion = null;

    // position X : on décale de -halfWidth + paddingX, puis on espace
    playerRoot.position.x = -trackWidth / 2 + paddingX + spanX * i;
    playerRoot.position.z = startZ;

    playerRoot.position.y = 0;
    playerRoot.scaling = new Vector3(0.5, 0.5, 0.5);

    // oriente face à la piste (+Z)
    playerRoot.rotation.y = 0;
  }

  // TODO : cible mouvante et logique de clic/jauge…
}
