import { useRef } from 'react';
import GameScene from './scenes/GameScene';
import { SceneManager } from './engine/SceneManager';
import { useState, useEffect } from 'react';

export default function Game() {
  const gameRef = useRef<{ rollAndMove: (n: number) => Promise<void> }>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [shouldShowDice, setShouldShowDice] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      const currentScene = sceneManagerRef.current?.getActiveSceneName();
      setShouldShowDice(currentScene === 'main');
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-screen h-screen relative">
      <GameScene ref={gameRef} />
    </div>
  );
}
