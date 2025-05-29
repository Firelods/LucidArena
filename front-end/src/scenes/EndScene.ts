import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  Animation,
  SceneLoader,
  PBRMaterial,
  Color3,
  StandardMaterial,
  Texture,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  TextBlock,
  Control,
  Image,
} from '@babylonjs/gui';
import { Inspector } from '@babylonjs/inspector';
import { SceneManager } from '../engine/SceneManager';
import { playerFiles } from '../utils/utils';

const Z_PLANE = 5;
const OBJECT_SCALE = 1.5;
// Décalage vertical pour monter légèrement le personnage
const Y_OFFSET = 2;
// Angle de plongée souhaité
const CAMERA_BETA = 1.208;

export async function initEndGaming(
  scene: Scene,
  sceneManager: SceneManager,
  winner: number | null,
): Promise<void> {
  const engine = scene.getEngine();
  const canvas = engine.getRenderingCanvas() as HTMLCanvasElement;
  canvas.tabIndex = 0;
  canvas.addEventListener('click', () => canvas.focus());
  canvas.focus();

  // Configuration de la caméra ArcRotate centrée sur le modèle élevé avec angle de plongée
  let camera = scene.activeCamera as ArcRotateCamera;
  if (!camera) {
    camera = new ArcRotateCamera(
      'AlignedCamera',
      0, // alpha initial
      CAMERA_BETA, // beta à 1.208 rad pour un léger plongé
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

  // Animation de rotation douce autour du personnage (cycle en 10s)
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

  // Focus final sur le nouveau centre haut
  camera.setTarget(new Vector3(0, Y_OFFSET, 0));

  // Charger le modèle 3D
  const character = await SceneLoader.ImportMeshAsync(
    '',
    '/assets/',
    playerFiles[winner ?? 0],
    scene,
  );
  Inspector.Show(scene, {});

  const model = character.meshes[0] as Mesh;
  model.scaling.set(OBJECT_SCALE, OBJECT_SCALE, OBJECT_SCALE);

  // Calcul du centre du maillage pour un placement précis
  model.computeWorldMatrix(true);
  const { min, max } = model.getHierarchyBoundingVectors(true);
  const center = Vector3.Center(min, max);
  // Positionner et monter le modèle pour que son centre soit à (0, Y_OFFSET, 0)
  model.position = center.negate().add(new Vector3(0, Y_OFFSET, 0));

  // Charger la couronne depuis le dossier assets
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

  // Création du matériau PBR jaune doré
  const crownMat = new PBRMaterial('crownMat', scene);
  crownMat.albedoColor = Color3.FromHexString('#FFD700');
  crownMat.roughness = 0.2;
  crownMat.metallic = 0; // Pour un effet métallique

  // Appliquer le matériau à tous les meshes de la couronne
  crownResult.meshes
    .filter((m) => m instanceof Mesh)
    .forEach((mesh: Mesh) => {
      mesh.material = crownMat;
      mesh.checkCollisions = false;
      mesh.receiveShadows = false;
    });

  // Overlay GUI pour afficher l'image en bas au centre
  const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');
  const cloudImage = new Image('winnerCloud', '/assets/winnerCloud.png');
  cloudImage.width = '250px';
  cloudImage.height = '150px';
  cloudImage.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  cloudImage.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  guiTexture.addControl(cloudImage);
}
