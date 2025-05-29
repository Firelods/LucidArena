import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { GameStateDTO } from '../dto/GameStateDTO';
import {
  MiniGameInstructionDTO,
  MiniGameOutcomeDTO,
} from '../dto/MiniGameInstructionDTO';

export function useGameSocket(roomId: string) {
  const [gameState, setGameState] = useState<GameStateDTO | null>(null);
  const [miniGameInstr, setMiniGameInstr] =
    useState<MiniGameInstructionDTO | null>(null);
  const [miniGameOutcome, setMiniGameOutcome] =
    useState<MiniGameOutcomeDTO | null>(null);

  const stompRef = useRef<Client | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      console.error('No JWT token found in localStorage.');
      return;
    }
    console.log(`Connecting to game room ${roomId} with token ${token}`);

    const stomp = new Client({
      brokerURL: `ws://localhost:8080/ws?access_token=${token}`,
      reconnectDelay: 5000,
      onConnect: () => {
        stomp.subscribe(`/topic/game/${roomId}`, (message) => {
          const state = JSON.parse(message.body);
          console.log(state);
          setGameState(state);
        });
        stomp.subscribe(`/topic/game/${roomId}/init`, (msg) => {
          const state: GameStateDTO = JSON.parse(msg.body);
          console.log(`Game initialized: ${JSON.stringify(state)}`);

          setGameState(state);
        });
        stomp.subscribe(
          `/topic/game/${roomId}/minigame/instruction`,
          ({ body }) => {
            const instr = JSON.parse(body) as MiniGameInstructionDTO;
            console.log(
              `Received mini-game instruction: ${JSON.stringify(instr)}`,
            );

            setMiniGameInstr(instr);
          },
        );
        stomp.subscribe(
          `/topic/game/${roomId}/minigame/outcome`,
          ({ body }) => {
            const outcome = JSON.parse(body) as MiniGameOutcomeDTO;
            setMiniGameOutcome(outcome);
          },
        );
        stomp.publish({
          destination: `/app/game/${roomId}/ping`,
          body: '{}',
        });
      },
    });
    stompRef.current = stomp;
    stomp.activate();
    return () => {
      stomp.deactivate();
    };
  }, [roomId]);
  // Pour envoyer le roll :
  function rollDice() {
    if (stompRef.current && stompRef.current.connected) {
      console.log(`Rolling dice in room ${roomId}`);
      stompRef.current.publish({
        destination: `/app/game/${roomId}/roll`,
        body: '{}', // vide, le back sait qui tu es via JWT
      });
    }
  }

  function onMiniGameEnd(result: MiniGameResult) {
    if (stompRef.current && stompRef.current.connected) {
      console.log(
        `Ending mini-game ${result.name} with score ${result.score} for player ${gameState?.players[gameState.currentPlayer].nickname}`,
      );
      stompRef.current.publish({
        destination: `/app/game/${roomId}/minigame/result`,
        body: JSON.stringify({
          miniGameName: result.name,
          score: result.score,
        }),
      });
    }
  }
  return { gameState, rollDice, miniGameInstr, onMiniGameEnd, miniGameOutcome };
}

export interface MiniGameResult {
  name: string;
  score: number;
}

export function isItMyTurn(
  gameState: GameStateDTO | null,
  nickname: string,
): boolean {
  console.log(
    `comparing gameState actual player: ${gameState?.players[gameState.currentPlayer].nickname} with nickname: ${nickname}`,
  );

  return (
    !!gameState &&
    gameState.players[gameState.currentPlayer].nickname === nickname
  );
}
