package com.ottfinder.repository;

import com.ottfinder.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query("SELECT r FROM Review r JOIN FETCH r.user WHERE r.movie.tmdbId = :tmdbId ORDER BY r.createdAt DESC")
    List<Review> findByMovieTmdbId(@Param("tmdbId") Integer tmdbId);

    @Query("SELECT r FROM Review r JOIN FETCH r.user WHERE r.movie.tmdbId = :tmdbId AND r.user.firebaseUid = :uid")
    Optional<Review> findByMovieTmdbIdAndUserUid(@Param("tmdbId") Integer tmdbId, @Param("uid") String uid);

    @Query("SELECT COUNT(r), COALESCE(AVG(r.rating), 0) FROM Review r WHERE r.movie.tmdbId = :tmdbId")
    List<Object[]> getAggregateByMovieTmdbId(@Param("tmdbId") Integer tmdbId);
}
