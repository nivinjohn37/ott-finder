package com.ottfinder.dto.response;

import java.util.List;

public record PersonFilmography(
        Integer personId,
        String name,
        String profileUrl,
        String knownFor,
        List<MovieSearchResult> credits
) {}
