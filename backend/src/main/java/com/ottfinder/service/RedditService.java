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
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
public class RedditService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    private static final Duration REDDIT_TTL = Duration.ofHours(24);
    private static final String USER_AGENT = "WatchMate/1.0 (portfolio project; contact: getnivinjohn@gmail.com)";
    private static final int MIN_TEXT = 80;
    private static final int MAX_TEXT = 800;

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

        List<String> reviews = fetchRss(movieTitle);
        log.info("Reddit RSS for '{}' (tmdbId={}) returned {} posts", movieTitle, tmdbId, reviews.size());

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(reviews), REDDIT_TTL);
        } catch (Exception ex) {
            log.warn("Reddit cache write failed: {}", ex.getMessage());
        }

        return reviews;
    }

    private List<String> fetchRss(String movieTitle) {
        try {
            String query = URLEncoder.encode(movieTitle + " movie review", StandardCharsets.UTF_8);
            String url = "https://www.reddit.com/search.rss?q=" + query
                    + "&sort=relevance&t=all&limit=25";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", USER_AGENT);

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("Reddit RSS returned HTTP {}", response.getStatusCode());
                return Collections.emptyList();
            }

            return parseAtomEntries(response.getBody());

        } catch (Exception ex) {
            log.warn("Reddit RSS fetch failed for '{}': {}", movieTitle, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<String> parseAtomEntries(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // XXE protection
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);

        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new InputSource(new StringReader(xml)));

        NodeList entries = doc.getElementsByTagName("entry");
        List<String> results = new ArrayList<>();

        for (int i = 0; i < entries.getLength() && results.size() < 10; i++) {
            Element entry = (Element) entries.item(i);
            NodeList contentNodes = entry.getElementsByTagName("content");
            if (contentNodes.getLength() == 0) continue;

            // XML parser already HTML-decodes the content; we just strip tags
            String rawHtml = contentNodes.item(0).getTextContent();
            String text = stripHtml(rawHtml);

            if (text.length() >= MIN_TEXT) {
                results.add(text.length() > MAX_TEXT ? text.substring(0, MAX_TEXT) + "…" : text);
            }
        }

        return results;
    }

    private String stripHtml(String html) {
        return html
                .replaceAll("<!--.*?-->", " ")         // strip HTML comments
                .replaceAll("<[^>]+>", " ")             // strip HTML tags
                .replaceAll("submitted by.*", "")       // strip Reddit metadata footer
                .replaceAll("\\[link].*", "")           // strip [link][comments] footer
                .replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("&quot;", "\"")
                .replaceAll("&#[0-9]+;", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
