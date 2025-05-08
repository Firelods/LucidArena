package fr.gamesonweb.lucid_arena_backend.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LobbyService {

    private final Map<String, Set<String>> rooms = new ConcurrentHashMap<>();

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
}

