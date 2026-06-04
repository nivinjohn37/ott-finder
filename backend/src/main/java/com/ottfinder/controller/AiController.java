package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.ReviewSummaryDto;
import com.ottfinder.service.ReviewSummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ReviewSummaryService reviewSummaryService;

    public AiController(ReviewSummaryService reviewSummaryService) {
        this.reviewSummaryService = reviewSummaryService;
    }

    @GetMapping("/review-summary/{tmdbId}")
    public ResponseEntity<ApiResponse<ReviewSummaryDto>> getReviewSummary(
            @PathVariable int tmdbId,
            @RequestParam(defaultValue = "movie") String type,
            @RequestParam(defaultValue = "false") boolean spoilers
    ) {
        ReviewSummaryDto result = reviewSummaryService.getSummary(tmdbId, type, spoilers);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
