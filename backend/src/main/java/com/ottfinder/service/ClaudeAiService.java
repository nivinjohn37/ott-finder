package com.ottfinder.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ClaudeAiService implements AiService {

    private final RestTemplate restTemplate;

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.base-url:https://api.anthropic.com}")
    private String baseUrl;

    private static final String MODEL = "claude-sonnet-4-6";
    private static final String API_VERSION = "2023-06-01";

    public ClaudeAiService(@Qualifier("aiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String reviewSummary(String movieTitle, List<String> reviews, boolean spoilers) {
        if (!isAvailable() || reviews.isEmpty()) return null;

        String reviewsText = reviews.stream()
                .limit(15)
                .map(r -> "- " + r.trim().replaceAll("\\s+", " "))
                .collect(Collectors.joining("\n"));

        String prompt = buildPrompt(movieTitle, reviewsText, spoilers);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", API_VERSION);

            Map<String, Object> body = Map.of(
                    "model", MODEL,
                    "max_tokens", 512,
                    "messages", List.of(Map.of("role", "user", "content", prompt))
            );

            ResponseEntity<Map> response = restTemplate.exchange(
                    baseUrl + "/v1/messages",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
                if (content != null && !content.isEmpty()) {
                    return (String) content.get(0).get("text");
                }
            }
        } catch (Exception ex) {
            log.warn("Claude API call failed for '{}': {}", movieTitle, ex.getMessage());
        }
        return null;
    }

    private String buildPrompt(String movieTitle, String reviewsText, boolean spoilers) {
        if (spoilers) {
            return """
                    You are a movie review summariser. Summarise the following reviews for "%s" in 150-200 words.
                    Include all plot points, twists, and endings mentioned in the reviews.
                    Focus on specific story elements audiences praised or criticised.
                    Write in a neutral, third-person tone. Do not use "I" or "we". Output only the summary — no preamble.

                    Reviews:
                    %s
                    """.formatted(movieTitle, reviewsText);
        } else {
            return """
                    You are a movie review summariser. Summarise the following reviews for "%s" in 120-150 words.
                    Rules: Do NOT reveal plot twists, major reveals, character deaths, or endings.
                    Focus on: overall tone, performances, direction, pacing, and whether audiences enjoyed it.
                    Be balanced — mention both positives and negatives if present.
                    Write in a neutral, third-person tone. Do not use "I" or "we". Output only the summary — no preamble.

                    Reviews:
                    %s
                    """.formatted(movieTitle, reviewsText);
        }
    }
}
