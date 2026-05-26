package com.ottfinder.dto.response;

import java.util.List;

public record GroupWatchlistItemDto(
        Long id,
        MovieSearchResult movie,
        String addedByName,
        String addedAt,
        boolean currentUserWatched,
        int watchedCount,
        int totalMembers,
        List<MemberProgressDto> progress
) {
    public record MemberProgressDto(String displayName, boolean watched, String watchedAt) {}
}
