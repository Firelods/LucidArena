export interface GameStateDTO {
  roomId: string;
  players: Player[];
  currentPlayer: number;
  positions: number[];
  scores: number[];
  lastDiceRoll: number;
  // etc.
}

type Player = {
  nickname: string;
};
