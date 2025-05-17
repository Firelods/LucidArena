import React, { useEffect, useRef, useState } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Button } from '@babylonjs/gui';
import { ClickerModule } from '../modules/ClickerModule';

const ClickerScene = ({ onFinish }: { onFinish: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectRef = useRef<any>(null);
  const clicker = useRef(new ClickerModule());
  const [remaining, setRemaining] = useState(10);
  const [clicks, setClicks] = useState(0);
  const scaleRef = useRef(1);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);

    const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 6, Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    const object = MeshBuilder.CreateSphere("clickSphere", {}, scene);
    objectRef.current = object;

    clicker.current.startGame();

    // GUI
    const gui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    const clickBtn = Button.CreateSimpleButton("clickBtn", "+");
    clickBtn.width = "100px";
    clickBtn.height = "100px";
    clickBtn.color = "white";
    clickBtn.cornerRadius = 50;
    clickBtn.background = "#34acec";
    clickBtn.top = "-200px";

    clickBtn.onPointerUpObservable.add(() => {
      if (clicker.current.isTimeUp()) return; 

      clicker.current.click();
      scaleRef.current += 0.1;
      objectRef.current.scaling = new Vector3(scaleRef.current, scaleRef.current, scaleRef.current);
    });

    gui.addControl(clickBtn);

    const interval = setInterval(() => {
      setRemaining(Math.floor(clicker.current.getRemainingTime() / 1000));
      setClicks(clicker.current.getClicks());

      if (clicker.current.isTimeUp()) {
        clearInterval(interval);
        alert("Time's up! Final score: " + clicker.current.getClicks());
        onFinish();
      }
    }, 200);

    engine.runRenderLoop(() => {
      scene.render();
    });

    return () => {
      clearInterval(interval);
      engine.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div className="absolute top-4 right-4 bg-white text-black p-2 rounded">
        ⏱️ Temps restant : {remaining}s<br />
        🖱️ Clics : {clicks}
      </div>
    </div>
  );
};

export default ClickerScene;
