package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.dto.response.WatchlistItem;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.User;
import com.ottfinder.entity.Watchlist;
import com.ottfinder.exception.MovieNotFoundException;
import com.ottfinder.exception.WatchlistLimitException;
import com.ottfinder.repository.MovieAvailabilityRepository;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchlistRepository;
import com.ottfinder.security.FirebasePrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WatchlistService {

    private static final int FREE_TIER_LIMIT = 3;
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    @Value("${tmdb.image-base-url}")
    private String imageBaseUrl;

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final MovieAvailabilityRepository availabilityRepository;
    private final TMDBService tmdbService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<WatchlistItem> getWatchlist(FirebasePrincipal principal) {
        // Look up only — don't create user in a read-only transaction
        User user = userRepository.findByFirebaseUid(principal.uid()).orElse(null);
        if (user == null) return Collections.emptyList();
        String cacheKey = "watchlist:user:" + user.getId();

        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached);
        }

        List<WatchlistItem> items = watchlistRepository
                .findByUserIdWithMovie(user.getId())
                .stream()
                .map(this::toWatchlistItem)
                .toList();

        cache(cacheKey, items);
        return items;
    }

    @Transactional
    public WatchlistItem addToWatchlist(FirebasePrincipal principal, Integer tmdbId, String mediaType) {
        User user = getOrCreateUser(principal);

        if (watchlistRepository.countByUserId(user.getId()) >= FREE_TIER_LIMIT) {
            throw new WatchlistLimitException();
        }

        Movie movie = movieRepository.findByTmdbId(tmdbId)
                .orElseGet(() -> fetchAndSaveMovie(tmdbId, mediaType));

        Watchlist entry = watchlistRepository.save(
                Watchlist.builder().user(user).movie(movie).build()
        );

        invalidateCache(user.getId());
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
                .build());
    }

    private WatchlistItem toWatchlistItem(Watchlist w) {
        Movie m = w.getMovie();
        List<OttAvailability> platforms = availabilityRepository
                .findByMovieIdWithPlatform(m.getId())
                .stream()
                .map(ma -> new OttAvailability(
                        ma.getPlatform().getName(),
                        ma.getPlatform().getDisplayName(),
                        ma.getPlatform().getLogoUrl(),
                        ma.getDeepLink(),
                        ma.getAvailableUntil() != null ? ma.getAvailableUntil().toString() : null
                ))
                .toList();

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
                expiring
        );
    }

    private void cache(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), CACHE_TTL);
        } catch (Exception ex) {
            log.warn("Redis cache write failed for key={}: {}", key, ex.getMessage());
        }
    }

    private void invalidateCache(Long userId) {
        redisTemplate.delete("watchlist:user:" + userId);
    }

    private List<WatchlistItem> deserializeList(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            log.warn("Watchlist cache deserialization failed: {}", ex.getMessage());
            return Collections.emptyList();
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
