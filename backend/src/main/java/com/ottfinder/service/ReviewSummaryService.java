package com.ottfinder.service;

import com.ottfinder.dto.response.ReviewSummaryDto;
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

    public ReviewSummaryDto getSummary(int tmdbId, String mediaType, boolean spoilers) {
        if (!aiService.isAvailable()) return null;

        String cacheKey = "ai:review-summary:" + tmdbId + ":" + (spoilers ? "full" : "free");
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return new ReviewSummaryDto(cached, spoilers);
        }

        String title = movieRepository.findByTmdbId(tmdbId)
                .map(m -> m.getTitle())
                .orElse(null);

        if (title == null) return null;

        List<String> tmdbReviews = tmdbService.getReviews(tmdbId, mediaType);
        List<String> redditReviews = redditService.getReviews(title, tmdbId);

        List<String> allReviews = new ArrayList<>();
        allReviews.addAll(tmdbReviews);
        allReviews.addAll(redditReviews);

        if (allReviews.size() < MIN_REVIEWS) {
            log.debug("No reviews found for tmdbId={} (tmdb={}, reddit={})", tmdbId,
                    tmdbReviews.size(), redditReviews.size());
            return null;
        }

        String summary = aiService.reviewSummary(title, allReviews, spoilers);
        if (summary == null) return null;

        redisTemplate.opsForValue().set(cacheKey, summary, SUMMARY_TTL);
        return new ReviewSummaryDto(summary, spoilers);
    }
}
