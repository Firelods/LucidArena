import { useRef } from 'react';
import GameScene from './scenes/GameScene';
import MobileControls from './components/MobileControls';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  return (
    <div className="w-screen h-screen relative">
      <GameScene canvasRef={canvasRef} />
      <MobileControls target={canvasRef.current} />
    </div>
  );
}
