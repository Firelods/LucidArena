import { useRef } from 'react';
import Dice from './components/Dice';
import GameScene from './scenes/GameScene';

export default function Game() {
    const gameRef = useRef<{ rollAndMove: (n: number) => Promise<void> }>(null);

    return (
        <div className="w-screen h-screen relative">
            <GameScene ref={gameRef} />
        </div>
    );
}
