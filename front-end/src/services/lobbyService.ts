import { API_BASE } from './constants';

function getToken() {
    return localStorage.getItem('jwt');
}

export async function createRoom(roomId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/lobby`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ roomId }),
    });
    return res.ok;
}

export async function joinRoom(
    roomId: string,
    // nickname: string,
): Promise<boolean> {
    const res = await fetch(`${API_BASE}/lobby/${roomId}/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
        },
        // body: JSON.stringify({ nickname }),
    });
    return res.ok;
}

export async function getPlayers(roomId: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/${roomId}/players`, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    });
    if (!res.ok) return [];
    return await res.json();
}
