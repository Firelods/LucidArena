import './App.css';

// src/App.tsx
import React, { useRef } from 'react';
import Dice from './components/Dice';
import GameScene from './scenes/GameScene';

function App() {
    const gameRef = useRef<{ rollAndMove: (n:number)=>Promise<void> }>(null);

    return (
        <div style={{ width: '100vw', height: '100dvh', position: 'relative' }}>
            <GameScene ref={gameRef} />
            <Dice onRoll={(n) => gameRef.current?.rollAndMove(n)} />
        </div>
    );
}

export default App;
