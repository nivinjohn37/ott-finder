package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.MovieSuggestion;
import com.ottfinder.dto.response.ReviewSummaryDto;
import com.ottfinder.service.MoodSuggestionService;
import com.ottfinder.service.ReviewSummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ReviewSummaryService reviewSummaryService;
    private final MoodSuggestionService moodSuggestionService;

    public AiController(ReviewSummaryService reviewSummaryService,
                         MoodSuggestionService moodSuggestionService) {
        this.reviewSummaryService = reviewSummaryService;
        this.moodSuggestionService = moodSuggestionService;
    }

    @GetMapping("/suggest")
    public ResponseEntity<ApiResponse<List<MovieSuggestion>>> suggest(
            @RequestParam String mood,
            @RequestParam String audience,
            @RequestParam String length,
            @RequestParam String language
    ) {
        List<MovieSuggestion> results = moodSuggestionService.getSuggestions(mood, audience, length, language);
        return ResponseEntity.ok(ApiResponse.success(results));
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
