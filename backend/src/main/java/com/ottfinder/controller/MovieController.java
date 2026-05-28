package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.PersonFilmography;
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
    public ResponseEntity<ApiResponse<List<MovieSearchResult>>> trending(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String region) {
        return ResponseEntity.ok(ApiResponse.success(movieSearchService.getTrending(region)));
    }

    @GetMapping("/person/{personId}")
    public ResponseEntity<ApiResponse<PersonFilmography>> getPersonFilmography(
            @PathVariable Integer personId) {
        PersonFilmography filmography = movieSearchService.getPersonFilmography(personId);
        if (filmography == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("PERSON_NOT_FOUND", "Person not found"));
        }
        return ResponseEntity.ok(ApiResponse.success(filmography));
    }

    @GetMapping("/genre")
    public ResponseEntity<ApiResponse<List<MovieSearchResult>>> getGenreMovies(
            @RequestParam String name,
            @RequestParam(defaultValue = "movie") String mediaType) {
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("VALIDATION_ERROR", "Genre name is required"));
        }
        return ResponseEntity.ok(ApiResponse.success(
                movieSearchService.getGenreMovies(name.trim(), mediaType)));
    }

    @GetMapping("/{tmdbId}")
    public ResponseEntity<ApiResponse<MovieDetail>> getDetail(
            @PathVariable Integer tmdbId,
            @RequestParam(required = false) String type) {

        MovieDetail detail = movieSearchService.getMovieDetail(tmdbId, type);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }
}
