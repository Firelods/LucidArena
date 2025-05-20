import {
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  ActionManager,
  ExecuteCodeAction,
  SceneLoader,
  PhysicsImpostor,
  Mesh,
} from '@babylonjs/core';
import '@babylonjs/loaders'; // enable GLB support

export async function initRainingGame(scene: Scene): Promise<void> {
  // --- Camera & Light Setup ---
  const camera = new ArcRotateCamera(
    'camMini1',
    -Math.PI / 4,
    Math.PI / 4,
    12,
    new Vector3(0, 1, 0),
    scene,
  );
  camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);
  new HemisphericLight('lightMini1', new Vector3(0, 1, 0), scene).intensity =
    0.7;

  // --- Enable Physics ---
  scene.enablePhysics();

  // --- Assets Base Path ---
  // Since assets are in a global folder outside 'front', adjust the base URL accordingly
  const assetsRoot = '../../assets/';

  // --- Select Character Dynamically ---
  const params = new URLSearchParams(window.location.search);
  const requested = parseInt(params.get('player') || '1', 10);
  // Map IDs 1–4 to actual GLB filenames
  const characterFiles = [
    'character_blue.glb',
    'character_green.glb',
    'character_pink.glb',
    'character.glb',
  ];
  const index = Math.min(Math.max(requested - 1, 0), characterFiles.length - 1);
  const characterFile = characterFiles[index];

  // --- Load Player Character ---
  const { meshes: charMeshes } = await SceneLoader.ImportMeshAsync(
    '',
    assetsRoot,
    characterFile,
    scene,
  );
  const player = charMeshes[0] as Mesh;
  player.position = new Vector3(0, 1, 0);
  player.scaling = new Vector3(1, 1, 1);
  player.physicsImpostor = new PhysicsImpostor(
    player,
    PhysicsImpostor.BoxImpostor,
    { mass: 1, restitution: 0 },
    scene,
  );

  // --- Input Handling ---
  const inputMap: Record<string, boolean> = {};
  scene.actionManager = new ActionManager(scene);
  scene.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
      inputMap[evt.sourceEvent.key] = true;
    }),
  );
  scene.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
      inputMap[evt.sourceEvent.key] = false;
    }),
  );

  // --- Game State & UI ---
  let score = 0;
  let timeLeft = 30; // seconds
  const spawnInterval = 500; // ms
  let spawnHandle: number;
  let timerHandle: number;

  const gui = document.createElement('div');
  gui.style.position = 'absolute';
  gui.style.top = '10px';
  gui.style.left = '10px';
  gui.style.color = 'white';
  gui.innerHTML = `Score: <span id='score'>0</span><br/>Time: <span id='timer'>30</span>s`;
  document.body.appendChild(gui);

  // --- Spawn Falling Objects ---
  function spawnObject() {
    const isGood = Math.random() < 0.5;
    const file = isGood ? 'good.glb' : 'bad.glb';
    SceneLoader.ImportMesh('', assetsRoot, file, scene, (meshes) => {
      const obj = meshes[0] as Mesh;
      obj.position = new Vector3(
        (Math.random() - 0.5) * 8,
        10,
        (Math.random() - 0.5) * 8,
      );
      obj.scaling = new Vector3(0.5, 0.5, 0.5);
      obj.physicsImpostor = new PhysicsImpostor(
        obj,
        PhysicsImpostor.SphereImpostor,
        { mass: 1, restitution: 0 },
        scene,
      );
      obj.physicsImpostor.registerOnPhysicsCollide(
        player.physicsImpostor!,
        () => {
          score += isGood ? 1 : -1;
          document.getElementById('score')!.textContent = score.toString();
          obj.dispose();
        },
      );
    });
  }

  // --- Game Loop & Controls ---
  scene.onBeforeRenderObservable.add(() => {
    const moveSpeed = 0.1;
    if (inputMap['ArrowLeft'] || inputMap['a']) {
      player.position.x -= moveSpeed;
    }
    if (inputMap['ArrowRight'] || inputMap['d']) {
      player.position.x += moveSpeed;
    }
  });

  // --- Start Spawn & Timer ---
  spawnHandle = window.setInterval(spawnObject, spawnInterval);
  timerHandle = window.setInterval(() => {
    timeLeft -= 1;
    document.getElementById('timer')!.textContent = timeLeft.toString();
    if (timeLeft <= 0) {
      window.clearInterval(spawnHandle);
      window.clearInterval(timerHandle);
      alert(`Game over! Your final score is ${score}`);
    }
  }, 1000);
}
