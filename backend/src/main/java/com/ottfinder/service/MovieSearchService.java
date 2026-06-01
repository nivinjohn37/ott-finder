package com.ottfinder.service;

import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.dto.response.PersonFilmography;
import com.ottfinder.dto.response.ShelvesResult;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.MovieAvailability;
import com.ottfinder.entity.OttPlatform;
import com.ottfinder.entity.UserPreference;
import com.ottfinder.exception.MovieNotFoundException;
import com.ottfinder.repository.MovieAvailabilityRepository;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.OttPlatformRepository;
import com.ottfinder.repository.UserPreferenceRepository;
import com.ottfinder.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MovieSearchService {

    private final TMDBService tmdbService;
    private final OTTAvailabilityService ottService;
    private final MovieRepository movieRepository;
    private final MovieAvailabilityRepository movieAvailabilityRepository;
    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final OttPlatformRepository ottPlatformRepository;
    private final Executor apiCallExecutor;

    public MovieSearchService(TMDBService tmdbService,
                               OTTAvailabilityService ottService,
                               MovieRepository movieRepository,
                               MovieAvailabilityRepository movieAvailabilityRepository,
                               UserRepository userRepository,
                               UserPreferenceRepository userPreferenceRepository,
                               OttPlatformRepository ottPlatformRepository,
                               @Qualifier("apiCallExecutor") Executor apiCallExecutor) {
        this.tmdbService = tmdbService;
        this.ottService = ottService;
        this.movieRepository = movieRepository;
        this.movieAvailabilityRepository = movieAvailabilityRepository;
        this.userRepository = userRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.ottPlatformRepository = ottPlatformRepository;
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
                detail.tagline(), detail.runtime(), detail.genres(), detail.cast(), detail.crew()
        );
    }

    public PersonFilmography getPersonFilmography(Integer personId) {
        return tmdbService.getPersonFilmography(personId);
    }

    public List<MovieSearchResult> getGenreMovies(String genreName, String mediaType) {
        return tmdbService.getGenreMovies(genreName, mediaType);
    }

    public List<MovieSearchResult> getTrending(String region, String language) {
        List<MovieSearchResult> trending = tmdbService.getTrending(region, language);
        CompletableFuture.runAsync(() -> persistNewMovies(trending), apiCallExecutor);
        return trending;
    }

    public ShelvesResult getShelves(String firebaseUid) {
        // 3 TMDB discover calls in parallel
        CompletableFuture<List<MovieSearchResult>> netflixFuture = CompletableFuture
                .supplyAsync(() -> tmdbService.discoverByFilters(
                        "movie", "vote_average.desc", "8", null, 7.0, 500, null), apiCallExecutor)
                .exceptionally(ex -> Collections.emptyList());

        CompletableFuture<List<MovieSearchResult>> gemsFuture = CompletableFuture
                .supplyAsync(() -> tmdbService.discoverByFilters(
                        "movie", "vote_average.desc", null, null, 7.5, 50, 1500), apiCallExecutor)
                .exceptionally(ex -> Collections.emptyList());

        CompletableFuture<List<MovieSearchResult>> arrivalsFuture = CompletableFuture
                .supplyAsync(() -> tmdbService.discoverByFilters(
                        "movie", "primary_release_date.desc", "8|9|122|158|232", null, null, 10, null), apiCallExecutor)
                .exceptionally(ex -> Collections.emptyList());

        // DB query for leaving soon (no external call)
        List<MovieAvailability> leaving = movieAvailabilityRepository.findLeavingSoon(
                OffsetDateTime.now(), OffsetDateTime.now().plusDays(30));
        List<MovieSearchResult> leavingSoon = mapLeavingSoon(leaving);

        // For You (requires user preferences)
        List<MovieSearchResult> forYou = Collections.emptyList();
        if (firebaseUid != null) {
            forYou = buildForYouShelf(firebaseUid);
        }

        try {
            CompletableFuture.allOf(netflixFuture, gemsFuture, arrivalsFuture)
                    .orTimeout(5, java.util.concurrent.TimeUnit.SECONDS)
                    .join();
        } catch (CompletionException ex) {
            log.warn("Shelves TMDB calls timed out — returning partial data");
        }

        return new ShelvesResult(
                netflixFuture.getNow(Collections.emptyList()).stream().limit(12).toList(),
                gemsFuture.getNow(Collections.emptyList()).stream().limit(12).toList(),
                arrivalsFuture.getNow(Collections.emptyList()).stream().limit(12).toList(),
                leavingSoon.stream().limit(12).toList(),
                forYou.stream().limit(12).toList()
        );
    }

    private List<MovieSearchResult> buildForYouShelf(String firebaseUid) {
        try {
            return userRepository.findByFirebaseUid(firebaseUid).map(user -> {
                List<UserPreference> prefs = userPreferenceRepository.findByUserId(user.getId());
                if (prefs.isEmpty()) return Collections.<MovieSearchResult>emptyList();

                String genreIdsStr = prefs.stream()
                        .filter(p -> "genre".equals(p.getPreferenceType()))
                        .map(UserPreference::getValue)
                        .map(tmdbService::getGenreIdForName)
                        .filter(Objects::nonNull)
                        .map(String::valueOf)
                        .collect(Collectors.joining(","));

                String providerIdsStr = prefs.stream()
                        .filter(p -> "platform".equals(p.getPreferenceType()))
                        .map(UserPreference::getValue)
                        .map(name -> ottPlatformRepository.findByName(name)
                                .map(OttPlatform::getJustwatchProviderId)
                                .orElse(null))
                        .filter(Objects::nonNull)
                        .map(String::valueOf)
                        .collect(Collectors.joining("|"));

                if (genreIdsStr.isEmpty() && providerIdsStr.isEmpty()) {
                    return Collections.<MovieSearchResult>emptyList();
                }

                return tmdbService.discoverByFilters(
                        "movie", "popularity.desc",
                        providerIdsStr.isEmpty() ? null : providerIdsStr,
                        genreIdsStr.isEmpty() ? null : genreIdsStr,
                        null, 20, null
                );
            }).orElse(Collections.emptyList());
        } catch (Exception ex) {
            log.warn("For You shelf failed for uid={}: {}", firebaseUid, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<MovieSearchResult> mapLeavingSoon(List<MovieAvailability> leaving) {
        Map<Integer, List<MovieAvailability>> byMovie = leaving.stream()
                .collect(Collectors.groupingBy(ma -> ma.getMovie().getTmdbId()));

        return byMovie.values().stream()
                .map(maList -> {
                    Movie movie = maList.get(0).getMovie();
                    List<OttAvailability> platforms = maList.stream()
                            .map(ma -> new OttAvailability(
                                    ma.getPlatform().getName(),
                                    ma.getPlatform().getDisplayName(),
                                    ma.getPlatform().getLogoUrl(),
                                    ma.getDeepLink() != null ? ma.getDeepLink() : "",
                                    ma.getAvailableUntil() != null ? ma.getAvailableUntil().toString() : null
                            ))
                            .toList();
                    return new MovieSearchResult(
                            movie.getTmdbId(),
                            movie.getTitle(),
                            tmdbService.buildImageUrl(movie.getPosterPath()),
                            tmdbService.buildImageUrl(movie.getBackdropPath()),
                            movie.getOverview(),
                            movie.getReleaseDate() != null ? movie.getReleaseDate().toString() : null,
                            movie.getMediaType(),
                            movie.getVoteAverage() != null ? movie.getVoteAverage().doubleValue() : null,
                            platforms
                    );
                })
                .toList();
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
