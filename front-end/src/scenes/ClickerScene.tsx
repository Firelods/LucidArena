import React, { useEffect, useRef, useState } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Button } from '@babylonjs/gui';

const ClickerScene = ({ onFinish }: { onFinish: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 6, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    const sphere = MeshBuilder.CreateSphere("sphere", {}, scene);

    // GUI button
    const gui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    const button = Button.CreateSimpleButton("btn", "Click me!");
    button.width = "150px";
    button.height = "60px";
    button.color = "white";
    button.cornerRadius = 10;
    button.background = "blue";
    button.onPointerUpObservable.add(() => {
      setCount(c => c + 1);
      sphere.scaling = sphere.scaling.add(new Vector3(0.1, 0.1, 0.1));
    });
    gui.addControl(button);

    engine.runRenderLoop(() => {
      scene.render();
    });

    return () => {
      engine.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full" style={{ border: '2px solid red' }} />
      <div className="absolute top-4 left-4 bg-white text-black p-2 rounded">
        Clicks: {count}
      </div>
    </div>
  );
};

export default ClickerScene;
