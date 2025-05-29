export interface MiniGameInstructionDTO {
  playerNickname: string;
  miniGameName: string;
}

export interface MiniGameOutcomeDTO {
  miniGameName: string;
  winnerNickname: string;
  winnerScore: number;
}
