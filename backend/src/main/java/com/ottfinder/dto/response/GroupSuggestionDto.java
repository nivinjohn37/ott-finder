package com.ottfinder.dto.response;

public record GroupSuggestionDto(
        Long id,
        MovieSearchResult movie,
        String suggestedByName,
        int upvotes,
        int downvotes,
        int currentUserVote,   // 1, -1, or 0
        String suggestedAt
) {}
