package com.ottfinder.dto.response;

public record UserStats(
        String favouriteGenre,
        long totalWatchlist,
        long totalWatched
) {}
