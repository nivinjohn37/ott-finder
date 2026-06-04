package com.ottfinder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.ReviewSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
public class ReviewSummaryService {

    private final AiService aiService;
    private final TMDBService tmdbService;
    private final RedditService redditService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // v2 key — includes keywords in cached JSON, avoids old plain-string entries
    private static final String CACHE_PREFIX = "ai:review-summary:v2:";
    private static final Duration SUMMARY_TTL = Duration.ofHours(48);

    public ReviewSummaryService(AiService aiService,
                                 TMDBService tmdbService,
                                 RedditService redditService,
                                 StringRedisTemplate redisTemplate,
                                 ObjectMapper objectMapper) {
        this.aiService = aiService;
        this.tmdbService = tmdbService;
        this.redditService = redditService;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public ReviewSummaryDto getSummary(int tmdbId, String mediaType, boolean spoilers, String titleHint) {
        if (!aiService.isAvailable()) {
            log.warn("Claude unavailable — ANTHROPIC_API_KEY missing or blank");
            return null;
        }

        String cacheKey = CACHE_PREFIX + tmdbId + ":" + (spoilers ? "full" : "free");
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, ReviewSummaryDto.class);
            } catch (Exception ex) {
                log.warn("Cache parse failed for {}, regenerating", cacheKey);
            }
        }

        MovieDetail detail = tmdbService.getDetails(tmdbId, mediaType != null ? mediaType : "movie");
        if (detail == null && !"tv".equals(mediaType)) {
            detail = tmdbService.getDetails(tmdbId, "tv");
        }

        String title = detail != null ? detail.title() : titleHint;
        if (title == null || title.isBlank()) {
            log.warn("Could not resolve title for tmdbId={}", tmdbId);
            return null;
        }

        String overview = detail != null ? detail.overview() : null;
        String genres   = detail != null && detail.genres() != null
                          ? String.join(", ", detail.genres()) : null;
        Double rating   = detail != null ? detail.voteAverage() : null;
        Integer votes   = detail != null ? detail.voteCount() : null;
        Integer year    = extractYear(detail);

        List<String> tmdbReviews   = tmdbService.getReviews(tmdbId, mediaType != null ? mediaType : "movie");
        List<String> redditReviews = redditService.getReviews(title, tmdbId);
        List<String> reviews = new java.util.ArrayList<>();
        reviews.addAll(tmdbReviews);
        reviews.addAll(redditReviews);

        log.info("Generating summary for '{}' tmdbId={} — tmdb={} reddit={} reviews",
                title, tmdbId, tmdbReviews.size(), redditReviews.size());

        String raw = aiService.summariseMovie(title, overview, genres, rating, votes, year, reviews, spoilers);
        if (raw == null) return null;

        ReviewSummaryDto dto = parseResponse(raw, spoilers);
        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(dto), SUMMARY_TTL);
        } catch (Exception ex) {
            log.warn("Failed to cache summary for tmdbId={}: {}", tmdbId, ex.getMessage());
        }
        return dto;
    }

    private ReviewSummaryDto parseResponse(String raw, boolean spoilers) {
        // Claude is asked to end with "Keywords: a, b, c, d, e"
        int kwIdx = raw.lastIndexOf("\nKeywords:");
        if (kwIdx < 0) kwIdx = raw.lastIndexOf("Keywords:");

        if (kwIdx >= 0) {
            String summary  = raw.substring(0, kwIdx).trim();
            String kwLine   = raw.substring(kwIdx).replaceFirst("(?i)keywords:\\s*", "").trim();
            List<String> kw = Arrays.stream(kwLine.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank() && s.length() <= 30)
                    .limit(7)
                    .toList();
            return new ReviewSummaryDto(summary, kw, spoilers);
        }

        return new ReviewSummaryDto(raw.trim(), Collections.emptyList(), spoilers);
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
