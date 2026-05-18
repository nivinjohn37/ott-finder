package com.ottfinder.exception;

public class MovieNotFoundException extends RuntimeException {
    public MovieNotFoundException(Integer tmdbId) {
        super("Movie with TMDB ID " + tmdbId + " not found");
    }
}
