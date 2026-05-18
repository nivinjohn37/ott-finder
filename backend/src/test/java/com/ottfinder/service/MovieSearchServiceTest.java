package com.ottfinder.service;

import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.repository.MovieRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MovieSearchServiceTest {

    @Mock TMDBService tmdbService;
    @Mock OTTAvailabilityService ottService;
    @Mock MovieRepository movieRepository;

    // Inline executor to run tasks synchronously in tests
    private final Executor syncExecutor = Runnable::run;

    MovieSearchService movieSearchService;

    @BeforeEach
    void setup() {
        movieSearchService = new MovieSearchService(tmdbService, ottService, movieRepository, syncExecutor);
    }

    @Test
    void search_mergesTMDBResultsWithOTTPlatforms() {
        MovieSearchResult tmdbResult = new MovieSearchResult(
                693134, "Dune: Part Two", "/poster.jpg", null, "Epic sci-fi",
                "2024-02-27", "movie", 8.2, Collections.emptyList());

        OttAvailability netflix = new OttAvailability("netflix", "Netflix", "/logo.png",
                "https://netflix.com/title/...", null);

        when(tmdbService.search("Dune")).thenReturn(List.of(tmdbResult));
        when(ottService.findAvailability(693134, "movie", "Dune: Part Two"))
                .thenReturn(List.of(netflix));
        when(movieRepository.existsByTmdbId(anyInt())).thenReturn(true);

        List<MovieSearchResult> results = movieSearchService.search("Dune");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).platforms()).hasSize(1);
        assertThat(results.get(0).platforms().get(0).platformName()).isEqualTo("netflix");
    }

    @Test
    void search_emptyTMDBResult_returnsEmptyList() {
        when(tmdbService.search(anyString())).thenReturn(Collections.emptyList());

        List<MovieSearchResult> results = movieSearchService.search("unknown movie xyzabc");

        assertThat(results).isEmpty();
        verifyNoInteractions(ottService);
    }

    @Test
    void search_ottServiceFails_returnsTMDBDataWithEmptyPlatforms() {
        MovieSearchResult tmdbResult = new MovieSearchResult(
                1, "Some Movie", null, null, null, null, "movie", 7.0, Collections.emptyList());

        when(tmdbService.search("test")).thenReturn(List.of(tmdbResult));
        when(ottService.findAvailability(anyInt(), anyString(), anyString()))
                .thenThrow(new RuntimeException("JustWatch down"));
        when(movieRepository.existsByTmdbId(anyInt())).thenReturn(true);

        List<MovieSearchResult> results = movieSearchService.search("test");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).platforms()).isEmpty();
    }

    @Test
    void search_persistsNewMoviesInBackground() {
        MovieSearchResult tmdbResult = new MovieSearchResult(
                999, "New Movie", null, null, null, "2024-01-01", "movie", 7.5, Collections.emptyList());

        when(tmdbService.search("new")).thenReturn(List.of(tmdbResult));
        when(ottService.findAvailability(anyInt(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());
        when(movieRepository.existsByTmdbId(999)).thenReturn(false);

        movieSearchService.search("new");

        verify(movieRepository).existsByTmdbId(999);
        verify(movieRepository).save(any());
    }
}
