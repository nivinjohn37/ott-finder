package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.AiSuggestion;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.MovieSuggestion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Service
@Slf4j
public class MoodSuggestionService {

    private final AiService aiService;
    private final TMDBService tmdbService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Executor apiCallExecutor;

    private static final Duration CACHE_TTL = Duration.ofHours(24);

    public MoodSuggestionService(AiService aiService,
                                  TMDBService tmdbService,
                                  StringRedisTemplate redisTemplate,
                                  ObjectMapper objectMapper,
                                  @Qualifier("apiCallExecutor") Executor apiCallExecutor) {
        this.aiService = aiService;
        this.tmdbService = tmdbService;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.apiCallExecutor = apiCallExecutor;
    }

    public List<MovieSuggestion> getSuggestions(String mood, String audience,
                                                  String length, String language) {
        if (!aiService.isAvailable()) return Collections.emptyList();

        String cacheKey = "ai:suggest:" + sanitise(mood) + ":" + sanitise(audience)
                + ":" + sanitise(length) + ":" + sanitise(language);

        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<>() {});
            } catch (Exception ex) {
                log.warn("Suggestion cache parse failed, regenerating");
            }
        }

        log.info("Generating suggestions — mood={} audience={} length={} language={}",
                mood, audience, length, language);

        List<AiSuggestion> aiSuggestions = aiService.suggestMovies(mood, audience, length, language);
        if (aiSuggestions.isEmpty()) return Collections.emptyList();

        // Parallel TMDB lookups for each suggestion
        List<CompletableFuture<MovieSuggestion>> futures = aiSuggestions.stream()
                .map(s -> CompletableFuture
                        .supplyAsync(() -> lookupMovie(s), apiCallExecutor)
                        .exceptionally(ex -> null))
                .toList();

        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
                .orTimeout(8, java.util.concurrent.TimeUnit.SECONDS)
                .exceptionally(ex -> null)
                .join();

        List<MovieSuggestion> results = futures.stream()
                .map(f -> f.getNow(null))
                .filter(Objects::nonNull)
                .toList();

        if (!results.isEmpty()) {
            try {
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(results), CACHE_TTL);
            } catch (Exception ex) {
                log.warn("Failed to cache suggestions: {}", ex.getMessage());
            }
        }

        return results;
    }

    private MovieSuggestion lookupMovie(AiSuggestion s) {
        MovieSearchResult movie = tmdbService.searchByTitle(s.title(), s.year());
        if (movie == null) {
            log.debug("TMDB lookup failed for '{}' ({})", s.title(), s.year());
            return null;
        }
        return new MovieSuggestion(movie, s.reason());
    }

    private String sanitise(String s) {
        if (s == null) return "any";
        return s.toLowerCase().replaceAll("[^a-z0-9]", "_");
    }
}
