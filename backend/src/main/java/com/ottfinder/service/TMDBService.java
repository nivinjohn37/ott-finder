package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.OttAvailability;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class TMDBService {

    private final RestTemplate restTemplate;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${tmdb.api-key}")
    private String apiKey;

    @Value("${tmdb.base-url}")
    private String baseUrl;

    @Value("${tmdb.image-base-url}")
    private String imageBaseUrl;

    private static final Duration SEARCH_TTL = Duration.ofHours(24);
    private static final Duration DETAIL_TTL = Duration.ofHours(24);
    private static final Duration TRENDING_TTL = Duration.ofHours(6);

    public List<MovieSearchResult> search(String query) {
        String cacheKey = "tmdb:search:" + query.toLowerCase().replaceAll("\\s+", "_");
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached, new TypeReference<>() {});
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/search/multi")
                .queryParam("api_key", apiKey)
                .queryParam("query", query)
                .queryParam("language", "en-US")
                .queryParam("page", 1)
                .toUriString();

        List<MovieSearchResult> results = fetchAndMapResults(url);
        cache(cacheKey, results, SEARCH_TTL);
        return results;
    }

    public MovieDetail getDetails(Integer tmdbId, String mediaType) {
        String cacheKey = "tmdb:movie:" + tmdbId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserialize(cached, MovieDetail.class);
        }

        String endpoint = "movie".equals(mediaType) ? "/movie/" : "/tv/";
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + endpoint + tmdbId)
                .queryParam("api_key", apiKey)
                .queryParam("language", "en-US")
                .toUriString();

        MovieDetail detail = fetchAndMapDetail(url, tmdbId, mediaType);
        if (detail != null) {
            cache(cacheKey, detail, DETAIL_TTL);
        }
        return detail;
    }

    public List<MovieSearchResult> getTrending() {
        String cacheKey = "tmdb:trending";
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached, new TypeReference<>() {});
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/trending/all/day")
                .queryParam("api_key", apiKey)
                .queryParam("language", "en-US")
                .toUriString();

        List<MovieSearchResult> results = fetchAndMapResults(url);
        cache(cacheKey, results, TRENDING_TTL);
        return results;
    }

    @SuppressWarnings("unchecked")
    private List<MovieSearchResult> fetchAndMapResults(String url) {
        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null || !response.containsKey("results")) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            return results.stream()
                    .filter(r -> !"person".equals(r.get("media_type")))
                    .map(this::mapToSearchResult)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (RestClientException ex) {
            log.error("TMDB search failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private MovieDetail fetchAndMapDetail(String url, Integer tmdbId, String mediaType) {
        try {
            Map<String, Object> r = restTemplate.getForObject(url, Map.class);
            if (r == null) return null;

            String title = "tv".equals(mediaType)
                    ? (String) r.get("name")
                    : (String) r.get("title");
            String date = "tv".equals(mediaType)
                    ? (String) r.get("first_air_date")
                    : (String) r.get("release_date");

            return new MovieDetail(
                    tmdbId,
                    title,
                    buildImageUrl((String) r.get("poster_path")),
                    buildImageUrl((String) r.get("backdrop_path")),
                    (String) r.get("overview"),
                    date,
                    mediaType,
                    toDouble(r.get("vote_average")),
                    toInt(r.get("vote_count")),
                    Collections.emptyList()
            );
        } catch (RestClientException ex) {
            log.error("TMDB detail fetch failed for tmdbId={}: {}", tmdbId, ex.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private MovieSearchResult mapToSearchResult(Map<String, Object> r) {
        try {
            String mediaType = (String) r.getOrDefault("media_type", "movie");
            String title = "tv".equals(mediaType)
                    ? (String) r.get("name")
                    : (String) r.get("title");
            String date = "tv".equals(mediaType)
                    ? (String) r.get("first_air_date")
                    : (String) r.get("release_date");

            return new MovieSearchResult(
                    toInt(r.get("id")),
                    title,
                    buildImageUrl((String) r.get("poster_path")),
                    buildImageUrl((String) r.get("backdrop_path")),
                    (String) r.get("overview"),
                    date,
                    mediaType,
                    toDouble(r.get("vote_average")),
                    Collections.emptyList()
            );
        } catch (Exception ex) {
            log.warn("Failed to map TMDB result: {}", ex.getMessage());
            return null;
        }
    }

    private String buildImageUrl(String path) {
        if (path == null || path.isBlank()) return null;
        return imageBaseUrl + path;
    }

    private Double toDouble(Object val) {
        if (val == null) return null;
        return val instanceof Number n ? n.doubleValue() : null;
    }

    private Integer toInt(Object val) {
        if (val == null) return null;
        return val instanceof Number n ? n.intValue() : null;
    }

    private void cache(String key, Object value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception ex) {
            log.warn("Redis cache write failed for key={}: {}", key, ex.getMessage());
        }
    }

    private <T> T deserialize(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception ex) {
            log.warn("Redis cache deserialization failed: {}", ex.getMessage());
            return null;
        }
    }

    private <T> List<T> deserializeList(String json, TypeReference<List<T>> typeRef) {
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception ex) {
            log.warn("Redis cache deserialization failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}
