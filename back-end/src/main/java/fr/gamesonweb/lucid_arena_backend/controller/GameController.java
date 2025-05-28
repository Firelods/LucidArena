package fr.gamesonweb.lucid_arena_backend.controller;

import fr.gamesonweb.lucid_arena_backend.entity.GameState;
import fr.gamesonweb.lucid_arena_backend.service.LobbyService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class GameController {
    private final LobbyService lobbyService;
    private final SimpMessagingTemplate messaging;

    public GameController(LobbyService lobbyService,
                          SimpMessagingTemplate messaging) {
        this.lobbyService = lobbyService;
        this.messaging    = messaging;
    }

    @MessageMapping("/game/{roomId}/ping")
    public void ping(@DestinationVariable String roomId) {
        GameState state = lobbyService.getGameState(roomId);
        messaging.convertAndSend("/topic/game/" + roomId, state);
    }
}
