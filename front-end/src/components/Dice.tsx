// src/components/Dice.tsx
import React from 'react';

type Props = {
    onRoll: (n: number) => void;
};

const Dice: React.FC<Props> = ({ onRoll }) => {
const roll = () => onRoll(Math.floor(Math.random() * 6) + 1)

return (
    <button
    onClick={roll}
    style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        padding: '0.4rem',
        borderRadius: '0.75rem',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
    }}
    >
    <img
        src={'assets/bouton_dice.png'}
        alt="Roll Dice"
        style={{
        display: 'block',
        width: '5rem',
        height: '5rem',
        borderRadius: '0.5rem',
        }}
    />
    </button>
)
};

export default Dice;
