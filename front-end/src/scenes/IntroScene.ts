import {
  Scene,
  Animation,
  EasingFunction,
  QuadraticEase,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  AppendSceneAsync,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Image, Control } from '@babylonjs/gui';
import { SceneManager } from '../engine/SceneManager';
import '@babylonjs/loaders/glTF';

export async function initIntroScene(
  scene: Scene,
  sceneMgr: SceneManager,
): Promise<void> {
  // 1) Caméra
  const camera = new ArcRotateCamera(
    'introCam',
    1.2,
    0.6,
    15,
    new Vector3(1, 2, 2),
    scene,
  );
  scene.activeCamera = camera;
  // camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);
  // camera.detachControl();

  // 2) Lumière
  new HemisphericLight('light', new Vector3(0, 1, 0), scene).intensity = 0.8;

  // 3) Charger le modèle
  await AppendSceneAsync(`/assets/bed.glb`, scene);

  // 4) UI + nuage
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('introUI', true, scene);
  const cloud = new Image('cloudSweep', '/assets/textures/cloud.png');
  cloud.width = '150%';
  cloud.height = '300%';
  cloud.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  cloud.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

  const canvas = scene.getEngine().getRenderingCanvas()!;
  const cloudWidth = canvas.width * 1.5; // 150% de l’écran
  const cloudCenter = -cloudWidth / 4; // centre du nuage
  cloud.left = -cloudWidth; // commence très à gauche
  ui.addControl(cloud);

  // 5) Pause
  await new Promise((res) => setTimeout(res, 2000));

  // 6) Easing
  const easing = new QuadraticEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

  // 7) Animation
  const slideAnim = new Animation(
    'slideCloud',
    'left',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  slideAnim.setEasingFunction(easing);
  slideAnim.setKeys([
    { frame: 0, value: -cloudWidth },
    { frame: 60, value: cloudCenter },
  ]);
  cloud.animations = [slideAnim];

  // 8) Lancer et, à la fin, switcher puis disposer l’UI
  const anim = scene.beginAnimation(cloud, 0, 60, false, 1);
  anim.onAnimationEndObservable.addOnce(() => {
    // 2) on attend le prochain cycle de rendu avant de retirer l’UI
    setTimeout(() => ui.dispose(), 0);
  });
}
