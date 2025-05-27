package fr.gamesonweb.lucid_arena_backend.service;

import fr.gamesonweb.lucid_arena_backend.entity.GameState;
import fr.gamesonweb.lucid_arena_backend.entity.PlayerProfile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LobbyService {

    private final Map<String, Set<String>> rooms = new ConcurrentHashMap<>();
    private final Map<String, GameState> gameStates = new ConcurrentHashMap<>();

    public void createRoom(String roomId) {
        rooms.putIfAbsent(roomId, ConcurrentHashMap.newKeySet());
    }

    public boolean addPlayerToRoom(String roomId, String nickname) {
        Set<String> players = rooms.get(roomId);
        if (players == null) return false;
        return players.add(nickname);
    }

    public Set<String> getPlayers(String roomId) {
        return rooms.getOrDefault(roomId, Set.of());
    }

    public GameState getGameState(String lobbyId) {
        return gameStates.computeIfAbsent(lobbyId, id -> createInitialGameState(lobbyId));
    }

    private GameState createInitialGameState(String roomId) {
        GameState state = new GameState();
        List <String> players = List.copyOf(rooms.get(roomId));
        if (players.isEmpty()) {
            throw new IllegalStateException("No players in the room to initialize game state.");
        }
        List<PlayerProfile> playerProfiles = players.stream()
                .map(PlayerProfile::new) // Assuming PlayerProfile has a constructor that takes a nickname
                .toList();
        state.setPlayers(playerProfiles);
        state.setCurrentPlayer(0); // Le premier joueur est le joueur 0
        state.setPositions(new int[playerProfiles.size()]);
        state.setScores(new int[playerProfiles.size()]); // Initialisation des scores à 0
        state.setLastDiceRoll(""); // Dernier lancer de dés vide au début
        // Initialise joueurs, positions, scores, etc
        return state;
    }
}

