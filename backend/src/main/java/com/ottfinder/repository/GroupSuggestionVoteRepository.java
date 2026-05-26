package com.ottfinder.repository;

import com.ottfinder.entity.GroupSuggestionVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public interface GroupSuggestionVoteRepository extends JpaRepository<GroupSuggestionVote, Long> {

    Optional<GroupSuggestionVote> findBySuggestionIdAndUserId(Long suggestionId, Long userId);

    @Query("SELECT v FROM GroupSuggestionVote v WHERE v.suggestion.id IN :suggestionIds AND v.user.id = :userId")
    java.util.List<GroupSuggestionVote> findByUserVotesForSuggestions(
            @Param("suggestionIds") Set<Long> suggestionIds,
            @Param("userId") Long userId);
}
