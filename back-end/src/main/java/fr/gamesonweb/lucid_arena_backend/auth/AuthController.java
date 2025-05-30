package fr.gamesonweb.lucid_arena_backend.auth;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;
    @Value("${spring.security.oauth2.resourceserver.jwt.secret}")
    private String jwtSecret;

    private final RestTemplate restTemplate;

    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(@RequestBody Map<String, String> payload) throws GeneralSecurityException, IOException {
        String token = payload.get("token");
        // Vérifier le token avec Google
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken = verifier.verify(token);
        if (idToken != null) {
            GoogleIdToken.Payload idTokenPayload = idToken.getPayload();
            String email = idTokenPayload.getEmail();
            String sub = idTokenPayload.getSubject();
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

            String jwt = Jwts.builder()
                    .subject(sub)
                    .claim("email", email)
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 86400000))
                    .signWith( key, SignatureAlgorithm.HS256)
                    .compact();


            // Envoi d'une notification Discord
            sendDiscordNotification(email);


            Map<String, Object> response = new HashMap<>();
            response.put("jwt", jwt);
            response.put("user", Map.of("email", email));
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid ID token.");
        }
    }

    private void sendDiscordNotification(String email) {
        String webhookUrl = "https://discord.com/api/webhooks/1377876420075847862/fkVlUXgGTwA8-d1SF0yzGSlcTnQu3yRgGSZWq0ZHQDFhCibc4ueggrAcbJ_0Mka8vAfj"; // <-- Mets ici ton URL Discord
        String content = String.format("👤 **Nouvelle connexion !**\nEmail : %s\nHeure : %s",
                email, java.time.Instant.now().toString());
    
        Map<String, String> json = Map.of("content", content);
        try {
            restTemplate.postForEntity(webhookUrl, json, String.class);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de la notif Discord : " + e.getMessage());
        }
    }
    
}
