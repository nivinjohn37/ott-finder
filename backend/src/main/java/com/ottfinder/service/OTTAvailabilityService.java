package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.entity.OttPlatform;
import com.ottfinder.repository.OttPlatformRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OTTAvailabilityService {

    private final RestTemplate restTemplate;
    private final StringRedisTemplate redisTemplate;
    private final OttPlatformRepository platformRepository;
    private final ObjectMapper objectMapper;

    private static final String JUSTWATCH_GRAPHQL_URL = "https://apis.justwatch.com/graphql";
    private static final Duration AVAILABILITY_TTL = Duration.ofHours(6);

    public List<OttAvailability> findAvailability(Integer tmdbId, String mediaType, String title) {
        String cacheKey = "ott:availability:" + tmdbId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached);
        }

        List<OttAvailability> result = fetchFromJustWatch(tmdbId, title);
        cache(cacheKey, result);
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<OttAvailability> fetchFromJustWatch(Integer tmdbId, String title) {
        try {
            String safeTitle = title.replace("\\", "\\\\").replace("\"", "\\\"");
            String query = """
                    query {
                      popularTitles(country: IN, first: 10, filter: { searchQuery: "%s" }) {
                        edges {
                          node {
                            content(country: IN, language: "en") {
                              externalIds { tmdbId }
                            }
                            offers(country: IN, platform: WEB) {
                              monetizationType
                              standardWebURL
                              package { packageId clearName }
                            }
                          }
                        }
                      }
                    }
                    """.formatted(safeTitle);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("User-Agent", "Mozilla/5.0 (compatible; OTTFinder/1.0)");

            Map<String, Object> body = Map.of("query", query);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            Map<String, Object> response = restTemplate.postForObject(
                    JUSTWATCH_GRAPHQL_URL, request, Map.class);

            if (response == null || response.containsKey("errors")) {
                log.warn("JustWatch GraphQL error for tmdbId={}", tmdbId);
                return Collections.emptyList();
            }

            Map<String, Object> data = (Map<String, Object>) response.get("data");
            Map<String, Object> popularTitles = (Map<String, Object>) data.get("popularTitles");
            List<Map<String, Object>> edges = (List<Map<String, Object>>) popularTitles.get("edges");

            String tmdbIdStr = String.valueOf(tmdbId);
            Map<String, Object> matchedNode = edges.stream()
                    .map(e -> (Map<String, Object>) e.get("node"))
                    .filter(node -> {
                        Map<String, Object> content = (Map<String, Object>) node.get("content");
                        Map<String, Object> externalIds = (Map<String, Object>) content.get("externalIds");
                        return externalIds != null && tmdbIdStr.equals(externalIds.get("tmdbId"));
                    })
                    .findFirst()
                    .orElse(null);

            if (matchedNode == null) {
                log.debug("No JustWatch match for tmdbId={} title={}", tmdbId, title);
                return Collections.emptyList();
            }

            return extractOffers(matchedNode, tmdbId);

        } catch (RestClientException ex) {
            log.warn("JustWatch API unavailable for tmdbId={}: {}", tmdbId, ex.getMessage());
            return Collections.emptyList();
        } catch (Exception ex) {
            log.warn("JustWatch parsing failed for tmdbId={}: {}", tmdbId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private List<OttAvailability> extractOffers(Map<String, Object> node, Integer tmdbId) {
        List<Map<String, Object>> offers =
                (List<Map<String, Object>>) node.getOrDefault("offers", Collections.emptyList());

        return offers.stream()
                .filter(o -> "FLATRATE".equals(o.get("monetizationType")))
                .map(o -> {
                    Map<String, Object> pkg = (Map<String, Object>) o.get("package");
                    Integer packageId = toInt(pkg.get("packageId"));
                    String deepLink = (String) o.get("standardWebURL");
                    return platformRepository.findByJustwatchProviderId(packageId)
                            .map(platform -> buildAvailability(platform, deepLink))
                            .orElse(null);
                })
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
    }

    private OttAvailability buildAvailability(OttPlatform platform, String deepLink) {
        return new OttAvailability(
                platform.getName(),
                platform.getDisplayName(),
                platform.getLogoUrl(),
                deepLink,
                null
        );
    }

    private Integer toInt(Object val) {
        if (val instanceof Number n) return n.intValue();
        return null;
    }

    private void cache(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), AVAILABILITY_TTL);
        } catch (Exception ex) {
            log.warn("Redis cache write failed for key={}: {}", key, ex.getMessage());
        }
    }

    private List<OttAvailability> deserializeList(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            log.warn("Redis cache deserialization failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}
