package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.ReviewDto;
import com.ottfinder.dto.response.ReviewsResponse;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.Review;
import com.ottfinder.entity.ReviewLike;
import com.ottfinder.entity.User;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.ReviewLikeRepository;
import com.ottfinder.repository.ReviewRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.security.FirebasePrincipal;
import com.ottfinder.service.BadgeCheckEvent;
import com.ottfinder.service.MovieSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/movies/{tmdbId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final ReviewLikeRepository reviewLikeRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final MovieSearchService movieSearchService;
    private final ApplicationEventPublisher eventPublisher;

    public record ReviewRequest(int rating, String note) {}
    public record LikeResult(boolean liked, long likeCount) {}

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
        List<ReviewDto> dtos = enrichAndMap(reviewPage.getContent(), currentUid);

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

        if (!movieRepository.existsByTmdbId(tmdbId)) {
            try { movieSearchService.getMovieDetail(tmdbId, "movie"); } catch (Exception ignored) {}
        }
        Movie movie = movieRepository.findByTmdbId(tmdbId).orElse(null);
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

        long likeCount = reviewLikeRepository.countByReviewId(review.getId());
        ReviewDto dto = toDto(review, principal.uid(), likeCount, false);
        return ResponseEntity.ok(ApiResponse.success(dto));
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

    @PostMapping("/{reviewId}/like")
    @Transactional
    public ResponseEntity<ApiResponse<LikeResult>> toggleLike(
            @PathVariable Integer tmdbId,
            @PathVariable Long reviewId,
            @AuthenticationPrincipal FirebasePrincipal principal) {

        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Login required"));
        }

        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("NOT_FOUND", "Review not found"));
        }
        if (review.getUser().getFirebaseUid().equals(principal.uid())) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.error("VALIDATION_ERROR", "You cannot like your own review"));
        }

        boolean alreadyLiked = reviewLikeRepository.existsByReviewIdAndUserId(reviewId, user.getId());
        if (alreadyLiked) {
            reviewLikeRepository.deleteByReviewIdAndUserId(reviewId, user.getId());
        } else {
            reviewLikeRepository.save(ReviewLike.builder().review(review).user(user).build());
        }

        long newCount = reviewLikeRepository.countByReviewId(reviewId);
        return ResponseEntity.ok(ApiResponse.success(new LikeResult(!alreadyLiked, newCount)));
    }

    @PostMapping("/{reviewId}/report")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> reportReview(
            @PathVariable Integer tmdbId,
            @PathVariable Long reviewId,
            @AuthenticationPrincipal FirebasePrincipal principal) {

        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Login required"));
        }

        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("NOT_FOUND", "Review not found"));
        }
        if (review.getUser().getFirebaseUid().equals(principal.uid())) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.error("VALIDATION_ERROR", "You cannot report your own review"));
        }

        review.setReportCount(review.getReportCount() + 1);
        reviewRepository.save(review);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private List<ReviewDto> enrichAndMap(List<Review> reviews, String currentUid) {
        if (reviews.isEmpty()) return Collections.emptyList();

        List<Long> ids = reviews.stream().map(Review::getId).toList();

        Map<Long, Long> likeCounts = reviewLikeRepository.countLikesByReviewIds(ids)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        Set<Long> likedByMe = Collections.emptySet();
        if (currentUid != null) {
            User currentUser = userRepository.findByFirebaseUid(currentUid).orElse(null);
            if (currentUser != null) {
                likedByMe = new HashSet<>(reviewLikeRepository.findLikedReviewIds(ids, currentUser.getId()));
            }
        }

        final Set<Long> finalLiked = likedByMe;
        return reviews.stream()
                .map(r -> toDto(r, currentUid, likeCounts.getOrDefault(r.getId(), 0L), finalLiked.contains(r.getId())))
                .toList();
    }

    private ReviewDto toDto(Review r, String currentUid, long likeCount, boolean isLikedByMe) {
        return new ReviewDto(
                r.getId(),
                r.getUser().getDisplayName() != null ? r.getUser().getDisplayName() : "Anonymous",
                null,
                r.getRating(),
                r.getNote(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                currentUid != null && r.getUser().getFirebaseUid().equals(currentUid),
                likeCount,
                isLikedByMe,
                r.getReportCount()
        );
    }
}
