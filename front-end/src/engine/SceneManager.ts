// src/engine/SceneManager.ts
import { Engine, Scene } from '@babylonjs/core';

export class SceneManager {
  private engine: Engine;
  private scenes: Record<string, Scene> = {};
  private activeName?: string;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  /**
   * Crée une scène et l'initialise.
   * On ne l'active pas tout de suite pour qu'elle reste en mémoire.
   */
  createScene(name: string, init: (scene: Scene) => void): Scene {
    const scene = new Scene(this.engine);
    init(scene);
    this.scenes[name] = scene;
    return scene;
  }

  /**
   * Bascule vers la scène `name` :
   * - détache le contrôle du canvas de l'ancienne caméra
   * - attache le contrôle à la caméra de la nouvelle scène
   * - la boucle de rendu ne dessine que cette scène
   */
  switchTo(name: string) {
    // Détache l'ancienne caméra
    if (this.activeName) {
      const prev = this.scenes[this.activeName];
      if (prev.activeCamera) {
        // prev.activeCamera.detachControl(canvas);
      }
    }

    // Définit la nouvelle scène active
    this.activeName = name;
  }

  /**
   * Démarre la boucle de rendu : on ne rend que la scène active
   */
  run() {
    this.engine.runRenderLoop(() => {
      if (this.activeName) {
        this.scenes[this.activeName].render(); // on ne render que scenes[activeName] :contentReference[oaicite:1]{index=1}
      }
    });
    window.addEventListener('resize', () => this.engine.resize());
  }
}
