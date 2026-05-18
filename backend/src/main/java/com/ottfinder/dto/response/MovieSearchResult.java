package com.ottfinder.dto.response;

import java.util.List;

public record MovieSearchResult(
        Integer tmdbId,
        String title,
        String posterUrl,
        String backdropUrl,
        String overview,
        String releaseDate,
        String mediaType,
        Double voteAverage,
        List<OttAvailability> platforms
) {}
