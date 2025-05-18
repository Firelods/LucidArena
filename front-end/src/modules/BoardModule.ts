import {
  Scene,
  Vector3,
  Animation,
  Tools,
  TransformNode,
} from '@babylonjs/core';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { boardTiles } from '../utils/board';
import '@babylonjs/loaders/glTF/2.0';

export class BoardModule {
  private scene: Scene;
  private players: TransformNode[] = [];
  private currentIndices: number[] = [];
  private readonly initialHeight = 1.2;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialise le plateau et les pions.
   * @param playerCount nombre de joueurs (défaut : 4)
   */
  async init(playerCount: number, characterPaths: string[]) {
    // 1. Charger le plateau
    await AppendSceneAsync('/assets/board.glb', this.scene);
    const boardRoot = this.scene.getMeshByName('__root__')!;
    boardRoot.name = 'boardRoot';

    // 2. Extraire et trier les tuiles
    const tiles = this.scene.meshes
      .filter((m) => m.name.startsWith('Tile_'))
      .map((m) => ({
        idx: +m.name.split('_')[1],
        pos: m.position.clone(),
      }))
      .sort((a, b) => a.idx - b.idx)
      .map((t) => t.pos);
    boardTiles.splice(0, boardTiles.length, ...tiles);

    // 3. Charger chaque personnage distinct
    for (let i = 0; i < playerCount; i++) {
      // charge le i-ème glb
      await AppendSceneAsync(characterPaths[i], this.scene);
      // récupère la racine importée
      const root = this.scene.getMeshByName('__root__') as TransformNode;
      root.name = `characterRoot_${i}`;
      root.parent = boardRoot;
      root.rotation = new Vector3(0, Tools.ToRadians(180), 0);
      root.scaling = new Vector3(0.5, 0.5, 0.5);

      // position initiale avec décalage X pour distinguer les pions
      root.position = boardTiles[0]
        .clone()
        .add(new Vector3(0, this.initialHeight, 0));

      this.players.push(root);
      this.currentIndices.push(0);
    }
    // en cas de plusieurs joueurs sur la meme case, on les décale
    this.updateTileGroup(0);
  }

  private getYRotation(from: Vector3, to: Vector3): number {
    const d = to.subtract(from);
    return Math.atan2(d.x, d.z);
  }

  private animateJump(
    player: TransformNode,
    from: Vector3,
    to: Vector3,
  ): Promise<void> {
    return new Promise((res) => {
      player.rotation.y = this.getYRotation(from, to);
      const anim = new Animation(
        'jump',
        'position',
        60,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      anim.setKeys([
        { frame: 0, value: from.clone() },
        {
          frame: 30,
          value: from
            .add(to)
            .scale(0.5)
            .add(new Vector3(0, 1, 0)),
        },
        { frame: 60, value: to.clone() },
      ]);
      player.animations = [anim];
      this.scene.beginAnimation(player, 0, 60, false, 1, () => res());
    });
  }

  async movePlayer(playerIndex: number, steps: number) {
    for (let i = 0; i < steps; i++) {
      const idx = this.currentIndices[playerIndex];
      const from = boardTiles[idx]
        .clone()
        .add(new Vector3(0, this.initialHeight, 0));
      this.currentIndices[playerIndex]++;
      const to = boardTiles[this.currentIndices[playerIndex]]
        .clone()
        .add(new Vector3(0, this.initialHeight, 0));
      await this.animateJump(this.players[playerIndex], from, to);
    }
    // on met à jour la position de tous les joueurs sur cette tuile
    // (pour le cas où il y a plusieurs joueurs sur la même case)
    const arrivedIdx = this.currentIndices[playerIndex];
    this.updateTileGroup(arrivedIdx);
  }
  /**
   * Calcule la position de chaque joueur sur la tuile donnée.
   * Si plusieurs joueurs sont sur la même tuile, ils sont répartis en cercle.
   * Sinon, ils sont tous centrés sur la tuile.
   * @param tileIdx Index de la tuile à mettre à jour
   */
  private updateTileGroup(tileIdx: number) {
    // 1) collecte tous les joueurs qui sont sur la tuile
    const group = this.currentIndices
      .map((idx, i) => (idx === tileIdx ? i : -1))
      .filter((i) => i >= 0);

    const count = group.length;
    const radius = 0.3;

    // 2) pour chaque pion, calcul d’un offset :
    group.forEach((playerIdx, i) => {
      let offset: Vector3;

      if (count === 1) {
        // un seul, on le centre
        offset = new Vector3(0, 0, 0);
      } else {
        // plusieurs, on les répartit en cercle
        const angle = (2 * Math.PI * i) / count;
        offset = new Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        );
      }

      // 3) on repositionne
      this.players[playerIdx].position = boardTiles[tileIdx]
        .clone()
        .add(offset)
        .add(new Vector3(0, this.initialHeight, 0));
    });
  }
}
