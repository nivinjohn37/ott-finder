package com.ottfinder.dto.response;

import java.util.List;

public record MovieDetail(
        Integer tmdbId,
        String title,
        String posterUrl,
        String backdropUrl,
        String overview,
        String releaseDate,
        String mediaType,
        Double voteAverage,
        Integer voteCount,
        List<OttAvailability> platforms,
        String trailerKey,
        String tagline,
        Integer runtime,
        List<String> genres,
        List<CastMember> cast
) {}
