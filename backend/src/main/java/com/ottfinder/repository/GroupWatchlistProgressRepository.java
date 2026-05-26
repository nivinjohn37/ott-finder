package com.ottfinder.repository;

import com.ottfinder.entity.GroupWatchlistProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface GroupWatchlistProgressRepository extends JpaRepository<GroupWatchlistProgress, Long> {

    Optional<GroupWatchlistProgress> findByGroupWatchlistItemIdAndUserId(Long itemId, Long userId);

    List<GroupWatchlistProgress> findByGroupWatchlistItemId(Long itemId);

    // All progress rows for a user across items in a given group
    @Query("""
            SELECT gwp FROM GroupWatchlistProgress gwp
            JOIN FETCH gwp.user
            WHERE gwp.groupWatchlistItem.id IN :itemIds
            """)
    List<GroupWatchlistProgress> findByItemIds(@Param("itemIds") Set<Long> itemIds);

    // Count of watched items per user for leaderboard
    @Query("""
            SELECT gwp.user.id, COUNT(gwp)
            FROM GroupWatchlistProgress gwp
            WHERE gwp.groupWatchlistItem.group.id = :groupId
            GROUP BY gwp.user.id
            """)
    List<Object[]> countWatchedPerUserInGroup(@Param("groupId") Long groupId);
}
