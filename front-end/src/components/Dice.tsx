// src/components/Dice.tsx
import React from 'react';

type Props = {
    onRoll: (n: number) => void;
};

const Dice: React.FC<Props> = ({ onRoll }) => {
    const roll = () => onRoll(Math.floor(Math.random() * 6) + 1);
    return (
        <button
            onClick={roll}
            style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                padding: '1rem 2rem',
                fontSize: '1.5rem',
            }}
        >
            🎲
        </button>
    );
};

export default Dice;
