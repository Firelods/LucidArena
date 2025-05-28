import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Mesh,
  Animation,
  SceneLoader,
} from '@babylonjs/core';
import { SceneManager } from '../engine/SceneManager';

const Z_PLANE = 5;
const OBJECT_SCALE = 0.5;
const CHAR_FILES = [
  'character_blue.glb',
  'character_green.glb',
  'character_pink.glb',
  'character.glb',
];

export async function initEndGaming(
  scene: Scene,
  sceneManager: SceneManager,
): Promise<void> {
  const engine = scene.getEngine();
  const canvas = engine.getRenderingCanvas() as HTMLCanvasElement;
  canvas.tabIndex = 0;
  canvas.addEventListener('click', () => canvas.focus());
  canvas.focus();

  // Caméra
  let camera = scene.activeCamera as ArcRotateCamera;
  if (!camera) {
    camera = new ArcRotateCamera(
      'Camera',
      Math.PI / 2,
      1.3,
      Z_PLANE * 3,
      new Vector3(0, 10, 10),
      scene,
    );
    camera.lowerRadiusLimit = Z_PLANE * 3;
    camera.upperRadiusLimit = Z_PLANE * 3;
  }
  scene.activeCamera = camera;

  // Choisir un personnage au hasard
  const randomChar = CHAR_FILES[Math.floor(Math.random() * CHAR_FILES.length)];

  // Charger le modèle 3D
  const character = await SceneLoader.ImportMeshAsync(
    '',
    '/assets/', // Remplace ce chemin par le bon chemin vers tes fichiers GLB
    randomChar,
    scene,
  );

  // Positionner le personnage au centre de la scène
  const model = character.meshes[0] as Mesh;
  model.position = new Vector3(0, 0, 0);
  model.scaling = new Vector3(OBJECT_SCALE, OBJECT_SCALE, OBJECT_SCALE);

  // Créer une animation de la caméra qui tourne autour du personnage
  const cameraAnimation = new Animation(
    'cameraAnimation',
    'alpha',
    30, // Nombre de frames par seconde
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );

  // Définir les clés de l'animation pour faire tourner la caméra autour du personnage
  const keys = [
    { frame: 0, value: Math.PI / 2 }, // Début de l'animation (position initiale de la caméra)
    { frame: 100, value: Math.PI * 2 }, // Fin de l'animation (360°)
  ];

  cameraAnimation.setKeys(keys);

  // Ajouter l'animation à la caméra
  camera.animations.push(cameraAnimation);

  // Lancer l'animation
  scene.beginAnimation(camera, 0, 100, true);
}
