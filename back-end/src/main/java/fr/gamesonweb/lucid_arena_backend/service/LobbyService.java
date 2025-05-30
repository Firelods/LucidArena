package fr.gamesonweb.lucid_arena_backend.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import fr.gamesonweb.lucid_arena_backend.controller.GameController;
import fr.gamesonweb.lucid_arena_backend.entity.GameState;
import fr.gamesonweb.lucid_arena_backend.entity.MiniGameResult;
import fr.gamesonweb.lucid_arena_backend.entity.PlayerProfile;
import lombok.AllArgsConstructor;
import lombok.extern.java.Log;

@Service
@AllArgsConstructor
@Log
public class LobbyService {
    public static final int TILE_COUNT = 44;
    private final BoardGenerator boardGenerator;
    private final SimpMessagingTemplate messaging;
    private final Map<String, Set<String>> rooms = new ConcurrentHashMap<>();
    private final Map<String, GameState> gameStates = new ConcurrentHashMap<>();
    // Hashmap of lobbyId to HashMap of miniGameName to MiniGameResult
    private final Map<String, HashMap<String,MiniGameResult>> miniGameResults = new ConcurrentHashMap<>();
    private final RestTemplate restTemplate;

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

    public void setGameState(String roomId, GameState gameState) {
        gameStates.put(roomId, gameState);
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
        state.setBoardTypes(boardGenerator.generate(TILE_COUNT));

        return state;
    }

    public void addMiniGameResult(String lobbyId, String playerNickname, String miniGameName, int score) {
        // check if the lobby and mini game result exist, if not create them
        HashMap<String, MiniGameResult> results = miniGameResults.get(lobbyId);
        if (results == null) {
            results = new HashMap<>();
            miniGameResults.put(lobbyId, results);
        }
        MiniGameResult result = results.get(miniGameName);
        if (result == null) {
            result = new MiniGameResult();
            results.put(miniGameName, result);
        }
        // Add the player's score to the mini game result
        result.addPlayerScore(playerNickname, score);

    }

    public boolean allResultReceived(String lobbyId, String miniGameName) {
        HashMap<String, MiniGameResult> results = miniGameResults.get(lobbyId);
        if (results == null) {
            log.info("No results found for lobby " + lobbyId);
            return false; // No results for this lobby
        }
        MiniGameResult miniGameResult = results.get(miniGameName);
        if (miniGameResult == null) {
            log.info("No results found for mini game " + miniGameName + " in lobby " + lobbyId);
            return false; // No results for this mini game
        }
        // if minigame is a solo game, we only need one result
        if (miniGameName.equals("ClickerGame") || miniGameName.equals("rainingGame")) {
            log.info("Solo mini game " + miniGameName + " in lobby " + lobbyId);
            return miniGameResult.getPlayerScores().size() == 1;
        }
        // For multi-player games, we need all players to have submitted their results
        Set<String> players = rooms.get(lobbyId);
        if (players == null) {
            log.info("No players found in lobby " + lobbyId);
            return false; // No players in the lobby
        }

        return miniGameResult.getPlayerScores().keySet().containsAll(players);
    }

    public void resetMinigameResult(String lobbyId, String miniGameName) {
        HashMap<String, MiniGameResult> results = miniGameResults.get(lobbyId);
        if (results != null) {
            results.remove(miniGameName);
            log.info("Reset mini game results for " + miniGameName + " in lobby " + lobbyId);
        } else {
            log.info("No results found for lobby " + lobbyId + " to reset.");
        }
    }

    public GameController.MiniGameOutcomeDTO computeOutcome(String lobbyId,
                                                            String miniGameName) {
        HashMap<String, MiniGameResult> results = miniGameResults.get(lobbyId);
        if (results == null) {
            log.info("No results found for lobby " + lobbyId);
            return null; // No results for this lobby
        }
        MiniGameResult miniGameResult = results.get(miniGameName);
        if (miniGameResult == null) {
            log.info("No results found for mini game " + miniGameName + " in lobby " + lobbyId);
            return null; // No results for this mini game
        }
        // if miniGame is a soloGame ("ClickerGame" or "rainingGame"), we only need one player
        if (miniGameName.equals("ClickerGame") ) {
            return updateScoreMiniGameSolo(lobbyId, miniGameName, miniGameResult, 80);
        }
        if (miniGameName.equals("rainingGame")) {
            return updateScoreMiniGameSolo(lobbyId, miniGameName, miniGameResult, 10);
        }

        // Find the player with the highest score
        String winnerNickname = null;
        int highestScore = Integer.MIN_VALUE;

        for (Map.Entry<String, Integer> entry : miniGameResult.getPlayerScores().entrySet()) {
            if (entry.getValue() > highestScore) {
                highestScore = entry.getValue();
                winnerNickname = entry.getKey();
            }
        }


        GameState state = getGameState(lobbyId);
        String finalWinnerNickname = winnerNickname;
        state.getPlayers().stream()
                .filter(player -> player.getNickname().equals(finalWinnerNickname))
                .findFirst()
                .ifPresent(player -> {
                    int playerIndex = state.getPlayers().indexOf(player);
                    state.getScores()[playerIndex] += 1; // Increment the score of the winning player
                });

        state.setCurrentPlayer(state.getCurrentPlayer() + 1);
        if (state.getCurrentPlayer() == state.getPlayers().size()) {
            state.setCurrentPlayer(0); // Recommence au premier joueur
        }
        this.setGameState(lobbyId, state);
        PlayerProfile endWinner=checkIfEndGame(lobbyId);
        state.setWinner(endWinner !=null ? endWinner.getNickname() : null);
        messaging.convertAndSend("/topic/game/" + lobbyId, state);


        return new GameController.MiniGameOutcomeDTO(miniGameName, winnerNickname, highestScore);

    }


