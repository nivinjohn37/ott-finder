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

    private static final String MODEL = "claude-haiku-4-5-20251001";
    private static final String API_VERSION = "2023-06-01";

    public ClaudeAiService(@Qualifier("aiRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String summariseMovie(String title, String overview, String genres,
                                  Double rating, Integer voteCount, Integer year,
                                  List<String> reviews, boolean spoilers) {
        if (!isAvailable()) return null;

        String prompt = buildPrompt(title, overview, genres, rating, voteCount, year, reviews, spoilers);

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
            log.warn("Claude API call failed for '{}': {}", title, ex.getMessage());
        }
        return null;
    }

    private String buildPrompt(String title, String overview, String genres,
                                Double rating, Integer voteCount, Integer year,
                                List<String> reviews, boolean spoilers) {
        String meta = buildMetaBlock(title, overview, genres, rating, voteCount, year);
        String reviewBlock = buildReviewBlock(reviews);

        String keywordsInstruction = """

                Then on a NEW LINE write exactly:
                Keywords: word/phrase, word/phrase, word/phrase, word/phrase, word/phrase
                Choose 5 short descriptive phrases (2-3 words max each) that best capture \
                the audience reaction. Examples: visually stunning, emotionally complex, divisive ending, \
                strong performances, slow pacing.
                """;

        if (spoilers) {
            return """
                    You are a film analyst writing for WatchMate, a streaming discovery app.

                    %s
                    %s
                    Write a 150-200 word audience reception summary in plain prose. No markdown headers, \
                    no bullet points, no bold text. Include plot elements or twists mentioned in reviews. \
                    Highlight what audiences praised or criticised about the story, performances, and direction. \
                    Write in third-person. Output the summary paragraph first.
                    %s""".formatted(meta, reviewBlock, keywordsInstruction);
        } else {
            return """
                    You are a film analyst writing for WatchMate, a streaming discovery app.

                    %s
                    %s
                    Write a 120-150 word spoiler-free audience reception summary in plain prose. \
                    No markdown headers, no bullet points, no bold text. Do NOT reveal plot twists, deaths, \
                    or endings. Focus on tone, performances, direction, pacing, and overall audience reaction. \
                    Be balanced — include criticisms too. Write in third-person. Output the summary paragraph first.
                    %s""".formatted(meta, reviewBlock, keywordsInstruction);
        }
    }

    private String buildMetaBlock(String title, String overview, String genres,
                                   Double rating, Integer voteCount, Integer year) {
        StringBuilder sb = new StringBuilder();
        sb.append("Movie: ").append(title);
        if (year != null) sb.append(" (").append(year).append(")");
        if (genres != null && !genres.isBlank()) sb.append("\nGenres: ").append(genres);
        if (rating != null && voteCount != null && voteCount > 0) {
            sb.append(String.format("\nTMDB Rating: %.1f/10 from %,d votes", rating, voteCount));
        }
        if (overview != null && !overview.isBlank()) {
            sb.append("\nOverview: ").append(overview);
        }
        return sb.toString();
    }

    private String buildReviewBlock(List<String> reviews) {
        if (reviews == null || reviews.isEmpty()) return "";
        String joined = reviews.stream()
                .limit(10)
                .map(r -> "- " + r.trim().replaceAll("\\s+", " "))
                .collect(Collectors.joining("\n"));
        return "\nAudience reviews:\n" + joined;
    }
}
