import GameScene from './scenes/GameScene';
import MobileControls from './components/MobileControls';

export default function Game() {
  return (
    <div className="w-screen h-screen relative">
      <GameScene />
      <MobileControls />
    </div>
  );
}
