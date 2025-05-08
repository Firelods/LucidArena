package fr.gamesonweb.lucid_arena_backend.repository;

import fr.gamesonweb.lucid_arena_backend.entity.PlayerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerProfileRepository extends JpaRepository<PlayerProfile, String> {
}
