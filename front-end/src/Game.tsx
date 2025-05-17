// src/Game.tsx
import { useRef, useState } from 'react';
import Dice from './components/Dice';
import GameScene from './scenes/GameScene';
import ClickerScene from './scenes/ClickerScene';

export default function Game() {
    const [scene, setScene] = useState<'board' | 'clicker'>('board');
    const gameRef = useRef<{ rollAndMove: (n: number) => Promise<void> }>(null);
  
    return (
      <div className="w-screen h-screen relative">
        {scene === 'board' && (
          <>
            <GameScene ref={gameRef} />
            <Dice onRoll={(n: number) => gameRef.current?.rollAndMove(n)} />
            <button
              className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded z-10"
              onClick={() => setScene('clicker')}
            >
              🎮 Clicker
            </button>
          </>
        )}
        {scene === 'clicker' && (
          <ClickerScene onFinish={() => setScene('board')} />
        )}
      </div>
    );
  }