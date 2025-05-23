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
  Image,
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

      await showPopups([
        'Bienvenue dans LucidArena ! Prêt·e pour l’aventure ?',
        'À tour de rôle, affrontez-vous sur le plateau.',
        'Sur chaque case, découvrez :',
        '• Un bonus d’étoiles \n• Un mini-jeu pour en gagner davantage \n• Une chance de rejouer',
        'Le premier à 10 étoiles remporte la partie !',
        'Bonne chance et amusez-vous bien !',
      ]);
     const rollBtn = Button.CreateSimpleButton('rollBtn', '');
rollBtn.width  = '60px';                      // largeur fixe
rollBtn.height = '60px';                      // hauteur identique => carré
rollBtn.cornerRadius = 15;                    // bords bien arrondis
rollBtn.background   = 'white';               // fond blanc (ou 'transparent')
rollBtn.thickness    = 2;                     // épaisseur de la bordure
rollBtn.color        = '#444';                // couleur de la bordure
rollBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
rollBtn.verticalAlignment   = Control.VERTICAL_ALIGNMENT_BOTTOM;
rollBtn.left = '-20px';
rollBtn.top  = '-20px';
  
// ajoute ton image à l’intérieur du bouton (tout de suite après)
const diceImg = new Image('diceImg', '/assets/bouton_dice.png');
diceImg.width  = '80%';   // un peu de marge intérieure
diceImg.height = '80%';
rollBtn.addControl(diceImg);

gui.addControl(rollBtn);

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

    sceneMgrRef.current?.createScene('CloudGame', (scene) => {
        initCloudGame(scene, sceneMgr)
      });
    sceneMgr.run();
    sceneMgr.switchTo('main');

    return () => be.getEngine().dispose();
  }, []);

  useImperativeHandle(ref, () => ({
    async rollAndMove(steps: number) {
      sceneMgrRef.current?.createScene('mini1', initMiniGame1);
      // affiche + lance le dé
      await diceMod.current.show();
      await diceMod.current.roll(steps);
      await diceMod.current.hide();

      // déplace le joueur courant
      await boardMod.current.movePlayer(currentPlayer, steps);

    
      await diceMod.current.hide();
      

      sceneMgrRef.current?.switchTo('CloudGame');
      currentPlayer = (currentPlayer + 1) % playerCount; 
    },
  }));

  return <canvas ref={canvasRef} style={{ width: '100%', height: '99%' }} />;
});

export default GameScene;
