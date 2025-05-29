package fr.gamesonweb.lucid_arena_backend.entity;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
@Setter
@Getter
public class GameState {
    private List<PlayerProfile> players;
    private int currentPlayer;
    private int[] positions;
    private int[] scores;
    private String lastDiceRoll;
    private List<String> boardTypes;
}
