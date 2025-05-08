package fr.gamesonweb.lucid_arena_backend.controller;

import fr.gamesonweb.lucid_arena_backend.entity.PlayerProfile;
import fr.gamesonweb.lucid_arena_backend.repository.PlayerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {
    private final PlayerProfileRepository repo;

    @PostMapping("/nickname")
    public ResponseEntity<?> saveNickname(@RequestBody Map<String, String> body, @AuthenticationPrincipal Jwt jwt) {
        String nickname = body.get("nickname");
        String sub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");

        PlayerProfile profile = repo.findById(sub).orElse(new PlayerProfile());
        profile.setGoogleSub(sub);
        profile.setNickname(nickname);
        profile.setEmail(email);

        repo.save(profile);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal Jwt jwt) {
        String sub = jwt.getSubject();
        return repo.findById(sub)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).build());
    }
}

