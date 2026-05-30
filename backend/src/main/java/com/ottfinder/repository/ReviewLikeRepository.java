package com.ottfinder.repository;

import com.ottfinder.entity.ReviewLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewLikeRepository extends JpaRepository<ReviewLike, Long> {

    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);

    @Modifying
    @Query("DELETE FROM ReviewLike rl WHERE rl.review.id = :reviewId AND rl.user.id = :userId")
    void deleteByReviewIdAndUserId(@Param("reviewId") Long reviewId, @Param("userId") Long userId);

    long countByReviewId(Long reviewId);

    @Query("SELECT rl.review.id, COUNT(rl) FROM ReviewLike rl WHERE rl.review.id IN :ids GROUP BY rl.review.id")
    List<Object[]> countLikesByReviewIds(@Param("ids") List<Long> ids);

    @Query("SELECT rl.review.id FROM ReviewLike rl WHERE rl.review.id IN :ids AND rl.user.id = :userId")
    List<Long> findLikedReviewIds(@Param("ids") List<Long> ids, @Param("userId") Long userId);
}
