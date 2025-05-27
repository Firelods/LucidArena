import {
  Scene,
  Vector3,
  Animation,
  Tools,
  TransformNode,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';
import { AppendSceneAsync } from '@babylonjs/core/Loading/sceneLoader';
import { boardTiles } from '../utils/board';
import '@babylonjs/loaders/glTF/2.0';
import { Inspector } from '@babylonjs/inspector';

export class BoardModule {
  private scene: Scene;
  private players: TransformNode[] = [];
  private currentIndices: number[] = [];
  private readonly initialHeight = 1.2;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialise le plateau, colore les tuiles et les cubes intérieurs,
   * puis charge et positionne les personnages.
   * @param playerCount nombre de joueurs
   * @param characterPaths chemins des fichiers GLB des personnages
   */
  async init(playerCount: number, characterPaths: string[]) {
    // 1) Charger le plateau
    await AppendSceneAsync('/assets/board.glb', this.scene);
    const boardRoot = this.scene.getMeshByName('__root__') as TransformNode;
    boardRoot.name = 'boardRoot';

    // 2) Récupérer et trier les tuiles (meshes dont le nom commence par "Tile_")
    const tilesData = this.scene.meshes
      .filter((m) => m.name.startsWith('Tile_'))
      .map((m) => ({
        idx: +m.name.split('_')[1],
        mesh: m as Mesh,
        pos: m.position.clone(),
      }))
      .sort((a, b) => a.idx - b.idx);

    // Met à jour boardTiles pour la logique de déplacement
    boardTiles.splice(0, boardTiles.length, ...tilesData.map((t) => t.pos));

    // 3) Matériau de base pour les TUILES (#369336)
    const matTileBase = new StandardMaterial('matTileBase', this.scene);
    matTileBase.diffuseColor = Color3.FromHexString('#F3A07F');
    // suppression de toute brillance
    matTileBase.specularColor = new Color3(0, 0, 0);
    matTileBase.specularPower = 0;

    // Applique ce matériau à chaque mesh de tuile
    for (const { mesh: tileMesh } of tilesData) {
      tileMesh.material = matTileBase;
    }

    // 4) Création des matériaux pour les CUBES internes
    const matMulti = new StandardMaterial('matMulti', this.scene);
    const matSolo = new StandardMaterial('matSolo', this.scene);
    const matBonus = new StandardMaterial('matBonus', this.scene);
    const matMalus = new StandardMaterial('matMalus', this.scene);

    matMulti.diffuseColor = Color3.FromHexString('#FA52E1');
    matSolo.diffuseColor = Color3.FromHexString('#EE99E3');
    matBonus.diffuseColor = Color3.FromHexString('#81E5EC');
    matMalus.diffuseColor = Color3.FromHexString('#EBC042');

    // suppression de toute brillance sur les cubes
    [matMulti, matSolo, matBonus, matMalus].forEach((mat) => {
      mat.specularColor = new Color3(0, 0, 0);
      mat.specularPower = 0;
    });

    const materials = [matMulti, matSolo, matBonus, matMalus] as const;
    const types = ['multi', 'solo', 'bonus', 'malus'] as const;
    const weights = [0.25, 0.25, 0.2, 0.3]; // pondérations
    const cumulative = weights.map((_, i) =>
      weights.slice(0, i + 1).reduce((a, b) => a + b, 0),
    ); // [0.25, 0.50, 0.70, 1.00]

    // 5) Coloration pondérée des enfants "Cube*"
    for (const { mesh: tileMesh } of tilesData) {
      const r = Math.random();
      let idx = cumulative.findIndex((cum) => r < cum);
      if (idx === -1) idx = cumulative.length - 1;

      const cubeMeshes = tileMesh
        .getChildren()
        .filter(
          (n): n is Mesh => n instanceof Mesh && n.name.startsWith('Cube'),
        );

      for (const cube of cubeMeshes) {
        cube.material = materials[idx];
        cube.metadata = { type: types[idx] };
      }
    }

    // 6) Charger chaque personnage et position initiale
    for (let i = 0; i < playerCount; i++) {
      await AppendSceneAsync(characterPaths[i], this.scene);
      const root = this.scene.getMeshByName('__root__') as TransformNode;
      root.name = `characterRoot_${i}`;
      root.parent = boardRoot;
      root.rotation = new Vector3(0, Tools.ToRadians(180), 0);
      root.scaling = new Vector3(0.5, 0.5, 0.5);

      // Position initiale avec hauteur et léger décalage
      root.position = boardTiles[0]
        .clone()
        .add(new Vector3(0, this.initialHeight, 0));

      this.players.push(root);
      this.currentIndices.push(0);
    }

    // 7) Ajuster les positions si plusieurs joueurs sur la même case
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
    this.updateTileGroup(this.currentIndices[playerIndex]);
  }

  private updateTileGroup(tileIdx: number) {
    const group = this.currentIndices
      .map((idx, i) => (idx === tileIdx ? i : -1))
      .filter((i) => i >= 0);

    const count = group.length;
    const radius = 0.3;

    group.forEach((playerIdx, i) => {
      let offset: Vector3;
      if (count === 1) {
        offset = Vector3.Zero();
      } else {
        const angle = (2 * Math.PI * i) / count;
        offset = new Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        );
      }
      this.players[playerIdx].position = boardTiles[tileIdx]
        .clone()
        .add(offset)
        .add(new Vector3(0, this.initialHeight, 0));
    });
  }
}
