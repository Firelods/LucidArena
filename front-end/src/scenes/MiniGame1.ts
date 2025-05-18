import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
} from '@babylonjs/core';
import { DiceModule } from '../modules/DiceModule';

export async function initMiniGame1(scene: Scene): Promise<void> {
  // camera dédiée au mini-jeu
  const camera = new ArcRotateCamera(
    'camMini1',
    -Math.PI / 4,
    Math.PI / 4,
    8,
    Vector3.Zero(),
    scene,
  );
  camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);

  // lumière
  new HemisphericLight('lightMini1', new Vector3(0, 1, 0), scene).intensity =
    0.5;

  // logique de votre mini-jeu (ex. dé spécial, obstacles…)
  const dice = new DiceModule(scene, camera);
  await dice.init();
  // …
}
