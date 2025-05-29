export interface GameStateDTO {
  roomId: string;
  players: Player[];
  currentPlayer: number;
  positions: number[];
  scores: number[];
  lastDiceRoll: number;
  boardTypes?: string[];
}

type Player = {
  nickname: string;
};
