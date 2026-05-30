package com.ottfinder.repository;

import com.ottfinder.entity.MovieAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MovieAvailabilityRepository extends JpaRepository<MovieAvailability, Long> {

    @Query("SELECT ma FROM MovieAvailability ma JOIN FETCH ma.platform WHERE ma.movie.id = :movieId")
    List<MovieAvailability> findByMovieIdWithPlatform(@Param("movieId") Long movieId);

    @Query("""
            SELECT ma FROM MovieAvailability ma
            JOIN FETCH ma.platform
            WHERE ma.movie.tmdbId = :tmdbId
            """)
    List<MovieAvailability> findByMovieTmdbId(@Param("tmdbId") Integer tmdbId);

    Optional<MovieAvailability> findByMovieIdAndPlatformId(Long movieId, Long platformId);

    void deleteByMovieIdAndPlatformId(Long movieId, Long platformId);

    @Query("SELECT ma.platform.displayName, COUNT(ma) FROM MovieAvailability ma GROUP BY ma.platform.displayName ORDER BY COUNT(ma) DESC")
    List<Object[]> findTopPlatformsByCount(org.springframework.data.domain.Pageable pageable);
}
