package com.ottfinder.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.ottfinder.dto.response.AdminContentStats;
import com.ottfinder.dto.response.AdminReviewDto;
import com.ottfinder.dto.response.AdminStats;
import com.ottfinder.dto.response.AdminUserDto;
import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.MovieAvailability;
import com.ottfinder.entity.OttPlatform;
import com.ottfinder.entity.Review;
import com.ottfinder.entity.User;
import com.ottfinder.repository.MovieAvailabilityRepository;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.OttPlatformRepository;
import com.ottfinder.repository.ReviewRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchGroupRepository;
import com.ottfinder.repository.WatchlistRepository;
import com.ottfinder.security.FirebasePrincipal;
import com.ottfinder.service.MovieSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final WatchlistRepository watchlistRepository;
    private final MovieRepository movieRepository;
    private final OttPlatformRepository ottPlatformRepository;
    private final MovieAvailabilityRepository movieAvailabilityRepository;
    private final ReviewRepository reviewRepository;
    private final WatchGroupRepository watchGroupRepository;
    private final MovieSearchService movieSearchService;
    private final StringRedisTemplate redisTemplate;

    private boolean isAdmin(FirebasePrincipal principal) {
        if (principal == null) return false;
        return userRepository.findByFirebaseUid(principal.uid())
                .map(u -> "admin".equals(u.getRole()))
                .orElse(false);
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStats>> getStats(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }
        return ResponseEntity.ok(ApiResponse.success(new AdminStats(
                userRepository.count(),
                watchlistRepository.count(),
                movieRepository.count(),
                ottPlatformRepository.count(),
                reviewRepository.count(),
                watchGroupRepository.count()
        )));
    }

    @GetMapping("/content-stats")
    public ResponseEntity<ApiResponse<AdminContentStats>> getContentStats(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }

        List<AdminContentStats.TopReviewedMovie> topMovies = reviewRepository
                .findTopReviewedMovies(PageRequest.of(0, 10))
                .stream()
                .map(row -> new AdminContentStats.TopReviewedMovie(
                        (Integer) row[0],
                        (String) row[1],
                        (Long) row[2],
                        ((Double) row[3])
                ))
                .toList();

        List<AdminContentStats.RatingBucket> ratingDist = reviewRepository
                .findRatingDistribution()
                .stream()
                .map(row -> new AdminContentStats.RatingBucket(
                        ((Number) row[0]).intValue(),
                        (Long) row[1]
                ))
                .toList();

        List<AdminContentStats.PlatformCount> topPlatforms = movieAvailabilityRepository
                .findTopPlatformsByCount(PageRequest.of(0, 7))
                .stream()
                .map(row -> new AdminContentStats.PlatformCount(
                        (String) row[0],
                        (Long) row[1]
                ))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(
                new AdminContentStats(topMovies, ratingDist, topPlatforms)));
    }

    @GetMapping("/reviews")
    public ResponseEntity<ApiResponse<AdminReviewsPage>> getReviews(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }

        Page<Review> reviewPage = reviewRepository.findAllWithUserAndMovie(PageRequest.of(page, size));
        List<AdminReviewDto> reviews = reviewPage.getContent().stream()
                .map(r -> new AdminReviewDto(
                        r.getId(),
                        r.getMovie().getTmdbId(),
                        r.getMovie().getTitle(),
                        r.getUser().getDisplayName() != null ? r.getUser().getDisplayName() : r.getUser().getEmail(),
                        r.getUser().getEmail(),
                        r.getRating(),
                        r.getNote(),
                        r.getCreatedAt()
                ))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(new AdminReviewsPage(
                reviews,
                reviewPage.getTotalElements(),
                reviewPage.getTotalPages(),
                page
        )));
    }

    public record AdminReviewsPage(
            List<AdminReviewDto> reviews,
            long totalElements,
            int totalPages,
            int page
    ) {}

    @DeleteMapping("/reviews/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @PathVariable Long id) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }

        if (!reviewRepository.existsById(id)) {
            return ResponseEntity.status(404).body(ApiResponse.error("NOT_FOUND", "Review not found"));
        }

        reviewRepository.deleteById(id);
        log.info("Admin {} deleted review id={}", principal.uid(), id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserDto>>> getUsers(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }
        List<AdminUserDto> users = userRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(User::getCreatedAt,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .map(u -> new AdminUserDto(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        u.getRole(),
                        u.getCreatedAt(),
                        watchlistRepository.countByUserId(u.getId()),
                        reviewRepository.countByUserId(u.getId()),
                        u.isBlacklisted()
                ))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/platforms")
    public ResponseEntity<ApiResponse<List<OttAvailability>>> getPlatforms(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }
        List<OttAvailability> platforms = ottPlatformRepository.findAll().stream()
                .map(p -> new OttAvailability(p.getName(), p.getDisplayName(), p.getLogoUrl(), null, null))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(platforms));
    }

    public record SeedRequest(
            Integer tmdbId,
            String mediaType,
            String platformName,
            String deepLink,
            String availableUntil
    ) {}

    @PostMapping("/availability")
    public ResponseEntity<ApiResponse<String>> seedAvailability(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody SeedRequest body) {

        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }

        OttPlatform platform = ottPlatformRepository.findByName(body.platformName()).orElse(null);
        if (platform == null) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.error("VALIDATION_ERROR", "Unknown platform: " + body.platformName()));
        }

        if (!movieRepository.existsByTmdbId(body.tmdbId())) {
            try {
                movieSearchService.getMovieDetail(body.tmdbId(), body.mediaType());
            } catch (Exception ex) {
                log.warn("TMDB fetch failed for tmdbId={}: {}", body.tmdbId(), ex.getMessage());
            }
        }

        Movie movie = movieRepository.findByTmdbId(body.tmdbId()).orElse(null);
        if (movie == null) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.error("MOVIE_NOT_FOUND", "Movie not found for tmdbId=" + body.tmdbId()));
        }

        OffsetDateTime expiry = null;
        if (body.availableUntil() != null && !body.availableUntil().isBlank()) {
            try {
                expiry = OffsetDateTime.parse(body.availableUntil() + "T00:00:00Z");
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body(
                        ApiResponse.error("VALIDATION_ERROR", "Invalid date. Use YYYY-MM-DD."));
            }
        }

        final OffsetDateTime finalExpiry = expiry;
        MovieAvailability availability = movieAvailabilityRepository
                .findByMovieIdAndPlatformId(movie.getId(), platform.getId())
                .map(existing -> {
                    existing.setDeepLink(body.deepLink());
                    existing.setAvailableUntil(finalExpiry);
                    existing.setLastVerifiedAt(OffsetDateTime.now());
                    return existing;
                })
                .orElseGet(() -> MovieAvailability.builder()
                        .movie(movie)
                        .platform(platform)
                        .deepLink(body.deepLink())
                        .availableUntil(finalExpiry)
                        .lastVerifiedAt(OffsetDateTime.now())
                        .build());

        movieAvailabilityRepository.save(availability);
        redisTemplate.delete("ott:availability:" + body.tmdbId());
        log.info("Admin seeded availability: tmdbId={} on platform={}", body.tmdbId(), body.platformName());

        return ResponseEntity.ok(ApiResponse.success(
                movie.getTitle() + " added to " + platform.getDisplayName()));
    }

    public record AvailabilityEntry(Long id, String platformName, String displayName, String deepLink, String availableUntil) {}

    @GetMapping("/availability/movie/{tmdbId}")
    public ResponseEntity<ApiResponse<List<AvailabilityEntry>>> getMovieAvailability(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @PathVariable Integer tmdbId) {

        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }

        List<AvailabilityEntry> entries = movieAvailabilityRepository
                .findByMovieTmdbId(tmdbId)
                .stream()
                .map(ma -> new AvailabilityEntry(
                        ma.getId(),
                        ma.getPlatform().getName(),
                        ma.getPlatform().getDisplayName(),
                        ma.getDeepLink(),
                        ma.getAvailableUntil() != null ? ma.getAvailableUntil().toString() : null))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(entries));
    }

    @DeleteMapping("/availability/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteAvailability(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @PathVariable Long id) {

        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }

        MovieAvailability entry = movieAvailabilityRepository.findById(id).orElse(null);
        if (entry == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("NOT_FOUND", "Availability entry not found"));
        }

        Integer tmdbId = entry.getMovie().getTmdbId();
        movieAvailabilityRepository.delete(entry);
        redisTemplate.delete("ott:availability:" + tmdbId);
        log.info("Admin deleted availability id={} for tmdbId={}", id, tmdbId);

        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PatchMapping("/users/{id}/blacklist")
    @Transactional
    public ResponseEntity<ApiResponse<String>> toggleBlacklist(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @PathVariable Long id) {

        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }

        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("NOT_FOUND", "User not found"));
        }
        if ("admin".equals(target.getRole())) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.error("VALIDATION_ERROR", "Cannot blacklist an admin account"));
        }

        target.setBlacklisted(!target.isBlacklisted());
        userRepository.save(target);

        try {
            FirebaseAuth.getInstance().updateUser(
                    new UserRecord.UpdateRequest(target.getFirebaseUid())
                            .setDisabled(target.isBlacklisted()));
            if (target.isBlacklisted()) {
                FirebaseAuth.getInstance().revokeRefreshTokens(target.getFirebaseUid());
            }
        } catch (FirebaseAuthException ex) {
            log.warn("Firebase status update failed for uid={}: {}", target.getFirebaseUid(), ex.getMessage());
        }

        String blacklistKey = "blacklist:" + target.getFirebaseUid();
        if (target.isBlacklisted()) {
            redisTemplate.opsForValue().set(blacklistKey, "1");
        } else {
            redisTemplate.delete(blacklistKey);
        }

        log.info("Admin {} {} user id={}", principal.uid(),
                target.isBlacklisted() ? "blacklisted" : "reinstated", id);
        return ResponseEntity.ok(ApiResponse.success(
                target.isBlacklisted() ? "User blacklisted" : "User reinstated"));
    }
}
