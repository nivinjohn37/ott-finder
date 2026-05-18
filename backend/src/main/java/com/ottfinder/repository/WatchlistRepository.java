package com.ottfinder.repository;

import com.ottfinder.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {

    @Query("SELECT w FROM Watchlist w JOIN FETCH w.movie WHERE w.user.id = :userId")
    List<Watchlist> findByUserIdWithMovie(@Param("userId") Long userId);

    Optional<Watchlist> findByUserIdAndMovieId(Long userId, Long movieId);

    boolean existsByUserIdAndMovieId(Long userId, Long movieId);

    long countByUserId(Long userId);

    // Subquery avoids non-standard JPQL cross-join; cutoff passed as param to avoid vendor date arithmetic
    @Query("""
            SELECT DISTINCT w FROM Watchlist w
            JOIN FETCH w.movie m
            WHERE w.user.id = :userId
            AND w.notifiedBeforeExpiry = false
            AND EXISTS (
                SELECT ma FROM MovieAvailability ma
                WHERE ma.movie.id = m.id
                AND ma.availableUntil IS NOT NULL
                AND ma.availableUntil <= :cutoff
            )
            """)
    List<Watchlist> findExpiringByUserId(@Param("userId") Long userId,
                                         @Param("cutoff") OffsetDateTime cutoff);
}
