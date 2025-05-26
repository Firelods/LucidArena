import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
  AbstractMesh,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  TextBlock,
  Rectangle,
  Control,
} from '@babylonjs/gui';

import '@babylonjs/inspector'; // Active l’inspecteur

export async function initClickerGame(scene: Scene, canPlay: boolean): Promise<void> {
  // Caméra et lumière
  const camera = new ArcRotateCamera(
    'camClicker',
    1.57,
    1.534,
    100,
    new Vector3(11, 15, 70),
    scene
  );
  camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);
  camera.lowerRadiusLimit = camera.upperRadiusLimit = 100; // Bloque le zoom

  new HemisphericLight('lightClicker', new Vector3(0, 1, 0), scene).intensity = 0.7;

  const launchGame = async () => {
    scene.debugLayer.show({
      embedMode: true,
      overlay: true,
      globalRoot: document.body,
    });

    const gui = AdvancedDynamicTexture.CreateFullscreenUI('uiClicker', true, scene);
    let score = 0;
    const duration = 80000;

    // Calcul du centrage des lianes
    const lianes: AbstractMesh[] = [];
    const nbLianes = 4;
    const spacing = 50; // Ajuste cette valeur si besoin
    // Largeur totale prise par toutes les lianes espacées
    const totalWidth = (nbLianes - 1) * spacing;
    // Point de départ sur l'axe X pour que le tout soit centré sur 0
    const startX = -totalWidth / 2;

    try {
      for (let i = 0; i < nbLianes; i++) {
        const result = await SceneLoader.ImportMeshAsync('', '/assets/', 'liane.glb', scene);
        const liane = result.meshes[0];
        liane.position = new Vector3(startX + i * spacing, -1.2, 0.3);
        liane.rotation = new Vector3(0, Math.PI / 6, 0);
        liane.scaling = new Vector3(1, 1, 1);
        lianes.push(liane);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du modèle GLB :', error);
    }

    // Score & timer
    const scoreText = new TextBlock();
    scoreText.text = `Score : ${score}`;
    scoreText.fontSize = 48;
    scoreText.top = '-40%';
    gui.addControl(scoreText);

    const timerText = new TextBlock();
    timerText.text = `Temps : ${duration}s`;
    timerText.fontSize = 48;
    timerText.top = '-20%';
    gui.addControl(timerText);

    // Bouton Click
    const clickBtn = Button.CreateSimpleButton('btnClick', 'Click !');
    clickBtn.width = '200px';
    clickBtn.height = '120px';
    clickBtn.cornerRadius = 20;
    clickBtn.top = '20%';
    gui.addControl(clickBtn);

    clickBtn.onPointerUpObservable.add(() => {
      score++;
      scoreText.text = `Score : ${score}`;
      lianes.forEach((liane) => {
        liane.scaling.y += 0.1;
      });
    });

    // Fin du jeu
    const finishGame = () => {
      clickBtn.isEnabled = false;
      const panel = new Rectangle('panel');
      panel.width = '60%';
      panel.height = '300px';
      panel.cornerRadius = 20;
      panel.background = '#dfe8ed';
      panel.color = '#34acec';
      panel.thickness = 4;
      panel.shadowColor = '#34acec';
      panel.shadowBlur = 8;
      gui.addControl(panel);

      const txt = new TextBlock('txt');
      txt.text = `Partie terminée !\nTon score : ${score} cliques réalisés !`;
      txt.textWrapping = true;
      txt.fontFamily = 'Bangers, cursive';
      txt.fontSize = 26;
      txt.color = '#333b40';
      txt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      txt.top = '-25%';
      panel.addControl(txt);

      const returnBtn = Button.CreateSimpleButton('btnReturn', 'Retourner sur le plateau');
      returnBtn.width = '300px';
      returnBtn.height = '60px';
      returnBtn.cornerRadius = 30;
      returnBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      returnBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      returnBtn.paddingBottom = '20px';
      panel.addControl(returnBtn);
      returnBtn.onPointerUpObservable.add(() => {
        gui.dispose();
        // window.sceneManager.switchTo('main');
      });
    };

    // Timer du jeu
    const start = Date.now();
    const end = start + duration * 1000;
    const obs = scene.onBeforeRenderObservable.add(() => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      timerText.text = `Temps : ${remaining}s`;
      if (remaining <= 0) {
        finishGame();
      }
    });
  };

  if (!canPlay) {
    const waitingGui = AdvancedDynamicTexture.CreateFullscreenUI('waitingUI', true, scene);
    const panel = new Rectangle('waitingPanel');
    panel.width = '60%';
    panel.height = '220px';
    panel.cornerRadius = 20;
    panel.background = '#dfe8ed';
    panel.color = '#34acec';
    panel.thickness = 4;
    panel.shadowColor = '#34acec';
    panel.shadowBlur = 8;
    waitingGui.addControl(panel);

    const infoText = new TextBlock('infoText',
      'Le but de ce mini‑jeu est de cliquer sur “Click!” le plus de fois possible en 4 secondes.'
    );
    infoText.fontSize = 24;
    infoText.color = '#333b40';
    infoText.textWrapping = true;
    infoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    infoText.top = '-20%';
    panel.addControl(infoText);

    const startBtn = Button.CreateSimpleButton('btnStart', 'Commencer le mini‑jeu');
    startBtn.width = '300px';
    startBtn.height = '60px';
    startBtn.cornerRadius = 30;
    startBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    startBtn.paddingBottom = '20px';
    panel.addControl(startBtn);

    startBtn.onPointerUpObservable.add(() => {
      waitingGui.dispose();
      launchGame();
    });
  } else {
    launchGame();
  }
}
