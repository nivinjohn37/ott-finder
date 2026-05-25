package com.ottfinder.service;

import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.dto.response.PersonFilmography;
import com.ottfinder.entity.Movie;
import com.ottfinder.exception.MovieNotFoundException;
import com.ottfinder.repository.MovieRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Executor;

@Service
@Slf4j
public class MovieSearchService {

    private final TMDBService tmdbService;
    private final OTTAvailabilityService ottService;
    private final MovieRepository movieRepository;
    private final Executor apiCallExecutor;

    public MovieSearchService(TMDBService tmdbService,
                               OTTAvailabilityService ottService,
                               MovieRepository movieRepository,
                               @Qualifier("apiCallExecutor") Executor apiCallExecutor) {
        this.tmdbService = tmdbService;
        this.ottService = ottService;
        this.movieRepository = movieRepository;
        this.apiCallExecutor = apiCallExecutor;
    }

    public List<MovieSearchResult> search(String query) {
        List<MovieSearchResult> tmdbResults = tmdbService.search(query);
        if (tmdbResults.isEmpty()) return Collections.emptyList();

        // Persist new movies to DB in the background — don't block search response
        CompletableFuture.runAsync(() -> persistNewMovies(tmdbResults), apiCallExecutor);

        // Parallel OTT availability for each result
        record Pair(CompletableFuture<List<OttAvailability>> future, MovieSearchResult tmdb) {}

        List<Pair> pairs = tmdbResults.stream()
                .map(movie -> new Pair(
                        CompletableFuture
                                .supplyAsync(() -> ottService.findAvailability(
                                        movie.tmdbId(), movie.mediaType(), movie.title()),
                                        apiCallExecutor)
                                .exceptionally(ex -> Collections.emptyList()),
                        movie
                ))
                .toList();

        CompletableFuture<Void> allOf = CompletableFuture.allOf(
                pairs.stream().map(p -> p.future()).toArray(CompletableFuture[]::new));
        try {
            allOf.orTimeout(5, java.util.concurrent.TimeUnit.SECONDS).join();
        } catch (CompletionException ex) {
            log.warn("OTT lookup timed out for query='{}' — returning partial results", query);
        }

        return pairs.stream()
                .map(p -> withPlatforms(p.tmdb(), p.future().isDone()
                        ? safeGet(p.future(), Collections.emptyList())
                        : Collections.emptyList()))
                .filter(Objects::nonNull)
                .toList();
    }

    public MovieDetail getMovieDetail(Integer tmdbId, String mediaType) {
        String resolvedType = (mediaType != null && "tv".equals(mediaType)) ? "tv" : "movie";

        MovieDetail detail = tmdbService.getDetails(tmdbId, resolvedType);

        // Try the other type if first attempt returned nothing (e.g. caller passed wrong type)
        if (detail == null && "movie".equals(resolvedType)) {
            detail = tmdbService.getDetails(tmdbId, "tv");
            resolvedType = "tv";
        }

        if (detail == null) throw new MovieNotFoundException(tmdbId);

        // Persist genres to DB so stats endpoint can aggregate them
        if (detail.genres() != null && !detail.genres().isEmpty()) {
            persistGenres(tmdbId, detail);
        }

        String title = detail.title();
        String type = resolvedType;
        List<OttAvailability> platforms = ottService.findAvailability(tmdbId, type, title);

        return new MovieDetail(
                detail.tmdbId(), detail.title(), detail.posterUrl(), detail.backdropUrl(),
                detail.overview(), detail.releaseDate(), detail.mediaType(),
                detail.voteAverage(), detail.voteCount(), platforms, detail.trailerKey(),
                detail.tagline(), detail.runtime(), detail.genres(), detail.cast()
        );
    }

    public PersonFilmography getPersonFilmography(Integer personId) {
        return tmdbService.getPersonFilmography(personId);
    }

    public List<MovieSearchResult> getGenreMovies(String genreName, String mediaType) {
        return tmdbService.getGenreMovies(genreName, mediaType);
    }

    public List<MovieSearchResult> getTrending() {
        List<MovieSearchResult> trending = tmdbService.getTrending();
        CompletableFuture.runAsync(() -> persistNewMovies(trending), apiCallExecutor);
        return trending;
    }

    private void persistGenres(Integer tmdbId, MovieDetail detail) {
        try {
            movieRepository.findByTmdbId(tmdbId).ifPresent(movie -> {
                if (movie.getGenres() == null || movie.getGenres().isBlank()) {
                    String genresStr = String.join(",", detail.genres());
                    movie.setGenres(genresStr);
                    movieRepository.save(movie);
                }
            });
        } catch (Exception ex) {
            log.debug("Genre persist skipped for tmdbId={}: {}", tmdbId, ex.getMessage());
        }
    }

    private void persistNewMovies(List<MovieSearchResult> results) {
        results.forEach(r -> {
            try {
                if (!movieRepository.existsByTmdbId(r.tmdbId())) {
                    movieRepository.save(Movie.builder()
                            .tmdbId(r.tmdbId())
                            .title(r.title())
                            .posterPath(extractPath(r.posterUrl()))
                            .overview(r.overview())
                            .releaseDate(parseDate(r.releaseDate()))
                            .voteAverage(r.voteAverage() != null
                                    ? BigDecimal.valueOf(r.voteAverage()) : null)
                            .mediaType(r.mediaType())
                            .build());
                }
            } catch (Exception ex) {
                // Swallow — concurrent insert race is harmless due to unique constraint
                log.debug("Movie persist skipped for tmdbId={}: {}", r.tmdbId(), ex.getMessage());
            }
        });
    }

    private MovieSearchResult withPlatforms(MovieSearchResult movie, List<OttAvailability> platforms) {
        return new MovieSearchResult(
                movie.tmdbId(), movie.title(), movie.posterUrl(), movie.backdropUrl(),
                movie.overview(), movie.releaseDate(), movie.mediaType(),
                movie.voteAverage(), platforms
        );
    }

    private <T> T safeGet(CompletableFuture<T> future, T fallback) {
        try {
            return future.getNow(fallback);
        } catch (Exception ex) {
            return fallback;
        }
    }

    private String extractPath(String imageUrl) {
        if (imageUrl == null) return null;
        int idx = imageUrl.lastIndexOf("/t/p/w500");
        return idx >= 0 ? imageUrl.substring(idx + 9) : imageUrl;
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) return null;
        try {
            return LocalDate.parse(date);
        } catch (Exception ex) {
            return null;
        }
    }
}
