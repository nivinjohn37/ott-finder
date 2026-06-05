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
public class NlSearchService {

    private final ClaudeAiService aiService;
    private final TMDBService tmdbService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Executor apiCallExecutor;

    private static final Duration CACHE_TTL = Duration.ofHours(6);
    private static final double   MIN_VOTE_AVG = 5.5;
    private static final int      TARGET_RESULTS = 6;

    public NlSearchService(ClaudeAiService aiService,
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

    public List<MovieSuggestion> search(String query) {
        log.info("NlSearchService.search called, query='{}'", query);
        try {
            return doSearch(query);
        } catch (Throwable ex) {
            log.error("NL search failed for query='{}': {} — {}", query, ex.getClass().getName(), ex.getMessage(), ex);
            return Collections.emptyList();
        }
    }

    private List<MovieSuggestion> doSearch(String query) {
        if (!aiService.isAvailable() || query == null || query.isBlank()) return Collections.emptyList();

        String cacheKey = "ai:nlsearch:" + sanitise(query);
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<>() {});
            } catch (Exception ex) {
                log.warn("NL search cache parse failed, regenerating");
            }
        }

        log.info("NL search — query=\"{}\"", query);

        List<AiSuggestion> suggestions = aiService.interpretNlQuery(query);
        if (suggestions.isEmpty()) return Collections.emptyList();

        List<CompletableFuture<MovieSuggestion>> futures = suggestions.stream()
                .map(s -> CompletableFuture
                        .supplyAsync(() -> enrich(s), apiCallExecutor)
                        .exceptionally(ex -> synthetic(s)))
                .toList();

        CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new))
                .orTimeout(8, java.util.concurrent.TimeUnit.SECONDS)
                .exceptionally(ex -> null)
                .join();

        List<MovieSuggestion> all = futures.stream()
                .map(f -> f.getNow(null))
                .filter(Objects::nonNull)
                .toList();

        List<MovieSuggestion> quality = all.stream()
                .filter(s -> s.tmdbFound()
                        && s.movie().voteAverage() != null
                        && s.movie().voteAverage() >= MIN_VOTE_AVG)
                .sorted((a, b) -> Double.compare(
                        b.movie().voteAverage() != null ? b.movie().voteAverage() : 0,
                        a.movie().voteAverage() != null ? a.movie().voteAverage() : 0))
                .toList();

        List<MovieSuggestion> fallback = all.stream()
                .filter(s -> !quality.contains(s))
                .toList();

        List<MovieSuggestion> results = new java.util.ArrayList<>();
        results.addAll(quality.stream().limit(TARGET_RESULTS).toList());
        if (results.size() < TARGET_RESULTS) {
            fallback.stream().limit(TARGET_RESULTS - results.size()).forEach(results::add);
        }

        if (!results.isEmpty()) {
            try {
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(results), CACHE_TTL);
            } catch (Exception ex) {
                log.warn("Failed to cache NL search results: {}", ex.getMessage());
            }
        }

        return results;
    }


    private MovieSuggestion enrich(AiSuggestion s) {
        MovieSearchResult tmdb = tmdbService.searchByTitle(s.title(), s.year());
        if (tmdb != null) return new MovieSuggestion(tmdb, s.reason(), s.language(), true);
        return synthetic(s);
    }

    private MovieSuggestion synthetic(AiSuggestion s) {
        MovieSearchResult m = new MovieSearchResult(
                null, s.title(), null, null, null,
                s.year() != null ? s.year() + "-01-01" : null,
                "movie", null, Collections.emptyList());
        return new MovieSuggestion(m, s.reason(), s.language(), false);
    }

    private String sanitise(String s) {
        String clean = s.toLowerCase().replaceAll("[^a-z0-9]", "_").replaceAll("_+", "_");
        return clean.length() > 80 ? clean.substring(0, 80) : clean;
    }
}
