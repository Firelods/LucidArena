import {
  MeshBuilder,
  Vector3,
  Color3,
  StandardMaterial,
  Mesh,
  Scene,
  Animation,
  ArcRotateCamera,
  AppendSceneAsync,
  HemisphericLight,
  PBRMaterial,
  QuadraticEase,
  EasingFunction,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture, // pour l'UI fullscreen :contentReference[oaicite:0]{index=0}
  TextBlock,
  Control,
  Rectangle,
  Button,
} from '@babylonjs/gui';
import { SceneManager } from '../engine/SceneManager';
import { MiniGameResult } from '../hooks/useGameSocket';

type PlayerState = {
  mesh: Mesh;
  lane: number; // -1 = gauche, 0 = centre, 1 = droite
  alive: boolean;
  score: number;
};

type Obstacle = {
  mesh: Mesh;
  lane: number;
  z: number;
};

export async function initMiniGame1(
  scene: Scene,
  canvas: HTMLCanvasElement,
  sceneMgr: SceneManager,
  activePlayer: number,
  onMiniGameEnd: (result: MiniGameResult) => void,
) {
  function resetGame() {
    // Réinitialise positions du sol
    grounds.forEach((g, i) => {
      g.position.z = i * GROUND_DEPTH;
    });
    // Réinitialise joueur
    players.forEach((p) => {
      p.lane = 0;
      p.alive = true;
      p.score = 0;
      p.mesh.position.set(0, 0, 2);
    });
    // Supprime et vide obstacles
    obstacles.forEach((o) => o.mesh.dispose());
    obstacles.length = 0;
    // Réinitialise progression
    zPosition = 2;
    lastObstacleZ = zPosition;
    score = 0;
  }

  // --- INITIALISATION DE LA SCÈNE ---
  const camera = new ArcRotateCamera(
    'camera',
    0,
    Math.PI / 4,
    2,
    new Vector3(0, 2, 15),
    scene,
  );
  scene.activeCamera = camera;
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 1.0;
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
  // Popups d'intro
  await showPopups([
    'Bienvenue dans SkySurfer !',
    'Rester le plus longtemps possible sur la piste et éviter les nuages.',
    "Attention, c'est parti !",
  ]);
  // 1) Affiche un compte à rebours avant de démarrer le jeu
  await showCountdown(scene, 3);
  // Sols infinis
  const GROUND_DEPTH = 80;
  const GROUND_COUNT = 3;
  const grounds: Mesh[] = [];
  for (let i = 0; i < GROUND_COUNT; i++) {
    const ground = MeshBuilder.CreateBox(
      'ground' + i,
      { width: 9, height: 0.5, depth: GROUND_DEPTH },
      scene,
    );
    ground.position.z = i * GROUND_DEPTH;
    const mat = new StandardMaterial('groundMat', scene);
    mat.diffuseColor = Color3.FromHexString('#71366C');
    ground.material = mat;
    grounds.push(ground);
  }
  const playerFiles = [
    'character.glb',
    'character_pink.glb',
    'character_blue.glb',
    'character_green.glb',
  ];

  // Chargement de l’avatar
  await AppendSceneAsync(`/assets/${playerFiles[activePlayer]}`, scene);
  const avatarMesh = scene.getMeshByName('__root__') as Mesh;
  avatarMesh.name = 'avatar';
  avatarMesh.position.set(0, 0, 2);
  avatarMesh.rotation = new Vector3(0, Math.PI * 2, 0);
  avatarMesh.scaling = new Vector3(1, 1, 1);

  // --- ÉTAT DU JEU ---
  const players: PlayerState[] = [
    { mesh: avatarMesh, lane: 0, alive: true, score: 0 },
  ];
  let zPosition = 2;
  let lastObstacleZ = zPosition;
  const obstacles: Obstacle[] = [];
  // Chargement du nuage template
  await AppendSceneAsync('/assets/nuage.glb', scene);
  const nuageTmpl = scene.getMeshByName('__root__') as Mesh;
  if (!nuageTmpl) throw new Error('Nuage mesh not found!');
  nuageTmpl.name = 'nuageTmpl';
  nuageTmpl.isVisible = false;
  const obsMat = new PBRMaterial('obstacleMat', scene);
  obsMat.metallic = 0.3;
  obsMat.roughness = 0.5;
  nuageTmpl.getChildMeshes()[0].material = obsMat;

  let isMoving = false;
  let moveStart = 0;
  let fromX = 0;
  let toX = 0;
  const MOVE_DUR = 0.15;
  let zSpeed = 0.1;
  let score = 0;

  // Spawn d’un nuage
  function spawnObstacle(z: number) {
    const lane = Math.floor(Math.random() * 3) - 1;
    const nb = nuageTmpl.clone('obs_' + Math.random());
    nb.isVisible = true;
    nb.rotation = new Vector3(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    nb.scaling = new Vector3(0.5, 0.5, 0.5);
    nb.position = new Vector3(lane * 3, 3, z);
    obstacles.push({ mesh: nb, lane, z });
  }

  // Gestion du clavier
  window.onkeydown = (e) => {
    if (!players[0].alive || isMoving) return;
    if (e.key === 'ArrowLeft' && players[0].lane > -1) {
      players[0].lane--;
    } else if (e.key === 'ArrowRight' && players[0].lane < 1) {
      players[0].lane++;
    } else {
      return;
    }
    isMoving = true;
    moveStart = performance.now();
    fromX = players[0].mesh.position.x;
    toX = players[0].lane * 3;
  };

  // Boucle de rendu
  scene.onBeforeRenderObservable.add(() => {
    if (!players[0].alive) return;

    // Avance
    zPosition += zSpeed;
    players[0].mesh.position.z = zPosition;

    // Déplacement latéral smooth
    if (isMoving) {
      const t0 = (performance.now() - moveStart) / 1000;
      if (t0 < MOVE_DUR) {
        let t = Math.max(0, Math.min(1, t0 / MOVE_DUR));
        t = t * t * (3 - 2 * t);
        players[0].mesh.position.x = fromX + (toX - fromX) * t;
      } else {
        players[0].mesh.position.x = toX;
        isMoving = false;
      }
    }

    // Génération d’obstacles
    while (lastObstacleZ < zPosition + 50) {
      if (Math.random() < 0.7) {
        spawnObstacle(lastObstacleZ + 8 + Math.random() * 4);
      }
      lastObstacleZ += 3 + Math.random() * 2;
    }

    // Collision & nettoyage
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (
        Math.abs(o.mesh.position.z - zPosition) < 1.2 &&
        o.lane === players[0].lane
      ) {
        players[0].alive = false;
        setTimeout(() => {
          showPopups([
            'Tu as touché un nuage ! Ton score est de ' +
              Math.floor(score) +
              ' points',
            'Esperons que les autres renards ont été plus maladroits ! ',
          ]).then(() => {
            onMiniGameEnd({
              name: 'mini1',
              score: Math.floor(score),
            });
            resetGame();
            sceneMgr.switchTo('main');
          });
        }, 100);
      }
      if (o.mesh.position.z < zPosition - 10) {
        o.mesh.dispose();
        obstacles.splice(i, 1);
      }
    }

    // Caméra suit
    camera.setTarget(new Vector3(0, 2, zPosition + 10));
    camera.position = new Vector3(0, 7, zPosition - 12);

    // Sol infini
    grounds.forEach((g) => {
      if (g.position.z + GROUND_DEPTH / 2 < zPosition - 10) {
        g.position.z += GROUND_DEPTH * GROUND_COUNT;
      }
    });

    // Score
    score += zSpeed;
  });
}

