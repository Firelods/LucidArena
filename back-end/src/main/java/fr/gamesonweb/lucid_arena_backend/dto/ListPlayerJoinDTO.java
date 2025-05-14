package fr.gamesonweb.lucid_arena_backend.dto;


import java.util.List;

public record ListPlayerJoinDTO(String roomId, List<String> usernames) {
}