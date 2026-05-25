package com.ottfinder.repository;

import com.ottfinder.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {

    List<UserBadge> findByUserId(Long userId);

    boolean existsByUserIdAndBadgeType(Long userId, String badgeType);

    @Query("SELECT COUNT(w) FROM Watchlist w WHERE w.user.id = :userId AND w.watchedAt IS NOT NULL")
    long countWatchedByUserId(@Param("userId") Long userId);
}
