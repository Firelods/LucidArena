import {
  AdvancedDynamicTexture,
  Button,
  Rectangle,
  TextBlock,
} from '@babylonjs/gui';

export const playerFiles = [
  'character.glb',
  'character_pink.glb',
  'character_blue.glb',
  'character_green.glb',
];
export const starFiles = [
  'etoile_orange.glb',
  'etoile_pink.glb',
  'etoile_blue.glb',
  'etoile_green.glb',
];
export const playerNames = [
  'Orange Player',
  'Pink Player',
  'Blue Player',
  'Green Player',
];
export const playerColors = ['#f39c12', '#e91e63', '#3498db', '#2ecc71'];

/**
 * Méthode utilitaire pour afficher une suite de popups GUI.
 * Renvoie une promesse qui se résout à la fin de la dernière popup.
 */
export async function showPopups(
  gui: AdvancedDynamicTexture,
  messages: string[],
): Promise<void> {
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
    txt.fontFamily = 'DynaPuff';
    txt.fontSize = 20;
    txt.color = '#333b40';
    panel.addControl(txt);

    const btn = Button.CreateSimpleButton('btn', '➜');
    btn.width = '50px';
    btn.height = '50px';
    btn.cornerRadius = 25;
    btn.top = '55px';
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
