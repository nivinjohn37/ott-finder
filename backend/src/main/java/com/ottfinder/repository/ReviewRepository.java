package com.ottfinder.repository;

import com.ottfinder.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query("SELECT r FROM Review r JOIN FETCH r.user WHERE r.movie.tmdbId = :tmdbId ORDER BY r.createdAt DESC")
    List<Review> findByMovieTmdbId(@Param("tmdbId") Integer tmdbId);

    @Query(value = "SELECT r FROM Review r JOIN FETCH r.user WHERE r.movie.tmdbId = :tmdbId ORDER BY r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM Review r WHERE r.movie.tmdbId = :tmdbId")
    Page<Review> findByMovieTmdbIdPaged(@Param("tmdbId") Integer tmdbId, Pageable pageable);

    @Query("SELECT r FROM Review r JOIN FETCH r.user WHERE r.movie.tmdbId = :tmdbId AND r.user.firebaseUid = :uid")
    Optional<Review> findByMovieTmdbIdAndUserUid(@Param("tmdbId") Integer tmdbId, @Param("uid") String uid);

    @Query("SELECT COUNT(r), COALESCE(AVG(r.rating), 0) FROM Review r WHERE r.movie.tmdbId = :tmdbId")
    List<Object[]> getAggregateByMovieTmdbId(@Param("tmdbId") Integer tmdbId);

    long countByUserId(Long userId);

    @Query(value = "SELECT r FROM Review r JOIN FETCH r.user JOIN FETCH r.movie ORDER BY r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM Review r")
    Page<Review> findAllWithUserAndMovie(Pageable pageable);

    @Query(value = "SELECT r FROM Review r JOIN FETCH r.user JOIN FETCH r.movie WHERE r.reportCount > 0 ORDER BY r.reportCount DESC, r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM Review r WHERE r.reportCount > 0")
    Page<Review> findReportedOrderByReportCount(Pageable pageable);

    @Query(value = "SELECT r FROM Review r JOIN FETCH r.user JOIN FETCH r.movie WHERE r.rating = :rating ORDER BY r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM Review r WHERE r.rating = :rating")
    Page<Review> findByRatingWithUserAndMovie(@Param("rating") short rating, Pageable pageable);

    @Query(value = "SELECT r FROM Review r JOIN FETCH r.user JOIN FETCH r.movie WHERE r.reportCount > 0 AND r.rating = :rating ORDER BY r.reportCount DESC, r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM Review r WHERE r.reportCount > 0 AND r.rating = :rating")
    Page<Review> findReportedByRatingOrderByReportCount(@Param("rating") short rating, Pageable pageable);

    @Query("SELECT r.movie.tmdbId, r.movie.title, COUNT(r), AVG(r.rating) FROM Review r GROUP BY r.movie.tmdbId, r.movie.title ORDER BY COUNT(r) DESC")
    List<Object[]> findTopReviewedMovies(Pageable pageable);

    @Query("SELECT r.rating, COUNT(r) FROM Review r GROUP BY r.rating ORDER BY r.rating ASC")
    List<Object[]> findRatingDistribution();
}
