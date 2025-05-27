import {
  MeshBuilder,
  Vector3,
  Color3,
  StandardMaterial,
  Mesh,
  Scene,
  ArcRotateCamera,
  AbstractMesh,
  AppendSceneAsync,
  HemisphericLight,
  PBRMaterial,
} from '@babylonjs/core';
import { SceneManager } from '../engine/SceneManager';
import { playerFiles } from '../utils/utils';

type PlayerState = {
  mesh: Mesh;
  lane: number; // -1 = gauche, 0 = centre, 1 = droite
  alive: boolean;
  score: number;
};

export async function initMiniGame1(
  scene: Scene,
  canvas: HTMLCanvasElement,
  sceneMgr: SceneManager,
  playerIndex: number,
) {
  // Caméra dynamique
  const camera = new ArcRotateCamera(
    'camera',
    0,
    Math.PI / 4,
    2,
    new Vector3(0, 2, 15),
    scene,
  );
  // Inspector.Show(scene, { embedMode: true });
  // camera.lowerRadiusLimit = 15;
  // camera.upperRadiusLimit = 18;
  // camera.wheelPrecision = 2000;
  // camera.panningSensibility = 0;

  // Lumière
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 1.0;

  // Sols (plusieurs bandes pour l'infini)
  const GROUND_DEPTH = 80;
  const GROUND_COUNT = 3; // On boucle 3 grounds
  const grounds: Mesh[] = [];
  for (let i = 0; i < GROUND_COUNT; i++) {
    const ground = MeshBuilder.CreateBox(
      'ground' + i,
      { width: 9, height: 0.5, depth: GROUND_DEPTH },
      scene,
    );
    ground.position.z = i * GROUND_DEPTH;
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.emissiveColor = new Color3(0.6, 0.85, 0.6);
    ground.material = groundMat;
    grounds.push(ground);
  }

  // Avatar GLB
  let avatar: AbstractMesh | null = null;
  let currentLane: number = 0;
  let zPosition = 2;
  console.log(
    `Loading player ${playerIndex} avatar from /assets/${playerFiles[playerIndex]}`,
  );

  await AppendSceneAsync(`/assets/${playerFiles[playerIndex]}`, scene);
  let result = scene.getMeshByName('__root__') as Mesh;
  result.name = 'avatar';

  avatar = result;
  avatar.position = new Vector3(0, 0, zPosition);
  avatar.rotation = new Vector3(0, Math.PI * 2, 0);
  avatar.scaling = new Vector3(1, 1, 1);

  // Joueur
  const players: PlayerState[] = [
    {
      mesh: avatar as Mesh,
      lane: 0,
      alive: true,
      score: 0,
    },
  ];

  // Obstacles
  type Obstacle = { mesh: Mesh; lane: number; z: number };
  const obstacles: Obstacle[] = [];
  // 1. Loader unique du mesh nuage, hors de la boucle principale
  let nuageMesh: Mesh | null = null;
  await AppendSceneAsync('/assets/nuage.glb', scene);
  nuageMesh = scene.getMeshByName('__root__') as Mesh;
  nuageMesh.name = 'nuageTmpl';

  if (!nuageMesh) throw new Error('Nuage mesh not found!');
  nuageMesh.isVisible = false; // on cache l'original (c'est le template)
  let material = new PBRMaterial('obstacleMat', scene);
  material.metallic = 0.3;
  material.roughness = 0.5;
  nuageMesh.getChildMeshes()[0].material = material;
  // Fréquence accrue des obstacles
  let lastObstacleZ = zPosition;
  function spawnObstacle(z: number) {
    if (!nuageMesh) return;
    const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1

    // CLONAGE du nuage
    const newNuage = nuageMesh.clone('obstacleNuage_' + Math.random());
    newNuage.isVisible = true;
    newNuage.rotation = new Vector3(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    newNuage.scaling = new Vector3(0.5, 0.5, 0.5);
    newNuage.position = new Vector3(lane * 3, 3, z);

    obstacles.push({ mesh: newNuage, lane, z });
  }

  // Déplacement fluide avec animation (easing)
  let isMoving = false;
  let moveStartTime = 0;
  let moveFromX = 0;
  let moveToX = 0;
  const MOVE_DURATION = 0.15; // en secondes

  window.onkeydown = (e) => {
    if (!players[0].alive || isMoving) return;
    if (e.key === 'ArrowLeft' && players[0].lane > -1) {
      players[0].lane--;
      isMoving = true;
      moveStartTime = performance.now();
      moveFromX = players[0].mesh.position.x;
      moveToX = players[0].lane * 3;
    }
    if (e.key === 'ArrowRight' && players[0].lane < 1) {
      players[0].lane++;
      isMoving = true;
      moveStartTime = performance.now();
      moveFromX = players[0].mesh.position.x;
      moveToX = players[0].lane * 3;
    }
  };

  // Boucle principale
  let zSpeed = 0.15;
  let score = 0;
  let gameOver = false;

  scene.onBeforeRenderObservable.add(() => {
    if (!players[0].alive || !avatar) return;

    // 1. Mouvement avant
    zPosition += zSpeed;
    players[0].mesh.position.z = zPosition;

    // 2. Déplacement latéral smooth
    if (isMoving) {
      const elapsed = (performance.now() - moveStartTime) / 1000;
      if (elapsed < MOVE_DURATION) {
        // Easing: cubic (smoothstep)
        let t = elapsed / MOVE_DURATION;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let ease = t * t * (3 - 2 * t);
        players[0].mesh.position.x = moveFromX + (moveToX - moveFromX) * ease;
      } else {
        players[0].mesh.position.x = moveToX;
        isMoving = false;
      }
    }

    // 3. Génération obstacles (très fréquent)
    while (lastObstacleZ < zPosition + 50) {
      if (Math.random() < 0.7) {
        // 70% de chance à chaque pas
        spawnObstacle(lastObstacleZ + 8 + Math.random() * 4);
      }
      lastObstacleZ += 3 + Math.random() * 2; // variable pour ne pas être trop prévisible
    }

    // 4. Déplacement obstacles + nettoyage
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      // Collision
      if (
        Math.abs(o.mesh.position.z - players[0].mesh.position.z) < 1.2 &&
        o.lane === players[0].lane
      ) {
        players[0].alive = false;
        o.mesh.material.emissiveColor = new Color3(1, 0, 0);
        gameOver = true;
        setTimeout(() => {
          alert('Perdu ! Score : ' + Math.floor(score));
          window.location.reload();
        }, 100);
      }
      // Retire obstacle dépassé
      if (o.mesh.position.z < players[0].mesh.position.z - 10) {
        o.mesh.dispose();
        obstacles.splice(i, 1);
      }
    }

    // 5. Caméra suit le joueur
    camera.setTarget(new Vector3(0, 2, zPosition + 10));
    camera.position = new Vector3(0, 7, zPosition - 12);

    // 6. Terrain infini
    grounds.forEach((ground) => {
      if (ground.position.z + GROUND_DEPTH / 2 < zPosition - 10) {
        ground.position.z += GROUND_DEPTH * GROUND_COUNT;
      }
    });

    // 7. Score
    score += zSpeed;
  });
}
