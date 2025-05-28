package fr.gamesonweb.lucid_arena_backend.entity;

import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;

@Getter
@Setter
public class MiniGameResult {
    private HashMap<String, Integer> playerScores;

    public MiniGameResult() {
        this.playerScores = new HashMap<>();
    }
    public void addPlayerScore(String playerNickname, int score) {
        playerScores.put(playerNickname, score);
    }
}