    public GameController.MiniGameOutcomeDTO updateScoreMiniGameSolo(
            String lobbyId,
            String miniGameName,
            MiniGameResult miniGameResult,
            int neededScore) {
        // Get the only player who submitted a result
        Map.Entry<String, Integer> entry = miniGameResult.getPlayerScores().entrySet().iterator().next();
        String playerNickname = entry.getKey();
        //.info("Solo mini game " + miniGameName + " in lobby " + lobbyId + " won by " + playerNickname);
        // add 1 to the score of the player in the gameState
        GameState gameState = getGameState(lobbyId);
        int playerIndex = gameState.getPlayers().stream()
                .map(PlayerProfile::getNickname)
                .toList()
                .indexOf(playerNickname);
        if (playerIndex != -1) {
            if( entry.getValue() < neededScore ) {
                log.warning("Player " + playerNickname + " did not reach the needed score of " + neededScore);
                return null; // Player did not reach the needed score
            }
            int currentScore = gameState.getScores()[playerIndex];
            gameState.getScores()[playerIndex] = currentScore + 1;
            this.setGameState(lobbyId, gameState);
            log.info("Solo mini game " + miniGameName + " in lobby " + lobbyId + " won by " + playerNickname);
//            messaging.convertAndSend("/topic/game/" + lobbyId, gameState);
            PlayerProfile endWinner=checkIfEndGame(lobbyId);
            gameState.setWinner(endWinner !=null ? endWinner.getNickname() : null);
        } else {
            log.warning("Player " + playerNickname + " not found in game state for lobby " + lobbyId);
        }

        resetMinigameResult(lobbyId, miniGameName);
        gameState.setCurrentPlayer(gameState.getCurrentPlayer() + 1);
        if (gameState.getCurrentPlayer() == gameState.getPlayers().size()) {
            gameState.setCurrentPlayer(0); // Recommence au premier joueur
        }
        messaging.convertAndSend("/topic/game/" + lobbyId, gameState);

        return new GameController.MiniGameOutcomeDTO(miniGameName, entry.getKey(), entry.getValue());
    }

    public PlayerProfile checkIfEndGame(String lobbyId) {
        GameState state = getGameState(lobbyId);
        if (state != null) {
            for (int i = 0; i < state.getScores().length; i++) {
                if (state.getScores()[i] >= 5) { // Assuming 5 is the winning score
                    String winnerNickname = state.getPlayers().get(i).getNickname();
                    int finalScore = state.getScores()[i];
                    sendDiscordWinNotification(winnerNickname, finalScore);
                    return state.getPlayers().get(i);
                }
            }
        }
        this.setGameState(lobbyId, state);
        messaging.convertAndSend("/topic/game/" + lobbyId, state);

        return null;

    }


    private void sendDiscordWinNotification(String winner, int score) {
        String webhookUrl = "https://discord.com/api/webhooks/1377897437846306836/dLkYXfF2Y6XI-gnrXwsIgkoo_Kycuuns7ophDW1taHBCES2Hx1dJZDUirY4IVXsa_j-p";
        String content = String.format(
                "🏆 **VICTOIRE !**\nJoueur : %s\nScore final : %d\nDate : %s",
                winner, score, new java.util.Date()
        );
    
        Map<String, String> json = Map.of("content", content);
    
        try {
            restTemplate.postForEntity(webhookUrl, json, String.class);
        } catch (Exception e) {
            log.warning("Erreur lors de l'envoi de la notif Discord : " + e.getMessage());
        }
    }
    
}

