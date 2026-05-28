package com.ottfinder.controller;

import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.service.MovieSearchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import com.ottfinder.config.SecurityConfig;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MovieController.class)
@Import(SecurityConfig.class)
class MovieControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean MovieSearchService movieSearchService;

    @Test
    void search_returnsResultsWithApiResponseEnvelope() throws Exception {
        MovieSearchResult result = new MovieSearchResult(
                693134, "Dune: Part Two", "/poster.jpg", null, "Epic",
                "2024-02-27", "movie", 8.2, Collections.emptyList());

        when(movieSearchService.search("Dune")).thenReturn(List.of(result));

        mockMvc.perform(get("/api/movies/search").param("q", "Dune"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].tmdbId").value(693134))
                .andExpect(jsonPath("$.data[0].title").value("Dune: Part Two"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void search_missingQuery_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/movies/search"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void search_emptyResults_returnsEmptyArray() throws Exception {
        when(movieSearchService.search(anyString())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/movies/search").param("q", "xyznotfound"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void getDetail_returnsMovieWithPlatforms() throws Exception {
        MovieDetail detail = new MovieDetail(
                693134, "Dune: Part Two", "/poster.jpg", "/backdrop.jpg",
                "Epic sci-fi", "2024-02-27", "movie", 8.2, 5000, Collections.emptyList(),
                null, null, null, Collections.emptyList(), Collections.emptyList(), Collections.emptyList());

        when(movieSearchService.getMovieDetail(693134, null)).thenReturn(detail);

        mockMvc.perform(get("/api/movies/693134"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tmdbId").value(693134))
                .andExpect(jsonPath("$.data.title").value("Dune: Part Two"));
    }

    @Test
    void getDetail_movieNotFound_returns404() throws Exception {
        when(movieSearchService.getMovieDetail(anyInt(), any()))
                .thenThrow(new com.ottfinder.exception.MovieNotFoundException(9999));

        mockMvc.perform(get("/api/movies/9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("MOVIE_NOT_FOUND"));
    }

    @Test
    void trending_returnsResults() throws Exception {
        when(movieSearchService.getTrending(null, null)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/movies/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
