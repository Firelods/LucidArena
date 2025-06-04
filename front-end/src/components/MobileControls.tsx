import React from 'react';

const MobileControls = () => {
  const dispatchKey = (key: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-6 sm:hidden z-50">
      <button
        onTouchStart={() => dispatchKey('ArrowLeft')}
        onMouseDown={() => dispatchKey('ArrowLeft')}
        className="bg-gray-700 text-white p-4 rounded-full text-2xl"
      >
        ◀
      </button>
      <button
        onTouchStart={() => dispatchKey('ArrowRight')}
        onMouseDown={() => dispatchKey('ArrowRight')}
        className="bg-gray-700 text-white p-4 rounded-full text-2xl"
      >
        ▶
      </button>
    </div>
  );
};

export default MobileControls;
