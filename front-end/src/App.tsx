import viteLogo from '/vite.svg';
import './App.css';

// src/App.tsx
import React, { useRef } from 'react';
import BoardScene from './scenes/BoardScene';
import Dice from './components/Dice';

function App() {
    const boardRef = useRef<{ movePlayer: (n: number) => Promise<void> }>(null);

    return (
        <div style={{ width: '100vw', height: '100dvh', position: 'relative' }}>
            <BoardScene ref={boardRef} />
            <Dice onRoll={(n) => boardRef.current?.movePlayer(n)} />
        </div>
    );
}

export default App;
