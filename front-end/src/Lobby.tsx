import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useLobbySocket } from './hooks/useLobbySocket';

export default function Lobby() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const name = (location.state as any)?.name || 'Anonyme';

    const { players } = useLobbySocket(roomId!, name);

    const handleStart = () => {
        navigate(`/game/${roomId}`, { state: { name } });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 px-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                <h2 className="text-2xl font-bold text-purple-700 mb-2">
                    Salle d'attente
                </h2>
                <p className="text-gray-600 mb-4">
                    Code de la room :{' '}
                    <span className="font-mono">{roomId}</span>
                </p>

                <div className="mb-6">
                    <p className="text-gray-700">
                        Bienvenue{' '}
                        <span className="font-semibold text-purple-600">
                            {name}
                        </span>{' '}
                        !
                    </p>
                    <p className="text-gray-500 mt-2 italic">
                        Joueurs connectés :
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-800">
                        {players.map((player, index) => (
                            <li key={index}>• {player}</li>
                        ))}
                    </ul>
                </div>

                <button
                    onClick={handleStart}
                    className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition"
                >
                    Démarrer la partie
                </button>
            </div>
        </div>
    );
}
