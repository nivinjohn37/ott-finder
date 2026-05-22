package com.ottfinder.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.ottfinder.dto.response.AdminStats;
import com.ottfinder.dto.response.AdminUserDto;
import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.MovieAvailability;
import com.ottfinder.entity.OttPlatform;
import com.ottfinder.entity.User;
import com.ottfinder.repository.MovieAvailabilityRepository;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.OttPlatformRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchlistRepository;
import com.ottfinder.security.FirebasePrincipal;
import com.ottfinder.service.MovieSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final MovieSearchService movieSearchService;
    private final StringRedisTemplate redisTemplate;
    private final com.ottfinder.repository.ReviewRepository reviewRepository;

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
                ottPlatformRepository.count()
        )));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserDto>>> getUsers(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (!isAdmin(principal)) {
            return ResponseEntity.status(403).body(ApiResponse.error("FORBIDDEN", "Admin access required"));
        }
        List<AdminUserDto> users = userRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(com.ottfinder.entity.User::getCreatedAt,
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

        // Ensure movie is in DB — fetch from TMDB if missing
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

        // Disable/enable account in Firebase and revoke tokens when blacklisting
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

        // Keep a fast-lookup key in Redis so the auth filter can reject existing tokens immediately
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
