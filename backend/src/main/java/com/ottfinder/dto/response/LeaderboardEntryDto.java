package com.ottfinder.dto.response;

public record LeaderboardEntryDto(
        Long userId,
        String displayName,
        int watchedCount,
        int totalItems,
        int percentage,
        int rank
) {}
