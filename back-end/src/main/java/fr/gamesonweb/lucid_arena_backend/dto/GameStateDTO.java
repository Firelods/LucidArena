package fr.gamesonweb.lucid_arena_backend.dto;

import fr.gamesonweb.lucid_arena_backend.entity.GameState;
import fr.gamesonweb.lucid_arena_backend.entity.PlayerProfile;

import java.util.List;

public record GameStateDTO(
        List<PlayerProfile> players,
        int currentPlayer,
        int[] positions,
        int[] scores,
        String lastDiceRoll){
    public GameStateDTO(GameState gameState){
        this(
                gameState.getPlayers(),
                gameState.getCurrentPlayer(),
                gameState.getPositions(),
                gameState.getScores(),
                gameState.getLastDiceRoll()
        );
    }
}
