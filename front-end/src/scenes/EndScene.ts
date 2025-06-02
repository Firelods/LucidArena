import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Mesh,
  Animation,
  SceneLoader,
  PBRMaterial,
  Color3,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Control,
  Image,
  Rectangle,
  TextBlock,
} from '@babylonjs/gui';
import { SceneManager } from '../engine/SceneManager';
import { playerColors, playerFiles } from '../utils/utils';

const Z_PLANE = 5;
const OBJECT_SCALE = 1.5;
const Y_OFFSET = 2;
const CAMERA_BETA = 1.208;

export async function initEndGaming(
  scene: Scene,
  sceneManager: SceneManager,
  winner: number | null,
  nickname: string,
): Promise<void> {
  const engine = scene.getEngine();
  const canvas = engine.getRenderingCanvas() as HTMLCanvasElement;
  canvas.tabIndex = 0;
  canvas.addEventListener('click', () => canvas.focus());
  canvas.focus();

  // --- Caméra ---
  let camera = scene.activeCamera as ArcRotateCamera;
  if (!camera) {
    camera = new ArcRotateCamera(
      'AlignedCamera',
      0,
      CAMERA_BETA,
      Z_PLANE * 3,
      new Vector3(0, Y_OFFSET, 0),
      scene,
    );
    camera.lowerRadiusLimit = Z_PLANE * 3;
    camera.upperRadiusLimit = Z_PLANE * 3;
    scene.activeCamera = camera;
  }
  camera.alpha = 0;
  camera.beta = CAMERA_BETA;
  camera.attachControl(canvas, true);

  // Rotation automatique de la caméra
  const cameraAnimation = new Animation(
    'cameraRotation',
    'alpha',
    15,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  cameraAnimation.setKeys([
    { frame: 0, value: camera.alpha },
    { frame: 200, value: camera.alpha + Math.PI * 2 },
  ]);
  camera.animations = [cameraAnimation];
  scene.beginAnimation(camera, 0, 200, true);
  camera.setTarget(new Vector3(0, Y_OFFSET, 0));

  // --- Modèle du joueur ---
  const character = await SceneLoader.ImportMeshAsync(
    '',
    '/assets/',
    playerFiles[winner ?? 0],
    scene,
  );
  const model = character.meshes[0] as Mesh;
  model.scaling.set(OBJECT_SCALE, OBJECT_SCALE, OBJECT_SCALE);

  model.computeWorldMatrix(true);
  const { min, max } = model.getHierarchyBoundingVectors(true);
  const center = Vector3.Center(min, max);
  model.position = center.negate().add(new Vector3(0, Y_OFFSET, 0));

  // --- Couronne ---
  const crownResult = await SceneLoader.ImportMeshAsync(
    '',
    '/assets/',
    'crown.glb',
    scene,
  );
  const crownMesh = crownResult.meshes[0] as Mesh;
  crownMesh.name = 'Crown';
  crownMesh.position = new Vector3(25.1, -3, 6);
  crownMesh.scaling.set(4, 4, 4);
  const crownMat = new PBRMaterial('crownMat', scene);
  crownMat.albedoColor = Color3.FromHexString('#FFD700');
  crownMat.roughness = 0.2;
  crownMat.metallic = 0;
  crownResult.meshes
    .filter((m) => m instanceof Mesh)
    .forEach((mesh: Mesh) => {
      mesh.material = crownMat;
      mesh.checkCollisions = false;
      mesh.receiveShadows = false;
    });

  // --- UI Fullscreen ---
  const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');

  // Nuage de victoire (bas centre)
  const winnerCloud = new Image('winnerCloud', '/assets/winnerCloud.png');
  winnerCloud.width = '250px';
  winnerCloud.height = '150px';
  winnerCloud.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  winnerCloud.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  guiTexture.addControl(winnerCloud);

  // Nuage de sortie cliquable (haut droite)
  const exitCloud = new Image('exitCloud', '/assets/exit.png');
  exitCloud.width = '170px';
  exitCloud.height = '170px';
  exitCloud.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  exitCloud.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  exitCloud.isPointerBlocker = true;
  exitCloud.isHitTestVisible = true;

  // 1) Ombre pour l'effet bouton
  exitCloud.shadowBlur = 20;
  exitCloud.shadowOffsetX = 0;
  exitCloud.shadowOffsetY = 5;
  exitCloud.shadowColor = '#00000066';

  // 2) Animation au survol (hover)
  exitCloud.onPointerEnterObservable.add(() => {
    exitCloud.scaleX = exitCloud.scaleY = 1.1;
  });
  exitCloud.onPointerOutObservable.add(() => {
    exitCloud.scaleX = exitCloud.scaleY = 1;
  });

  // 3) (Optionnel) Pulse continu
  const pulseX = new Animation(
    'pulseX',
    'scaleX',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const pulseY = new Animation(
    'pulseY',
    'scaleY',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  pulseX.setKeys([
    { frame: 0, value: 1 },
    { frame: 20, value: 1.05 },
    { frame: 40, value: 1 },
  ]);
  pulseY.setKeys(pulseX.getKeys());
  exitCloud.animations = [pulseX, pulseY];
  scene.beginAnimation(exitCloud, 0, 40, true);

  // Au clic, retour au menu principal
  exitCloud.onPointerUpObservable.add(() => {
    window.location.href = '/';
  });

  // Affichage du nom du gagnant

  // 1) Création du conteneur (rectangle) pour le texte
  const textBg = new Rectangle('winnerTextBg');
  textBg.width = '400px';
  textBg.height = '100px';
  textBg.cornerRadius = 20;
  textBg.thickness = 2;
  textBg.color = 'white';
  textBg.background = playerColors[winner ?? 0];
  textBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  textBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  textBg.top = '10px';
  textBg.left = '10px';

  // IMPORTANT : on centre le pivot de toutes les transforms
  textBg.transformCenterX = 0.5;
  textBg.transformCenterY = 0.5;

  guiTexture.addControl(textBg);

  // 2) On crée le TextBlock et on le colle DANS le rectangle
  const winnerText = new TextBlock('winnerText', `${nickname} a gagné !`);
  winnerText.outlineWidth = 2;
  winnerText.outlineColor = 'black';
  winnerText.color = 'white';
  winnerText.fontSize = 32;
  winnerText.fontFamily = 'DynaPuff';

  // on centre le texte à l’intérieur du rectangle
  winnerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  winnerText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

  // idem, centre le pivot sur le milieu du TextBlock
  winnerText.transformCenterX = 0.5;
  winnerText.transformCenterY = 0.5;

  // on ajoute le TextBlock DANS le rectangle, pas sur le guiTexture directement
  textBg.addControl(winnerText);

  // 3) (optionnel) animation de pulsation sur le rectangle
  const pulseX2 = new Animation(
    'pulseX',
    'scaleX',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const pulseY2 = new Animation(
    'pulseY',
    'scaleY',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const keys = [
    { frame: 0, value: 1 },
    { frame: 20, value: 1.05 },
    { frame: 40, value: 1 },
  ];
  pulseX2.setKeys(keys);
  pulseY2.setKeys(keys);
  textBg.animations = [pulseX2, pulseY2];
  scene.beginAnimation(textBg, 0, 40, true);

  guiTexture.addControl(exitCloud);
}
