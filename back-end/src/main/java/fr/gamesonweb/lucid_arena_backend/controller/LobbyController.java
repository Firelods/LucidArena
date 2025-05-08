package fr.gamesonweb.lucid_arena_backend.controller;

import fr.gamesonweb.lucid_arena_backend.dto.ListPlayerJoinDTO;
import fr.gamesonweb.lucid_arena_backend.dto.PlayerJoinDTO;
import fr.gamesonweb.lucid_arena_backend.repository.PlayerProfileRepository;
import fr.gamesonweb.lucid_arena_backend.service.LobbyService;
import lombok.extern.java.Log;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Map;

@Controller
@RequestMapping("/api/lobby")
@Log
public class LobbyController {
    private final LobbyService lobbyService;
    private final PlayerProfileRepository playerProfileRepository;

    public LobbyController(LobbyService lobbyService, PlayerProfileRepository playerProfileRepository) {
        this.lobbyService = lobbyService;
        this.playerProfileRepository = playerProfileRepository;
    }

    public record CreateRoomDTO(String roomId) {
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody CreateRoomDTO createRoomDTO, @AuthenticationPrincipal Jwt jwt) {
        String roomId = createRoomDTO.roomId;
        String nickname = playerProfileRepository.findById(jwt.getSubject()).orElseThrow()
                .getNickname();

        lobbyService.createRoom(roomId);
        lobbyService.addPlayerToRoom(roomId, nickname);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId, @AuthenticationPrincipal Jwt jwt) {
        String nickname = playerProfileRepository.findById(jwt.getSubject()).orElseThrow()
                .getNickname();
        boolean ok = lobbyService.addPlayerToRoom(roomId, nickname);
        return ok
                ? ResponseEntity.ok().build()
                : ResponseEntity.status(HttpStatus.NOT_FOUND).body("Room not found or full");
    }

    @MessageMapping("/lobby/join/{roomId}")
    @SendTo("/topic/lobby/{roomId}")
    public ListPlayerJoinDTO joinLobby(PlayerJoinDTO message, @DestinationVariable String roomId, MessageHeaders headers) {
        Map<String, Object> sessionAttributes = (Map<String, Object>) headers.get("simpSessionAttributes");
        String user = (String) sessionAttributes.get("user");
        log.info("User: " + user + " joined room " + roomId);
        // show all players in the room
        return new ListPlayerJoinDTO(roomId, lobbyService.getPlayers(roomId).stream().toList());
    }
}

