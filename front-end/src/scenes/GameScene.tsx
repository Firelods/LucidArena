import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { BabylonEngine } from '../engine/BabylonEngine';
import { BoardModule } from '../modules/BoardModule';
import { DiceModule } from '../modules/DiceModule';
import { ArcRotateCamera, Vector3, HemisphericLight } from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Rectangle,
  TextBlock,
  Image as GUIImage,
} from '@babylonjs/gui';

import { SceneManager } from '../engine/SceneManager';
import { initMiniGame1 } from './MiniGame1';
import { initCloudGame } from './CloudGame';

export type GameSceneHandle = {
  /** Lance le dé et déplace le joueur courant */
  rollAndMove: (steps: number) => Promise<void>;
};

const GameScene = forwardRef<GameSceneHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardMod = useRef<BoardModule>(null!);
  const diceMod = useRef<DiceModule>(null!);
  const sceneMgrRef = useRef<SceneManager>(null);

  const playerCount = 4;
  let currentPlayer = 0;

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new BabylonEngine(canvasRef.current);
    const sceneMgr = new SceneManager(engine.getEngine());
    sceneMgrRef.current = sceneMgr;

    // Scène principale
    sceneMgr.createScene('main', async (scene) => {
      // Caméra
      const camera = new ArcRotateCamera(
        'camera',
        -1,
        Math.PI / 3,
        20,
        new Vector3(10, 2, 9),
        scene
      );
      camera.attachControl(canvasRef.current, true);

      // Lumière
      const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
      light.intensity = 0.8;

      // Modules Plateau et Dé
      boardMod.current = new BoardModule(scene);
      diceMod.current = new DiceModule(scene, camera);

      await boardMod.current.init(playerCount, [
        '/assets/character.glb',
        '/assets/character_pink.glb',
        '/assets/character_blue.glb',
        '/assets/character_green.glb',
      ]);
      await diceMod.current.init();
      await diceMod.current.hide();

      // GUI
      const gui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);

      async function showPopups(messages: string[]): Promise<void> {
        return new Promise((resolve) => {
          let idx = 0;
          const panel = new Rectangle('panel');
          panel.width = '50%';
          panel.height = '200px';
          panel.cornerRadius = 20;
          panel.background = '#dfe8ed';
          panel.color = '#34acec';
          panel.thickness = 4;
          panel.shadowColor = '#34acec';
          panel.shadowBlur = 8;
          gui.addControl(panel);

          const txt = new TextBlock('txt', '');
          txt.textWrapping = true;
          txt.fontFamily = 'Bangers, cursive';
          txt.fontSize = 20;
          txt.color = '#333b40';
          txt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          panel.addControl(txt);

          const btn = Button.CreateSimpleButton('btn', '➜');
          btn.width = '50px';
          btn.height = '50px';
          btn.cornerRadius = 25;
          btn.top = '70px';
          panel.addControl(btn);

          const next = () => {
            if (idx >= messages.length) {
              panel.dispose();
              resolve();
            } else {
              txt.text = messages[idx++];
            }
          };
          btn.onPointerUpObservable.add(next);
          next();
        });
      }

      // Affichage des popups d'accueil
      await showPopups([
        'Bienvenue dans LucidArena ! Prêt·e pour l’aventure ?',
        'À tour de rôle, affrontez-vous sur le plateau.',
        'Sur chaque case, découvrez :',
        '• Un bonus d’étoiles \n• Un mini-jeu pour en gagner davantage \n• Une chance de rejouer',
        'Le premier à 10 étoiles remporte la partie !',
        'Bonne chance et amusez-vous bien !',
      ]);

      // 1) Création du bouton BabylonJS
      const rollBtn = Button.CreateSimpleButton('rollBtn', '');
      rollBtn.width = '60px';
      rollBtn.height = '60px';
      rollBtn.cornerRadius = 15;
      rollBtn.background = 'white';
      rollBtn.thickness = 2;
      rollBtn.color = '#444';
      rollBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      rollBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      rollBtn.left = '-20px';
      rollBtn.top = '-20px';

      // 2) Rectangle masque pour arrondir l'image
      const imgMask = new Rectangle('imgMask');
      imgMask.width = rollBtn.width;
      imgMask.height = rollBtn.height;
      imgMask.cornerRadius = rollBtn.cornerRadius;
      imgMask.thickness = 0;
      imgMask.background = 'transparent';
      imgMask.clipChildren = true;
      rollBtn.addControl(imgMask);

      // 3) Ajout de l'image dans le masque
      const diceImg = new GUIImage('diceImg', '/assets/bouton_dice.png');
      diceImg.width = '80%';
      diceImg.height = '80%';
      diceImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      diceImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      imgMask.addControl(diceImg);

      // 4) Ajout du bouton à la GUI
      gui.addControl(rollBtn);

      // 5) Gestion du clic sur le bouton
      rollBtn.onPointerUpObservable.add(async () => {
        const n = Math.floor(Math.random() * 6) + 1;
        await diceMod.current.show();
        await diceMod.current.roll(n);
        await diceMod.current.hide();
        await boardMod.current.movePlayer(currentPlayer, n);
        currentPlayer = (currentPlayer + 1) % playerCount;
        sceneMgrRef.current?.switchTo('CloudGame');
      });
    });

    // Scène CloudGame
    sceneMgr.createScene('CloudGame', (scene) => {
      initCloudGame(scene, sceneMgr);
    });

    // Démarrage de la boucle et affichage de la scène principale
    sceneMgr.run();
    sceneMgr.switchTo('main');

    return () => engine.getEngine().dispose();
  }, []);

  useImperativeHandle(ref, () => ({
    async rollAndMove(steps: number) {
      sceneMgrRef.current?.createScene('mini1', initMiniGame1);
      await diceMod.current.show();
      await diceMod.current.roll(steps);
      await diceMod.current.hide();
      await boardMod.current.movePlayer(currentPlayer, steps);
      sceneMgrRef.current?.switchTo('CloudGame');
      currentPlayer = (currentPlayer + 1) % playerCount;
    },
  }));

  return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
});

export default GameScene;
