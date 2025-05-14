import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from './components/GoogleLoginButton';
import { AuthProvider, useAuth } from './context/AuthContext';
import { createRoom, joinRoom } from './services/lobbyService';

export default function Home() {
    const auth = useAuth();
    const user = auth?.user;
    const setUser = auth?.setUser;

    const [name, setName] = useState('');
    const [room, setRoom] = useState('');
    const [nicknameInput, setNicknameInput] = useState('');
    const [roomInput, setRoomInput] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.nickname) {
            setName(user.nickname);
        }
    }, [user]);

    const handleSaveNickname = async () => {
        const token = localStorage.getItem('jwt');
        const res = await fetch('http://localhost:8080/api/user/nickname', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ nickname: nicknameInput }),
        });
        if (res.ok) {
            setUser({
                ...user,
                nickname: nicknameInput,
                email: user?.email || '',
            });
            setName(nicknameInput);
        }
    };

    const handleCreate = async () => {
        const id = Math.random().toString(36).substring(2, 8);
        const ok = await createRoom(id);
        if (ok) navigate(`/lobby/${id}`, { state: { name } });
    };

    const handleJoin = async () => {
        if (!room) return;
        const ok = await joinRoom(room, name);
        if (ok) navigate(`/lobby/${room}`, { state: { name } });
        else alert('Room inexistante ou pleine.');
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-300 px-4">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                    <h1 className="text-3xl font-bold mb-6 text-center text-purple-700">
                        Lucid Arena
                    </h1>
                    <GoogleLoginButton />
                </div>
            </div>
        );
    }

    if (!user.nickname) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-300 px-4">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-purple-700 mb-4">
                        Choisis ton pseudo
                    </h2>
                    <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="Pseudo"
                        className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                    />
                    <button
                        onClick={handleSaveNickname}
                        className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition"
                    >
                        Valider
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-300 px-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-3xl font-bold mb-6 text-center text-purple-700">
                    Lucid Arena
                </h1>

                <input
                    type="text"
                    placeholder="Votre pseudo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                />

                <input
                    type="text"
                    placeholder="Code room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                />

                <div className="flex justify-between">
                    <button
                        onClick={handleCreate}
                        className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition"
                    >
                        Créer une room
                    </button>
                    <button
                        onClick={handleJoin}
                        className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition"
                    >
                        Rejoindre
                    </button>
                </div>
            </div>
        </div>
    );
}
