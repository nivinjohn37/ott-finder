package com.ottfinder.repository;

import com.ottfinder.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MovieRepository extends JpaRepository<Movie, Long> {
    Optional<Movie> findByTmdbId(Integer tmdbId);
    boolean existsByTmdbId(Integer tmdbId);
}
