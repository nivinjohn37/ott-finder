package com.ottfinder.service;

import com.ottfinder.dto.response.ReviewSummaryDto;
import com.ottfinder.entity.Review;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.ReviewRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ReviewSummaryService {

    private final AiService aiService;
    private final TMDBService tmdbService;
    private final ReviewRepository reviewRepository;
    private final MovieRepository movieRepository;
    private final StringRedisTemplate redisTemplate;

    private static final Duration SUMMARY_TTL = Duration.ofHours(48);
    private static final int MIN_REVIEWS = 3;

    public ReviewSummaryService(AiService aiService,
                                 TMDBService tmdbService,
                                 ReviewRepository reviewRepository,
                                 MovieRepository movieRepository,
                                 StringRedisTemplate redisTemplate) {
        this.aiService = aiService;
        this.tmdbService = tmdbService;
        this.reviewRepository = reviewRepository;
        this.movieRepository = movieRepository;
        this.redisTemplate = redisTemplate;
    }

    public ReviewSummaryDto getSummary(int tmdbId, String mediaType, boolean spoilers) {
        if (!aiService.isAvailable()) return null;

        String cacheKey = "ai:review-summary:" + tmdbId + ":" + (spoilers ? "full" : "free");
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return new ReviewSummaryDto(cached, spoilers);
        }

        List<String> tmdbReviews = tmdbService.getReviews(tmdbId, mediaType);

        List<String> ownReviews = reviewRepository.findByMovieTmdbId(tmdbId).stream()
                .filter(r -> r.getNote() != null && !r.getNote().isBlank())
                .map(Review::getNote)
                .collect(Collectors.toList());

        List<String> allReviews = new ArrayList<>();
        allReviews.addAll(tmdbReviews);
        allReviews.addAll(ownReviews);

        if (allReviews.size() < MIN_REVIEWS) {
            log.debug("Not enough reviews for tmdbId={} (have {}, need {})", tmdbId, allReviews.size(), MIN_REVIEWS);
            return null;
        }

        String title = movieRepository.findByTmdbId(tmdbId)
                .map(m -> m.getTitle())
                .orElse("this movie");

        String summary = aiService.reviewSummary(title, allReviews, spoilers);
        if (summary == null) return null;

        redisTemplate.opsForValue().set(cacheKey, summary, SUMMARY_TTL);
        return new ReviewSummaryDto(summary, spoilers);
    }
}
