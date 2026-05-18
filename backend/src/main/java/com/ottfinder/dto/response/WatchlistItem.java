package com.ottfinder.dto.response;

import java.util.List;

public record WatchlistItem(
        Long id,
        MovieSearchResult movie,
        String addedAt,
        List<OttAvailability> expiringPlatforms
) {}
