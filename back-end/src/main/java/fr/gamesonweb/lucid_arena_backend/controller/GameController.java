package fr.gamesonweb.lucid_arena_backend.controller;

import fr.gamesonweb.lucid_arena_backend.entity.GameState;
import fr.gamesonweb.lucid_arena_backend.repository.PlayerProfileRepository;
import fr.gamesonweb.lucid_arena_backend.service.LobbyService;
import lombok.AllArgsConstructor;
import lombok.extern.java.Log;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@AllArgsConstructor
@Log
public class GameController {
    private final LobbyService lobbyService;
    private final SimpMessagingTemplate messaging;
    private final PlayerProfileRepository playerProfileRepository;


    @MessageMapping("/game/{roomId}/ping")
    public void ping(@DestinationVariable String roomId) {
        GameState state = lobbyService.getGameState(roomId);
        messaging.convertAndSend("/topic/game/" + roomId, state);
    }

    public record MiniGameResultDTO(
            String miniGameName,
            int score) { }
    public record MiniGameOutcomeDTO(
            String miniGameName,
            String winnerNickname,
            int winnerScore) { }

    @MessageMapping("/game/{lobbyId}/minigame/result")
    public void handleMiniGameResult(
            @DestinationVariable String lobbyId,
            MiniGameResultDTO result,
            Principal principal

    ) {
        String nickname = playerProfileRepository.findById(principal.getName()).orElseThrow()
                .getNickname();
        // stocker le résultat temporairement (en mémoire ou dans un service)
        lobbyService.addMiniGameResult(lobbyId, nickname, result.miniGameName(), result.score());

        // si tous les joueurs ont renvoyé leur résultat, on calcule le gagnant
        if (lobbyService.allResultReceived(lobbyId, result.miniGameName())) {
            MiniGameOutcomeDTO outcome = lobbyService.computeOutcome(lobbyId, result.miniGameName());
            log.info("Mini game result: " + outcome.miniGameName());
            messaging.convertAndSend(
                    "/topic/game/" + lobbyId + "/minigame/outcome",
                    outcome
            );


        }
    }
}