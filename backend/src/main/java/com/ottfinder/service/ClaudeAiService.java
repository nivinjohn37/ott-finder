package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.AiSuggestion;
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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ClaudeAiService implements AiService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.base-url:https://api.anthropic.com}")
    private String baseUrl;

    private static final String MODEL = "claude-haiku-4-5-20251001";
    private static final String API_VERSION = "2023-06-01";

    public ClaudeAiService(@Qualifier("aiRestTemplate") RestTemplate restTemplate,
                            ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
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

        return callClaude(buildPrompt(title, overview, genres, rating, voteCount, year, reviews, spoilers));
    }

    private String callClaude(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", API_VERSION);

            Map<String, Object> body = Map.of(
                    "model", MODEL,
                    "max_tokens", 1024,
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
            log.warn("Claude API call failed: {}", ex.getMessage());
        }
        return null;
    }

    @Override
    public List<AiSuggestion> suggestMovies(String mood, String audience, String length, String language) {
        return suggestMovies(mood, audience, length, language, null, null, Collections.emptyList());
    }

    @Override
    public List<AiSuggestion> suggestMovies(String mood, String audience, String length,
                                              String language, String era) {
        return suggestMovies(mood, audience, length, language, era, null, Collections.emptyList());
    }

    @Override
    public List<AiSuggestion> suggestMovies(String mood, String audience, String length,
                                              String language, String era, String mediaType,
                                              List<String> excludeTitles) {
        if (!isAvailable()) return Collections.emptyList();

        String naturalQuery = buildNaturalQuery(mood, audience, language, era, length, mediaType);

        String excludeBlock = (excludeTitles != null && !excludeTitles.isEmpty())
                ? "\n\nIMPORTANT: The user has already seen these — do NOT recommend them:\n"
                  + String.join(", ", excludeTitles)
                : "";

        String prompt = """
                You are an expert film curator and a knowledgeable friend who has watched \
                thousands of films across all languages. Someone is asking you:

                "%s"%s

                Give them 8 specific film recommendations. Your rules:
                1. Only recommend films that are GENUINELY celebrated — award winners, \
                   critically acclaimed, beloved by audiences, or cult classics.
                2. Every film must be well-known enough that fans of that language/genre \
                   would immediately recognise the title.
                3. For Indian regional cinema think of films like: \
                   Drishyam, Joji, Nayattu, Anjaam Pathiraa, Kumbalangi Nights (Malayalam); \
                   Vikram, Vinnaithaandi Varuvaayaa, Pariyerum Perumal (Tamil); \
                   Bahubali, Arjun Reddy, RRR (Telugu) — that calibre and recognition level.
                4. NO obscure, straight-to-streaming-only, or festival-circuit-only films.
                5. Match the genre/mood, media type, and era precisely.

                Return ONLY a JSON array, no explanation, no markdown fences:
                [{"title":"Exact title as it appears on TMDB","year":2021,"language":"Malayalam","reason":"One sentence why this is perfect"}]
                """.formatted(naturalQuery, excludeBlock);

        String raw = callClaude(prompt);
        if (raw == null) return Collections.emptyList();

        try {
            // Extract JSON array even if Claude wraps it in markdown fences
            String json = raw.trim();
            int start = json.indexOf('[');
            int end = json.lastIndexOf(']');
            if (start >= 0 && end > start) json = json.substring(start, end + 1);
            return objectMapper.readValue(json, new TypeReference<List<AiSuggestion>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse Claude suggestion response: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<AiSuggestion> interpretNlQuery(String query) {
        if (!isAvailable()) return Collections.emptyList();

        String prompt = """
                You are an expert film curator who understands what people mean when they \
                describe what they want to watch.

                A user is searching for something to watch and describes it as:
                "%s"

                Recommend 6 specific films or shows that perfectly match this description. Rules:
                1. Only recommend films that are genuinely well-regarded — no obscure or \
                   straight-to-streaming-only titles.
                2. Match the mood, theme, era, language, and style described as closely as possible.
                3. If they reference a specific film ("like Interstellar"), match its tone and \
                   scale — not just the director or genre label.
                4. Return ONLY a JSON array, no explanation, no markdown:
                [{"title":"Exact title as on TMDB","year":2014,"language":"English","reason":"One sentence why this fits their description"}]
                """.formatted(query);

        String raw = callClaude(prompt);
        if (raw == null) return Collections.emptyList();

        try {
            String json = raw.trim();
            int start = json.indexOf('[');
            int end = json.lastIndexOf(']');
            if (start >= 0 && end > start) json = json.substring(start, end + 1);
            return objectMapper.readValue(json, new TypeReference<List<AiSuggestion>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse NL search response: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private String buildNaturalQuery(String mood, String audience, String language,
                                      String era, String length, String mediaType) {
        // Map abstract answer values → natural language phrases
        String genre = switch (mood == null ? "" : mood.toLowerCase()) {
            case String s when s.contains("thrill") || s.contains("intense") -> "thriller";
            case String s when s.contains("feel-good") || s.contains("fun")  -> "feel-good, fun";
            case String s when s.contains("emotional") || s.contains("moving")-> "emotional, moving drama";
            case String s when s.contains("chill") || s.contains("easy")     -> "light, easy-watching";
            case String s when s.contains("romantic")                         -> "romantic";
            case String s when s.contains("thought") || s.contains("mind")   -> "thought-provoking, mind-bending";
            default -> mood != null ? mood : "good";
        };

        String audiencePhrase = switch (audience == null ? "" : audience.toLowerCase()) {
            case String s when s.contains("partner") || s.contains("date") -> "perfect for a date night";
            case String s when s.contains("family") || s.contains("kids")  -> "family-friendly";
            case String s when s.contains("friends")                        -> "great to watch with friends";
            default -> "to watch alone";
        };

        String eraPhrase = "";
        if (era != null && !era.isBlank() && !era.contains("any")) {
            eraPhrase = switch (era.toLowerCase()) {
                case String s when s.contains("2022") || s.contains("latest") -> "released from 2022 onwards";
                case String s when s.contains("2016") || s.contains("recent") -> "released between 2016 and 2021";
                case String s when s.contains("2000") && s.contains("2015")   -> "from the 2000s to 2015";
                case String s when s.contains("classic") || s.contains("2000")-> "classic films before 2000";
                default -> era;
            };
        }

        String lengthPhrase = switch (length == null ? "" : length.toLowerCase()) {
            case String s when s.contains("90") && s.contains("120") -> "around 90 to 120 minutes long";
            case String s when s.contains("under") || s.contains("90") -> "under 90 minutes";
            default -> "";
        };

        String lang = (language == null || language.toLowerCase().contains("any")) ? "" : language;

        String mediaWord = switch (mediaType == null ? "" : mediaType.toLowerCase()) {
            case String s when s.contains("tv") || s.contains("series") -> "TV series";
            case String s when s.contains("animat")                     -> "animated movies";
            case String s when s.contains("document")                   -> "documentaries";
            default                                                      -> "movies";
        };

        StringBuilder sb = new StringBuilder("Suggest some really good ");
        if (!lang.isBlank()) sb.append(lang).append(" ");
        sb.append(genre).append(" ").append(mediaWord);
        if (!eraPhrase.isBlank()) sb.append(" ").append(eraPhrase);
        if (!lengthPhrase.isBlank()) sb.append(", ").append(lengthPhrase);
        sb.append(", ").append(audiencePhrase);

        return sb.toString();
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
