import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { GameStateDTO } from '../dto/GameStateDTO';

export function useGameSocket(roomId: string) {
  const [gameState, setGameState] = useState<GameStateDTO | null>(null);

  const stompRef = useRef<Client | null>(null);
  const [winnerNumber, setWinnerNumber] = useState<number | null>(null);

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

        stomp.subscribe(`/topic/game/${roomId}/winner`, (message) => {
          const winner = JSON.parse(message.body);
          console.log(`Winner: ${winner}`);
          setWinnerNumber(winner);
          // Ici, tu peux gérer l'affichage du gagnant ou rediriger vers une scène de fin
        });

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
  return { gameState, rollDice, winnerNumber };
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
