package com.ottfinder.dto.response;

public record AdminStats(
        long totalUsers,
        long totalWatchlistEntries,
        long totalMoviesInDb,
        long totalPlatforms,
        long totalReviews,
        long activeGroups
) {}
