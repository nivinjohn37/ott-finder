package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.service.MovieSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieSearchService movieSearchService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<MovieSearchResult>>> search(
            @RequestParam(required = false) String q) {

        if (q == null || q.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("VALIDATION_ERROR", "Search query 'q' is required"));
        }

        List<MovieSearchResult> results = movieSearchService.search(q.trim());
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<List<MovieSearchResult>>> trending() {
        return ResponseEntity.ok(ApiResponse.success(movieSearchService.getTrending()));
    }

    @GetMapping("/{tmdbId}")
    public ResponseEntity<ApiResponse<MovieDetail>> getDetail(
            @PathVariable Integer tmdbId,
            @RequestParam(required = false) String type) {

        MovieDetail detail = movieSearchService.getMovieDetail(tmdbId, type);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }
}
