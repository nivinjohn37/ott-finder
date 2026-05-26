package com.ottfinder.repository;

import com.ottfinder.entity.GroupWatchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GroupWatchlistRepository extends JpaRepository<GroupWatchlist, Long> {

    @Query("""
            SELECT gw FROM GroupWatchlist gw
            JOIN FETCH gw.movie
            JOIN FETCH gw.addedBy
            WHERE gw.group.id = :groupId
            ORDER BY gw.addedAt DESC
            """)
    List<GroupWatchlist> findByGroupIdWithDetails(@Param("groupId") Long groupId);

    boolean existsByGroupIdAndMovieTmdbId(Long groupId, Integer tmdbId);

    long countByGroupId(Long groupId);
}
