package com.ottfinder.dto.response;

import java.util.List;

public record ShelvesResult(
        List<MovieSearchResult> topRatedNetflix,
        List<MovieSearchResult> hiddenGems,
        List<MovieSearchResult> newArrivals,
        List<MovieSearchResult> leavingSoon,
        List<MovieSearchResult> forYou
) {}
