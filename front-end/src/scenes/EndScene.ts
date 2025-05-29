import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Mesh,
  Animation,
  SceneLoader,
} from '@babylonjs/core';
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
    '', // aucun mesh inclus
    '/assets/',
    'crown.glb', // nom du fichier de la couronne
    scene,
  );
  const crownMesh = crownResult.meshes[0] as Mesh;
  crownMesh.name = 'Crown';

  // Recalculer la bounding box du personnage pour obtenir la hauteur de la tête
  model.computeWorldMatrix(true);
  const { min: minB, max: maxB } = model.getHierarchyBoundingVectors(true);
  const headWorldY = maxB.y;
  const offsetAuDessus = 0.2;

  // Positionner et parenter la couronne au personnage
  crownMesh.position = new Vector3(25.1, -3, 6);
  crownMesh.scaling.set(4, 4, 4);

  crownMesh.checkCollisions = false;
  crownMesh.receiveShadows = false;
}