async function showCountdown(scene: Scene, duration: number): Promise<void> {
  // 1) Création de l'UI fullscreen
  const gui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);

  // 2) Panel semi-transparent centré
  const panel = new Rectangle('countPanel');
  panel.width = '250px';
  panel.height = '250px';
  panel.cornerRadius = 20;
  panel.thickness = 0;
  panel.background = 'white';
  panel.alpha = 0.8;
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  gui.addControl(panel);

  // 3) Texte du compte à rebours
  const text = new TextBlock('countdown');
  text.text = duration.toString();
  text.color = '#3792DC';
  text.fontSize = 120;
  text.outlineColor = 'white';
  text.outlineWidth = 4;
  text.shadowColor = 'white';
  text.shadowBlur = 2;
  text.shadowOffsetX = 2;
  text.shadowOffsetY = 2;
  text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  text.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  panel.addControl(text);

  // 4) Animation de « pop » à chaque tick
  const anim = new Animation(
    'pop',
    'scaleX',
    60,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  // On liera scaleX et scaleY ensemble
  anim.setKeys([
    { frame: 0, value: 0.8 },
    { frame: 10, value: 1.2 },
    { frame: 20, value: 1.0 },
  ]);
  const ease = new QuadraticEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  anim.setEasingFunction(ease);
  if (!text.animations) {
    text.animations = [];
  }
  text.animations.push(anim);
  // Dupliquer pour scaleY
  const animY = anim.clone();
  animY.targetProperty = 'scaleY';
  text.animations.push(animY);

  // 5) Boucle de décrément
  for (let i = duration; i > 0; i--) {
    text.text = i.toString();
    // lancer l’animation de pop
    scene.beginAnimation(text, 0, 20, false);
    // attendre 1 seconde
    await new Promise<void>((res) => setTimeout(res, 1000));
  }

  // 6) Disparition en fondu
  const fade = new Animation(
    'fadeOut',
    'alpha',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );
  fade.setKeys([
    { frame: 0, value: panel.alpha },
    { frame: 30, value: 0 },
  ]);
  if (!panel.animations) {
    panel.animations = [];
  }
  panel.animations.push(fade);
  scene.beginAnimation(panel, 0, 30, false);

  // nettoyage
  await new Promise<void>((res) => setTimeout(res, 1000));
  gui.dispose();
}
