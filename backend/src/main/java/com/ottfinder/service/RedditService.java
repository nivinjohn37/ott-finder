package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Slf4j
public class RedditService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    private static final Duration REDDIT_TTL = Duration.ofHours(24);
    private static final String USER_AGENT = "WatchMate/1.0 (portfolio project; contact: getnivinjohn@gmail.com)";
    private static final int MIN_SELFTEXT = 80;
    private static final int MAX_SELFTEXT = 600;

    public RedditService(RestTemplate restTemplate,
                         ObjectMapper objectMapper,
                         StringRedisTemplate redisTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
    }

    public List<String> getReviews(String movieTitle, int tmdbId) {
        String cacheKey = "reddit:reviews:" + tmdbId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<>() {});
            } catch (Exception ex) {
                log.warn("Reddit cache parse failed for tmdbId={}", tmdbId);
            }
        }

        List<String> reviews = fetch(movieTitle);

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(reviews), REDDIT_TTL);
        } catch (Exception ex) {
            log.warn("Reddit cache write failed for tmdbId={}: {}", tmdbId, ex.getMessage());
        }

        return reviews;
    }

    @SuppressWarnings("unchecked")
    private List<String> fetch(String movieTitle) {
        try {
            String query = URLEncoder.encode(movieTitle + " review", StandardCharsets.UTF_8);
            String url = "https://www.reddit.com/search.json?q=" + query
                    + "&sort=relevance&t=all&type=link&limit=20";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", USER_AGENT);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Collections.emptyList();
            }

            Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
            if (data == null) return Collections.emptyList();

            List<Map<String, Object>> children = (List<Map<String, Object>>) data.get("children");
            if (children == null) return Collections.emptyList();

            return children.stream()
                    .map(child -> (Map<String, Object>) child.get("data"))
                    .filter(Objects::nonNull)
                    .map(post -> {
                        String selftext = (String) post.get("selftext");
                        if (selftext == null
                                || selftext.isBlank()
                                || "[removed]".equals(selftext)
                                || "[deleted]".equals(selftext)
                                || selftext.length() < MIN_SELFTEXT) {
                            return null;
                        }
                        return selftext.length() > MAX_SELFTEXT
                                ? selftext.substring(0, MAX_SELFTEXT) + "…"
                                : selftext;
                    })
                    .filter(Objects::nonNull)
                    .limit(10)
                    .toList();

        } catch (Exception ex) {
            log.warn("Reddit fetch failed for '{}': {}", movieTitle, ex.getMessage());
            return Collections.emptyList();
        }
    }
}
