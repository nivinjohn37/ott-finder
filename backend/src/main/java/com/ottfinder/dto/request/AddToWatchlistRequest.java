package com.ottfinder.dto.request;

import jakarta.validation.constraints.NotNull;

public record AddToWatchlistRequest(
        @NotNull(message = "movieId is required") Integer movieId,
        String mediaType  // "movie" or "tv" — defaults to "movie" if omitted
) {
    public String resolvedMediaType() {
        return (mediaType != null && "tv".equals(mediaType)) ? "tv" : "movie";
    }
}
