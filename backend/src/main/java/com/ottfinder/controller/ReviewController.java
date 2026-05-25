package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.ReviewDto;
import com.ottfinder.dto.response.ReviewsResponse;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.Review;
import com.ottfinder.entity.User;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.ReviewRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.security.FirebasePrincipal;
import com.ottfinder.service.BadgeCheckEvent;
import com.ottfinder.service.MovieSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

@RestController
@RequestMapping("/api/movies/{tmdbId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final MovieSearchService movieSearchService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public record ReviewRequest(int rating, String note) {}

    private static final int PAGE_SIZE = 10;

    @GetMapping
    public ResponseEntity<ApiResponse<ReviewsResponse>> getReviews(
            @PathVariable Integer tmdbId,
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestParam(defaultValue = "0") int page) {

        Page<Review> reviewPage = reviewRepository.findByMovieTmdbIdPaged(
                tmdbId, PageRequest.of(page, PAGE_SIZE));

        List<Object[]> agg = reviewRepository.getAggregateByMovieTmdbId(tmdbId);
        long count = agg.isEmpty() ? 0L : ((Number) agg.get(0)[0]).longValue();
        double avg = agg.isEmpty() ? 0.0 : ((Number) agg.get(0)[1]).doubleValue();

        String currentUid = principal != null ? principal.uid() : null;
        List<ReviewDto> dtos = reviewPage.getContent().stream()
                .map(r -> toDto(r, currentUid))
                .toList();

        ReviewDto myReview = page == 0
                ? dtos.stream().filter(ReviewDto::isOwn).findFirst().orElse(null)
                : null;

        return ResponseEntity.ok(ApiResponse.success(
                new ReviewsResponse(count, avg, myReview, dtos, !reviewPage.isLast())));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<ReviewDto>> upsertReview(
            @PathVariable Integer tmdbId,
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody ReviewRequest body) {

        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Login required"));
        }
        if (body.rating() < 1 || body.rating() > 5) {
            return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", "Rating must be 1–5"));
        }

        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Ensure movie is in DB
        if (!movieRepository.existsByTmdbId(tmdbId)) {
            try { movieSearchService.getMovieDetail(tmdbId, "movie"); } catch (Exception ignored) {}
        }
        Movie movie = movieRepository.findByTmdbId(tmdbId)
                .orElse(null);
        if (movie == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("MOVIE_NOT_FOUND", "Movie not found"));
        }

        Review review = reviewRepository.findByMovieTmdbIdAndUserUid(tmdbId, principal.uid())
                .map(existing -> {
                    existing.setRating((short) body.rating());
                    existing.setNote(body.note());
                    return existing;
                })
                .orElseGet(() -> Review.builder()
                        .user(user)
                        .movie(movie)
                        .rating((short) body.rating())
                        .note(body.note())
                        .build());

        reviewRepository.save(review);
        eventPublisher.publishEvent(new BadgeCheckEvent(user.getId()));
        return ResponseEntity.ok(ApiResponse.success(toDto(review, principal.uid())));
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Integer tmdbId,
            @AuthenticationPrincipal FirebasePrincipal principal) {

        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Login required"));
        }

        reviewRepository.findByMovieTmdbIdAndUserUid(tmdbId, principal.uid())
                .ifPresent(reviewRepository::delete);

        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private ReviewDto toDto(Review r, String currentUid) {
        return new ReviewDto(
                r.getId(),
                r.getUser().getDisplayName() != null ? r.getUser().getDisplayName() : "Anonymous",
                null,
                r.getRating(),
                r.getNote(),
                r.getCreatedAt(),
                r.getUser().getFirebaseUid().equals(currentUid)
        );
    }
}
