package com.ottfinder.service;

import com.ottfinder.dto.response.ReviewSummaryDto;
import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.repository.MovieRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class ReviewSummaryService {

    private final AiService aiService;
    private final TMDBService tmdbService;
    private final RedditService redditService;
    private final MovieRepository movieRepository;
    private final StringRedisTemplate redisTemplate;

    private static final Duration SUMMARY_TTL = Duration.ofHours(48);
    private static final int MIN_REVIEWS = 1;

    public ReviewSummaryService(AiService aiService,
                                 TMDBService tmdbService,
                                 RedditService redditService,
                                 MovieRepository movieRepository,
                                 StringRedisTemplate redisTemplate) {
        this.aiService = aiService;
        this.tmdbService = tmdbService;
        this.redditService = redditService;
        this.movieRepository = movieRepository;
        this.redisTemplate = redisTemplate;
    }

    public ReviewSummaryDto getSummary(int tmdbId, String mediaType, boolean spoilers, String titleHint) {
        if (!aiService.isAvailable()) {
            log.warn("AI service unavailable — ANTHROPIC_API_KEY not set");
            return null;
        }

        String cacheKey = "ai:review-summary:" + tmdbId + ":" + (spoilers ? "full" : "free");
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return new ReviewSummaryDto(cached, spoilers);
        }

        // Resolve title: frontend hint → DB → TMDB (in that order)
        String title = resolveTitle(tmdbId, mediaType, titleHint);
        if (title == null) {
            log.warn("Could not resolve title for tmdbId={}", tmdbId);
            return null;
        }

        List<String> tmdbReviews = tmdbService.getReviews(tmdbId, mediaType);
        List<String> redditReviews = redditService.getReviews(title, tmdbId);

        List<String> allReviews = new ArrayList<>();
        allReviews.addAll(tmdbReviews);
        allReviews.addAll(redditReviews);

        log.info("Generating summary for '{}' (tmdbId={}) — tmdb={} reddit={} reviews",
                title, tmdbId, tmdbReviews.size(), redditReviews.size());

        if (allReviews.size() < MIN_REVIEWS) {
            log.debug("No reviews found for tmdbId={}", tmdbId);
            return null;
        }

        String summary = aiService.reviewSummary(title, allReviews, spoilers);
        if (summary == null) return null;

        redisTemplate.opsForValue().set(cacheKey, summary, SUMMARY_TTL);
        return new ReviewSummaryDto(summary, spoilers);
    }

    private String resolveTitle(int tmdbId, String mediaType, String titleHint) {
        if (titleHint != null && !titleHint.isBlank()) return titleHint;

        String fromDb = movieRepository.findByTmdbId(tmdbId).map(m -> m.getTitle()).orElse(null);
        if (fromDb != null) return fromDb;

        // Fallback: fetch from TMDB (only if movie not in our DB yet)
        try {
            MovieDetail detail = tmdbService.getDetails(tmdbId, mediaType);
            return detail != null ? detail.title() : null;
        } catch (Exception ex) {
            log.warn("TMDB title fallback failed for tmdbId={}: {}", tmdbId, ex.getMessage());
            return null;
        }
    }
}
