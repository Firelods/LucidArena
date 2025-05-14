package fr.gamesonweb.lucid_arena_backend.entity;


import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class PlayerProfile {
    @Id
    private String googleSub; // sub de Google comme identifiant unique
    private String email;
    private String nickname;
}
