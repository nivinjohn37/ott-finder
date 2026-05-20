package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.CastMember;
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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.zip.GZIPInputStream;

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
        if (!results.isEmpty()) cache(cacheKey, results, SEARCH_TTL);
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
                .queryParam("append_to_response", "videos,credits")
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
        if (!results.isEmpty()) cache(cacheKey, results, TRENDING_TTL);
        return results;
    }

    // TMDB responses are sometimes double-gzipped (CDN adds a second gzip layer on top of
    // the Content-Encoding layer that HttpURLConnection already decompressed). Fetching as
    // byte[] and decompressing manually handles both 0, 1, and 2-layer cases.
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchMap(String url) {
        try {
            byte[] bytes = restTemplate.getForObject(url, byte[].class);
            if (bytes == null) return null;
            String json = decompressIfNeeded(bytes);
            return objectMapper.readValue(json, Map.class);
        } catch (RestClientException | IOException ex) {
            log.error("TMDB fetch failed for {}: {}", url, ex.getMessage());
            return null;
        }
    }

    private String decompressIfNeeded(byte[] bytes) throws IOException {
        if (bytes.length >= 2 && bytes[0] == (byte) 0x1f && bytes[1] == (byte) 0x8b) {
            // Java's GZIPInputStream supports concatenated gzip streams. If trailing garbage
            // (e.g. a \n) follows the valid stream it throws ZipException AFTER the real data
            // is already decompressed. Read chunk-by-chunk so we keep whatever was read.
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(bytes))) {
                byte[] buf = new byte[8192];
                int n;
                try {
                    while ((n = gis.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                } catch (java.util.zip.ZipException ignored) {
                    // Trailing non-gzip bytes after valid stream — data already in baos
                    if (baos.size() == 0) throw ignored;
                }
            }
            return decompressIfNeeded(baos.toByteArray());
        }
        return new String(bytes, StandardCharsets.UTF_8).trim();
    }

    @SuppressWarnings("unchecked")
    private List<MovieSearchResult> fetchAndMapResults(String url) {
        try {
            Map<String, Object> response = fetchMap(url);
            if (response == null || !response.containsKey("results")) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            return results.stream()
                    .filter(r -> !"person".equals(r.get("media_type")))
                    .map(this::mapToSearchResult)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception ex) {
            log.error("TMDB search failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private MovieDetail fetchAndMapDetail(String url, Integer tmdbId, String mediaType) {
        try {
            Map<String, Object> r = fetchMap(url);
            if (r == null) return null;

            String title = "tv".equals(mediaType)
                    ? (String) r.get("name")
                    : (String) r.get("title");
            String date = "tv".equals(mediaType)
                    ? (String) r.get("first_air_date")
                    : (String) r.get("release_date");

            String trailerKey = extractTrailerKey((Map<String, Object>) r.get("videos"));
            List<String> genres = extractGenres((List<Map<String, Object>>) r.get("genres"));
            List<CastMember> cast = extractCast((Map<String, Object>) r.get("credits"));
            Integer runtime = "tv".equals(mediaType)
                    ? extractTvRuntime((List<Integer>) r.get("episode_run_time"))
                    : toInt(r.get("runtime"));

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
                    Collections.emptyList(),
                    trailerKey,
                    (String) r.get("tagline"),
                    runtime,
                    genres,
                    cast
            );
        } catch (Exception ex) {
            log.error("TMDB detail fetch failed for tmdbId={}: {}", tmdbId, ex.getMessage());
            return null;
        }
    }

    private List<String> extractGenres(List<Map<String, Object>> genres) {
        if (genres == null) return Collections.emptyList();
        return genres.stream()
                .map(g -> (String) g.get("name"))
                .filter(Objects::nonNull)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private List<CastMember> extractCast(Map<String, Object> credits) {
        if (credits == null) return Collections.emptyList();
        List<Map<String, Object>> castList = (List<Map<String, Object>>) credits.get("cast");
        if (castList == null) return Collections.emptyList();
        return castList.stream()
                .limit(8)
                .map(c -> new CastMember(
                        (String) c.get("name"),
                        (String) c.get("character"),
                        buildImageUrl((String) c.get("profile_path"))
                ))
                .toList();
    }

    private Integer extractTvRuntime(List<Integer> episodeRunTime) {
        if (episodeRunTime == null || episodeRunTime.isEmpty()) return null;
        return episodeRunTime.get(0);
    }

    @SuppressWarnings("unchecked")
    private String extractTrailerKey(Map<String, Object> videos) {
        if (videos == null) return null;
        List<Map<String, Object>> results = (List<Map<String, Object>>) videos.get("results");
        if (results == null) return null;
        return results.stream()
                .filter(v -> "YouTube".equals(v.get("site")) && "Trailer".equals(v.get("type")))
                .filter(v -> Boolean.TRUE.equals(v.get("official")))
                .findFirst()
                .or(() -> results.stream()
                        .filter(v -> "YouTube".equals(v.get("site")) && "Trailer".equals(v.get("type")))
                        .findFirst())
                .map(v -> (String) v.get("key"))
                .orElse(null);
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
