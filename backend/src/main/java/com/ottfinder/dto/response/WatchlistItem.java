package com.ottfinder.dto.response;

import java.util.List;

public record WatchlistItem(
        Long id,
        MovieSearchResult movie,
        String addedAt,
        String watchedAt,
        List<OttAvailability> expiringPlatforms
) {}
