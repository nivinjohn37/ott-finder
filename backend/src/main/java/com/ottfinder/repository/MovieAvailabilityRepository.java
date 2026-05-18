package com.ottfinder.repository;

import com.ottfinder.entity.MovieAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    void deleteByMovieIdAndPlatformId(Long movieId, Long platformId);
}
