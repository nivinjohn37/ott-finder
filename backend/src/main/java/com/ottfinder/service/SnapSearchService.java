package com.ottfinder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.MovieSuggestion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.time.Duration;
import java.util.Collections;

@Service
@Slf4j
public class SnapSearchService {

    private final ClaudeAiService aiService;
    private final TMDBService tmdbService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final AiUsageService aiUsageService;

    private static final Duration CACHE_TTL = Duration.ofHours(6);

    public SnapSearchService(ClaudeAiService aiService,
                             TMDBService tmdbService,
                             StringRedisTemplate redisTemplate,
                             ObjectMapper objectMapper,
                             @Qualifier("apiCallExecutor") java.util.concurrent.Executor ignored,
                             AiUsageService aiUsageService) {
        this.aiService      = aiService;
        this.tmdbService    = tmdbService;
        this.redisTemplate  = redisTemplate;
        this.objectMapper   = objectMapper;
        this.aiUsageService = aiUsageService;
    }

    public MovieSuggestion identify(MultipartFile file) {
        log.info("SnapSearchService.identify called, size={}B content-type={}", file.getSize(), file.getContentType());
        try {
            return doIdentify(file);
        } catch (Throwable ex) {
            log.error("Snap search failed: {} — {}", ex.getClass().getName(), ex.getMessage(), ex);
            return null;
        }
    }

    private MovieSuggestion doIdentify(MultipartFile file) throws Exception {
        if (!aiService.isAvailable()) return null;

        byte[] imageBytes = file.getBytes();
        String contentType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

        String hash     = sha256hex(imageBytes);
        String cacheKey = "ai:snap:" + hash;

        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                MovieSuggestion hit = objectMapper.readValue(cached, MovieSuggestion.class);
                aiUsageService.logCacheHit("snap-search");
                log.info("Snap cache hit hash={}", hash.substring(0, 8));
                return hit;
            } catch (Exception ex) {
                log.warn("Snap cache parse failed, regenerating");
            }
        }

        ClaudeAiService.SnapIdentification id = aiService.identifyMovieFromImage(imageBytes, contentType);
        if (id == null || id.title() == null || "none".equals(id.confidence())) {
            log.info("Claude could not identify a movie from the image");
            return null;
        }

        log.info("Identified: '{}' ({}) confidence={}", id.title(), id.year(), id.confidence());

        MovieSearchResult tmdb = tmdbService.searchByTitle(id.title(), id.year());

        MovieSuggestion result;
        if (tmdb != null) {
            result = new MovieSuggestion(tmdb, id.explanation(), null, true);
        } else {
            MovieSearchResult synthetic = new MovieSearchResult(
                    null, id.title(), null, null, null,
                    id.year() != null ? id.year() + "-01-01" : null,
                    id.mediaType() != null ? id.mediaType() : "movie",
                    null, Collections.emptyList()
            );
            result = new MovieSuggestion(synthetic, id.explanation(), null, false);
        }

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), CACHE_TTL);
        } catch (Exception ex) {
            log.warn("Failed to cache snap result: {}", ex.getMessage());
        }

        return result;
    }

    private String sha256hex(byte[] data) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(data);
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception ex) {
            return Integer.toHexString(java.util.Arrays.hashCode(data));
        }
    }
}
