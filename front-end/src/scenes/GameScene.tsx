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
} from '@babylonjs/gui';

import { SceneManager } from '../engine/SceneManager';
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { initMiniGame1 } from './MiniGame1';
import { initClickerGame } from './ClickerGame';

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
    const be = new BabylonEngine(canvasRef.current);
    const sceneMgr = new SceneManager(be.getEngine());
    sceneMgrRef.current = sceneMgr;
    // scène principale
    sceneMgr.createScene('main', async (scene) => {
      const camera = new ArcRotateCamera(
        'camera',
        -1,
        Math.PI / 3,
        20,
        new Vector3(10, 2, 9),
        scene,
      );
      camera.attachControl(canvasRef.current!, true);

      const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
      light.intensity = 0.8;

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

      const gui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
      function showPopups(messages: string[]): Promise<void> {
        return new Promise((resolve) => {
          let idx = 0;
          const panel = new Rectangle('panel');
          panel.width = '60%';
          panel.height = '220px';
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
          txt.fontSize = 26;
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
              gui.dispose();
              resolve();
            } else {
              txt.text = messages[idx++];
            }
          };
          btn.onPointerUpObservable.add(next);
          next();
        });
      }

      await showPopups([
        'Bienvenue dans LucidArena ! Prêt·e pour l’aventure ?',
        'À tour de rôle, affrontez-vous sur le plateau.',
        'Sur chaque case, découvrez :',
        '• Un bonus d’étoiles \n• Un mini-jeu pour en gagner davantage \n• Une chance de rejouer',
        'Le premier à 10 étoiles remporte la partie !',
        'Bonne chance et amusez-vous bien !',
      ]);
    });

    sceneMgr.switchTo('main');
    sceneMgr.run();

    return () => be.getEngine().dispose();
  }, []);

  useImperativeHandle(ref, () => ({
    async rollAndMove(steps: number) {
      // affiche + lance le dé
      await diceMod.current.show();
      await diceMod.current.roll(steps);
      await diceMod.current.hide();

      

      // déplace le joueur courant
      await boardMod.current.movePlayer(currentPlayer, steps);

      // Cache le dé
      await diceMod.current.hide();

      
      sceneMgrRef.current?.createScene('clickerGame', initClickerGame);
      sceneMgrRef.current?.switchTo('clickerGame');
      currentPlayer = (currentPlayer + 1) % playerCount;
    },
  }));

  return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
});

export default GameScene;
