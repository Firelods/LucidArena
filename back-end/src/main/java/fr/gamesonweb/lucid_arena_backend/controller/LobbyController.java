package fr.gamesonweb.lucid_arena_backend.controller;

import fr.gamesonweb.lucid_arena_backend.dto.GameStateDTO;
import fr.gamesonweb.lucid_arena_backend.dto.ListPlayerJoinDTO;
import fr.gamesonweb.lucid_arena_backend.dto.MiniGameInstructionDTO;
import fr.gamesonweb.lucid_arena_backend.dto.PlayerJoinDTO;
import fr.gamesonweb.lucid_arena_backend.entity.GameState;
import fr.gamesonweb.lucid_arena_backend.entity.PlayerProfile;
import fr.gamesonweb.lucid_arena_backend.repository.PlayerProfileRepository;
import fr.gamesonweb.lucid_arena_backend.service.LobbyService;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.java.Log;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import java.security.Principal;
import java.util.Map;
import java.util.Random;

@Controller
@RequestMapping("/api/lobby")
@Log
@AllArgsConstructor
public class LobbyController {
    private final LobbyService lobbyService;
    private final PlayerProfileRepository playerProfileRepository;
    private final SimpMessagingTemplate messagingTemplate;

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
    public ListPlayerJoinDTO joinLobby(PlayerJoinDTO message, @DestinationVariable String roomId,
                                       MessageHeaders headers) {
        Map<String, Object> sessionAttributes = (Map<String, Object>) headers.get("simpSessionAttributes");
        String user = (String) sessionAttributes.get("user");
        log.info("User: " + user + " joined room " + roomId);
        // show all players in the room
        return new ListPlayerJoinDTO(roomId, lobbyService.getPlayers(roomId).stream().toList());
    }

    @MessageMapping("/lobby/start/{lobbyId}")
    public void handleStart(@DestinationVariable String lobbyId) {
        log.info("Starting game for lobby: " + lobbyId);
        GameState state = lobbyService.getGameState(lobbyId);
        messagingTemplate.convertAndSend("/topic/lobby/" + lobbyId + "/start", state);
    }

    // debug
    @PostMapping("/debug/{lobbyId}/broadcast")
    public ResponseEntity<?> debugBroadcast(@PathVariable String lobbyId) {
        GameState state = lobbyService.getGameState(lobbyId);
        messagingTemplate.convertAndSend("/topic/game/" + lobbyId, state);
        return ResponseEntity.ok("Broadcasted game state to /topic/game/" + lobbyId);
    }

    @MessageMapping("/game/{lobbyId}/roll")
    public void handleRoll(@DestinationVariable String lobbyId, Principal principal) {
        log.info("Handling roll for lobby: " + lobbyId + " by user: " + principal.getName());
        String nickname = playerProfileRepository.findById(principal.getName()).orElseThrow()
                .getNickname();
        // 1. Récupère l’état
        GameState state = lobbyService.getGameState(lobbyId);

        // 2. Valide que c’est le bon joueur
        if (!nickname.equals(state.getPlayers().get(state.getCurrentPlayer()).getNickname())) {
            throw new IllegalStateException("It's not your turn!");
        }
        Random random = new Random();
        // 3. Calcule le lancer (par exemple 1 à 6)
        int dice = (random.nextInt(6)) + 1;
        state.setLastDiceRoll(String.valueOf(dice));

        // get index of player who rolled
        int currentPlayerIndex = state.getCurrentPlayer();
        // 4. Met à jour la position du joueur
        state.getPositions()[currentPlayerIndex] += dice;
        if (state.getPositions()[currentPlayerIndex] >= state.getBoardTypes().size()) {
            // Si le joueur dépasse la fin du plateau, il revient au début
            state.getPositions()[currentPlayerIndex] = state.getPositions()[currentPlayerIndex] % state.getBoardTypes().size();
        }

        // 5. Met à jour le joueur actuel
        //

        int position = state.getPositions()[currentPlayerIndex];
        String tileType = state.getBoardTypes().get(position);
        String miniGame = "";
        switch (tileType) {
            case "multi" -> miniGame = random.nextInt(2) == 0 ? "mini1" : "StarGame";
            case "solo" -> miniGame = random.nextInt(2) == 0 ? "ClickerGame" : "rainingGame";
            case "bonus" -> state.getScores()[currentPlayerIndex] += 1;
            case "malus" -> state.getScores()[currentPlayerIndex] -= 1;
            default -> throw new IllegalStateException("Unknown tile type: " + tileType);
        }

        if (miniGame.isEmpty()) {
            state.setCurrentPlayer(state.getCurrentPlayer() + 1);
            if (state.getCurrentPlayer() == state.getPlayers().size()) {
                state.setCurrentPlayer(0); // Recommence au premier joueur
            }
        }

        PlayerProfile profile = lobbyService.checkIfEndGame(lobbyId);
        state.setWinner(profile != null ? profile.getNickname() : null);
        lobbyService.setGameState(lobbyId, state);
        // 6. Broadcast à tous dans la room
        messagingTemplate.convertAndSend("/topic/game/" + lobbyId, state);

        if (!miniGame.isEmpty()) {
            MiniGameInstructionDTO instr = new MiniGameInstructionDTO(
                    tileType.equals("multi") ? null : nickname, miniGame);
            // delay by 1 second the sending of the instruction
            try {
                Thread.sleep(1000); // Simule un délai de 1 seconde
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt(); // Restore interrupted status
                log.warning("Thread interrupted while sleeping: " + e.getMessage());
            }
            messagingTemplate.convertAndSend(
                    "/topic/game/" + lobbyId + "/minigame/instruction",
                    instr);
        }
    }
}
