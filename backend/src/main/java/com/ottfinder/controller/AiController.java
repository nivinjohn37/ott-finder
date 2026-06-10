package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.MovieSuggestion;
import com.ottfinder.dto.response.ReviewSummaryDto;
import com.ottfinder.service.MoodSuggestionService;
import com.ottfinder.service.NlSearchService;
import com.ottfinder.service.ReviewSummaryService;
import com.ottfinder.service.SnapSearchService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ReviewSummaryService reviewSummaryService;
    private final MoodSuggestionService moodSuggestionService;
    private final NlSearchService nlSearchService;
    private final SnapSearchService snapSearchService;

    public AiController(ReviewSummaryService reviewSummaryService,
                         MoodSuggestionService moodSuggestionService,
                         NlSearchService nlSearchService,
                         SnapSearchService snapSearchService) {
        this.reviewSummaryService = reviewSummaryService;
        this.moodSuggestionService = moodSuggestionService;
        this.nlSearchService = nlSearchService;
        this.snapSearchService = snapSearchService;
    }

    @GetMapping("/suggest")
    public ResponseEntity<ApiResponse<List<MovieSuggestion>>> suggest(
            @RequestParam String mood,
            @RequestParam String audience,
            @RequestParam String length,
            @RequestParam String language,
            @RequestParam(required = false) String era,
            @RequestParam(required = false) String mediaType,
            @RequestParam(required = false) String exclude
    ) {
        List<String> excludeTitles = (exclude != null && !exclude.isBlank())
                ? java.util.Arrays.asList(exclude.split(","))
                : java.util.Collections.emptyList();
        List<MovieSuggestion> results = moodSuggestionService
                .getSuggestions(mood, audience, length, language, era, mediaType, excludeTitles);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/nl-search")
    public ResponseEntity<ApiResponse<List<MovieSuggestion>>> nlSearch(@RequestParam String q) {
        List<MovieSuggestion> results = nlSearchService.search(q);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @PostMapping(value = "/snap-search", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MovieSuggestion>> snapSearch(
            @RequestParam("image") MultipartFile image) {
        if (image.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", "No image provided"));
        }
        String ct = image.getContentType();
        if (ct == null || !ct.startsWith("image/")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", "File must be an image"));
        }
        MovieSuggestion result = snapSearchService.identify(image);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/review-summary/{tmdbId}")
    public ResponseEntity<ApiResponse<ReviewSummaryDto>> getReviewSummary(
            @PathVariable int tmdbId,
            @RequestParam(defaultValue = "movie") String type,
            @RequestParam(defaultValue = "false") boolean spoilers,
            @RequestParam(required = false) String title
    ) {
        ReviewSummaryDto result = reviewSummaryService.getSummary(tmdbId, type, spoilers, title);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
