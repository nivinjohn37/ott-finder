package com.ottfinder.service;

import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.ReviewSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
@Slf4j
public class ReviewSummaryService {

    private final AiService aiService;
    private final TMDBService tmdbService;
    private final RedditService redditService;
    private final StringRedisTemplate redisTemplate;

    private static final Duration SUMMARY_TTL = Duration.ofHours(48);

    public ReviewSummaryService(AiService aiService,
                                 TMDBService tmdbService,
                                 RedditService redditService,
                                 StringRedisTemplate redisTemplate) {
        this.aiService = aiService;
        this.tmdbService = tmdbService;
        this.redditService = redditService;
        this.redisTemplate = redisTemplate;
    }

    public ReviewSummaryDto getSummary(int tmdbId, String mediaType, boolean spoilers, String titleHint) {
        if (!aiService.isAvailable()) {
            log.warn("Claude unavailable — ANTHROPIC_API_KEY missing or blank");
            return null;
        }

        String cacheKey = "ai:review-summary:" + tmdbId + ":" + (spoilers ? "full" : "free");
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return new ReviewSummaryDto(cached, spoilers);
        }

        // Fetch full movie metadata from TMDB (cached 24h by TMDBService)
        MovieDetail detail = tmdbService.getDetails(tmdbId, mediaType != null ? mediaType : "movie");
        if (detail == null && !"tv".equals(mediaType)) {
            detail = tmdbService.getDetails(tmdbId, "tv");
        }

        String title = detail != null ? detail.title() : titleHint;
        if (title == null || title.isBlank()) {
            log.warn("Could not resolve title for tmdbId={}", tmdbId);
            return null;
        }

        String overview  = detail != null ? detail.overview() : null;
        String genres    = detail != null && detail.genres() != null
                           ? String.join(", ", detail.genres()) : null;
        Double rating    = detail != null ? detail.voteAverage() : null;
        Integer votes    = detail != null ? detail.voteCount() : null;
        Integer year     = extractYear(detail);

        // TMDB written reviews + Reddit RSS posts — both supplementary to metadata
        List<String> tmdbReviews   = tmdbService.getReviews(tmdbId, mediaType != null ? mediaType : "movie");
        List<String> redditReviews = redditService.getReviews(title, tmdbId);

        List<String> reviews = new java.util.ArrayList<>();
        reviews.addAll(tmdbReviews);
        reviews.addAll(redditReviews);

        log.info("Generating summary for '{}' tmdbId={} — tmdb={} reddit={} reviews, rating={}/10",
                title, tmdbId, tmdbReviews.size(), redditReviews.size(), rating);

        String summary = aiService.summariseMovie(title, overview, genres, rating, votes, year, reviews, spoilers);
        if (summary == null) return null;

        redisTemplate.opsForValue().set(cacheKey, summary, SUMMARY_TTL);
        return new ReviewSummaryDto(summary, spoilers);
    }

    private Integer extractYear(MovieDetail detail) {
        if (detail == null || detail.releaseDate() == null || detail.releaseDate().length() < 4) return null;
        try {
            return Integer.parseInt(detail.releaseDate().substring(0, 4));
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
