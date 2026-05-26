package com.ottfinder.repository;

import com.ottfinder.entity.GroupSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GroupSuggestionRepository extends JpaRepository<GroupSuggestion, Long> {

    @Query("""
            SELECT gs FROM GroupSuggestion gs
            JOIN FETCH gs.movie
            JOIN FETCH gs.suggestedBy
            WHERE gs.group.id = :groupId
            ORDER BY (gs.upvotes - gs.downvotes) DESC, gs.suggestedAt DESC
            """)
    List<GroupSuggestion> findByGroupIdWithDetails(@Param("groupId") Long groupId);

    boolean existsByGroupIdAndMovieTmdbId(Long groupId, Integer tmdbId);
}
