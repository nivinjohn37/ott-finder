package com.ottfinder.service;

import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.dto.response.WatchlistItem;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.User;
import com.ottfinder.entity.Watchlist;
import com.ottfinder.exception.MovieNotFoundException;
import com.ottfinder.exception.WatchlistLimitException;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchlistRepository;
import com.ottfinder.security.FirebasePrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;


@Service
@RequiredArgsConstructor
@Slf4j
public class WatchlistService {

    private static final int FREE_TIER_LIMIT = 5;

    @Value("${tmdb.image-base-url}")
    private String imageBaseUrl;

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final TMDBService tmdbService;
    private final OTTAvailabilityService ottAvailabilityService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<WatchlistItem> getWatchlist(FirebasePrincipal principal) {
        // Platform data lives in ott:availability:{tmdbId} (6h TTL, per-movie).
        // Baking platforms into a watchlist-level cache causes stale data when
        // JustWatch results change, so we skip the list-level cache entirely.
        User user = userRepository.findByFirebaseUid(principal.uid()).orElse(null);
        if (user == null) return Collections.emptyList();

        return watchlistRepository
                .findByUserIdWithMovie(user.getId())
                .stream()
                .map(this::toWatchlistItem)
                .toList();
    }

    @Transactional
    public WatchlistItem addToWatchlist(FirebasePrincipal principal, Integer tmdbId, String mediaType) {
        User user = getOrCreateUser(principal);

        if (watchlistRepository.countByUserId(user.getId()) >= FREE_TIER_LIMIT) {
            throw new WatchlistLimitException();
        }

        Movie movie = movieRepository.findByTmdbId(tmdbId)
                .orElseGet(() -> fetchAndSaveMovie(tmdbId, mediaType));

        if (movie.getGenres() == null) {
            backfillGenres(movie, mediaType);
        }

        Watchlist entry = watchlistRepository.save(
                Watchlist.builder().user(user).movie(movie).build()
        );

        invalidateCache(user.getId());
        eventPublisher.publishEvent(new BadgeCheckEvent(user.getId()));
        return toWatchlistItem(entry);
    }

    @Transactional
    public void removeFromWatchlist(FirebasePrincipal principal, Long watchlistId) {
        User user = getOrCreateUser(principal);
        Watchlist entry = watchlistRepository.findById(watchlistId)
                .filter(w -> w.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new MovieNotFoundException(-1));

        watchlistRepository.delete(entry);
        invalidateCache(user.getId());
    }

    public WatchlistItem toggleWatched(FirebasePrincipal principal, Long watchlistId) {
        User user = getOrCreateUser(principal);
        Watchlist entry = watchlistRepository.findById(watchlistId)
                .filter(w -> w.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new MovieNotFoundException(-1));

        entry.setWatchedAt(entry.getWatchedAt() == null ? OffsetDateTime.now() : null);
        watchlistRepository.save(entry);
        invalidateCache(user.getId());
        eventPublisher.publishEvent(new BadgeCheckEvent(user.getId()));
        return toWatchlistItem(entry);
    }

    @Transactional(readOnly = true)
    public List<WatchlistItem> getExpiring(FirebasePrincipal principal) {
        User user = userRepository.findByFirebaseUid(principal.uid()).orElse(null);
        if (user == null) return Collections.emptyList();
        OffsetDateTime cutoff = OffsetDateTime.now().plusDays(7);
        return watchlistRepository
                .findExpiringByUserId(user.getId(), cutoff)
                .stream()
                .map(this::toWatchlistItem)
                .toList();
    }

    private User getOrCreateUser(FirebasePrincipal principal) {
        return userRepository.findByFirebaseUid(principal.uid())
                .orElseGet(() -> userRepository.save(User.builder()
                        .firebaseUid(principal.uid())
                        .email(principal.email() != null
                                ? principal.email()
                                : principal.uid() + "@firebase.local")
                        .displayName(principal.displayName())
                        .build()));
    }

    private void backfillGenres(Movie movie, String mediaType) {
        try {
            String resolvedType = "tv".equals(mediaType) ? "tv" : "movie";
            var detail = tmdbService.getDetails(movie.getTmdbId(), resolvedType);
            if (detail == null) detail = tmdbService.getDetails(movie.getTmdbId(),
                    "tv".equals(resolvedType) ? "movie" : "tv");
            if (detail != null && detail.genres() != null && !detail.genres().isEmpty()) {
                movie.setGenres(String.join(",", detail.genres()));
                movieRepository.save(movie);
            }
        } catch (Exception ex) {
            log.warn("Genre backfill failed for tmdbId={}: {}", movie.getTmdbId(), ex.getMessage());
        }
    }

    private Movie fetchAndSaveMovie(Integer tmdbId, String mediaType) {
        String resolvedType = "tv".equals(mediaType) ? "tv" : "movie";
        var detail = tmdbService.getDetails(tmdbId, resolvedType);
        if (detail == null && "movie".equals(resolvedType)) {
            detail = tmdbService.getDetails(tmdbId, "tv");
            resolvedType = "tv";
        }
        if (detail == null) throw new MovieNotFoundException(tmdbId);

        String type = resolvedType;
        var d = detail;
        return movieRepository.save(Movie.builder()
                .tmdbId(tmdbId)
                .title(d.title())
                .posterPath(extractPath(d.posterUrl()))
                .backdropPath(extractPath(d.backdropUrl()))
                .overview(d.overview())
                .releaseDate(parseDate(d.releaseDate()))
                .voteAverage(d.voteAverage() != null ? BigDecimal.valueOf(d.voteAverage()) : null)
                .voteCount(d.voteCount())
                .mediaType(type)
                .genres(d.genres() != null && !d.genres().isEmpty()
                        ? String.join(",", d.genres()) : null)
                .build());
    }

    private WatchlistItem toWatchlistItem(Watchlist w) {
        Movie m = w.getMovie();
        // Use OTTAvailabilityService (Redis-first → JustWatch fallback) so the
        // watchlist shows the same platforms as the movie detail page.
        List<OttAvailability> platforms = ottAvailabilityService
                .findAvailability(m.getTmdbId(), m.getMediaType(), m.getTitle());

        List<OttAvailability> expiring = platforms.stream()
                .filter(p -> p.availableUntil() != null)
                .filter(p -> {
                    try {
                        return OffsetDateTime.parse(p.availableUntil())
                                .isBefore(OffsetDateTime.now().plusDays(7));
                    } catch (Exception ex) {
                        return false;
                    }
                })
                .toList();

        MovieSearchResult movie = new MovieSearchResult(
                m.getTmdbId(), m.getTitle(),
                m.getPosterPath() != null ? imageBaseUrl + m.getPosterPath() : null,
                m.getBackdropPath() != null ? imageBaseUrl + m.getBackdropPath() : null,
                m.getOverview(),
                m.getReleaseDate() != null ? m.getReleaseDate().toString() : null,
                m.getMediaType(),
                m.getVoteAverage() != null ? m.getVoteAverage().doubleValue() : null,
                platforms
        );

        return new WatchlistItem(
                w.getId(), movie,
                w.getAddedAt() != null ? w.getAddedAt().toString() : null,
                w.getWatchedAt() != null ? w.getWatchedAt().toString() : null,
                expiring
        );
    }

    private void invalidateCache(Long userId) {
        // watchlist:user:{userId} list cache removed — platform data is served
        // from per-movie ott:availability:{tmdbId} keys (6h TTL, always fresh).
        // This method is kept as a no-op so call sites need no changes.
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
