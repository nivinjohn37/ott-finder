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

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Service
@Slf4j
public class MoodSuggestionService {

    private final ClaudeAiService aiService;
    private final TMDBService tmdbService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Executor apiCallExecutor;

    private static final Duration CACHE_TTL = Duration.ofHours(24);

    public MoodSuggestionService(ClaudeAiService aiService,
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
                                                  String length, String language, String era) {
        if (!aiService.isAvailable()) return Collections.emptyList();

        String cacheKey = "ai:suggest:" + sanitise(mood) + ":" + sanitise(audience)
                + ":" + sanitise(length) + ":" + sanitise(language) + ":" + sanitise(era);

        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<>() {});
            } catch (Exception ex) {
                log.warn("Suggestion cache parse failed, regenerating");
            }
        }

        log.info("Generating suggestions — mood={} audience={} length={} language={} era={}",
                mood, audience, length, language, era);

        List<AiSuggestion> aiSuggestions = aiService.suggestMovies(mood, audience, length, language, era);
        if (aiSuggestions.isEmpty()) return Collections.emptyList();

        // Parallel TMDB enrichment — never drop a suggestion if TMDB misses
        List<CompletableFuture<MovieSuggestion>> futures = aiSuggestions.stream()
                .map(s -> CompletableFuture
                        .supplyAsync(() -> enrich(s), apiCallExecutor)
                        .exceptionally(ex -> syntheticSuggestion(s)))
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

    private MovieSuggestion enrich(AiSuggestion s) {
        MovieSearchResult tmdb = tmdbService.searchByTitle(s.title(), s.year());
        if (tmdb != null) {
            return new MovieSuggestion(tmdb, s.reason(), s.language(), true);
        }
        log.debug("TMDB miss for '{}' ({}) — showing Claude's data", s.title(), s.year());
        return syntheticSuggestion(s);
    }

    private MovieSuggestion syntheticSuggestion(AiSuggestion s) {
        // Build a minimal MovieSearchResult from Claude's data so nothing is dropped
        MovieSearchResult synthetic = new MovieSearchResult(
                null,
                s.title(),
                null,
                null,
                null,
                s.year() != null ? s.year() + "-01-01" : null,
                "movie",
                null,
                Collections.emptyList()
        );
        return new MovieSuggestion(synthetic, s.reason(), s.language(), false);
    }

    private String sanitise(String s) {
        if (s == null) return "any";
        return s.toLowerCase().replaceAll("[^a-z0-9]", "_");
    }
}
