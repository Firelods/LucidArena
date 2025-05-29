import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { WS_BASE } from '../services/constants';

export function useLobbySocket(roomId: string, user: string) {
  const [players, setPlayers] = useState<string[]>([]);
  const [started, setStarted] = useState<boolean>(false);

  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwt');

    if (!token) {
      console.error('No JWT token found in localStorage.');
      return;
    }

    const stomp = new Client({
      brokerURL: `${WS_BASE}?access_token=${token}`,
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        stomp.subscribe(`/topic/lobby/${roomId}`, (message) => {
          const body = JSON.parse(message.body);
          setPlayers(body.usernames);
        });
        stomp.subscribe(`/topic/lobby/${roomId}/start`, () => {
          setStarted(true);
        });
        stomp.publish({
          destination: `/app/lobby/join/${roomId}`,
          body: JSON.stringify({ username: user }),
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    stomp.activate();
    setClient(stomp);

    return () => {
      stomp.deactivate();
    };
  }, [roomId, user]);

  function startGame() {
    if (client && client.connected) {
      client.publish({
        destination: `/app/lobby/start/${roomId}`,
        body: '{}',
      });
    }
  }
  return { players, startGame, started };
}
