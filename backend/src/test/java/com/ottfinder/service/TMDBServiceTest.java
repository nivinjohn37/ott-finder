package com.ottfinder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.MovieSearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TMDBServiceTest {

    @Mock RestTemplate restTemplate;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;

    // Manually constructed — @InjectMocks can't resolve ObjectMapper (final field, no mock)
    TMDBService tmdbService;

    @BeforeEach
    void setup() {
        tmdbService = new TMDBService(restTemplate, redisTemplate, new ObjectMapper());
        ReflectionTestUtils.setField(tmdbService, "apiKey", "test-key");
        ReflectionTestUtils.setField(tmdbService, "baseUrl", "https://api.themoviedb.org/3");
        ReflectionTestUtils.setField(tmdbService, "imageBaseUrl", "https://image.tmdb.org/t/p/w500");
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
    }

    @Test
    void search_cacheMiss_callsTMDBAndReturnsResults() throws Exception {
        when(valueOps.get(anyString())).thenReturn(null);
        byte[] body = new ObjectMapper().writeValueAsBytes(Map.of("results", List.of(
                Map.of("id", 693134, "media_type", "movie", "title", "Dune: Part Two",
                        "overview", "Epic sci-fi", "release_date", "2024-02-27",
                        "vote_average", 8.2, "vote_count", 5000,
                        "poster_path", "/poster.jpg")
        )));
        when(restTemplate.getForObject(anyString(), eq(byte[].class))).thenReturn(body);

        List<MovieSearchResult> results = tmdbService.search("Dune");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).title()).isEqualTo("Dune: Part Two");
        assertThat(results.get(0).tmdbId()).isEqualTo(693134);
        assertThat(results.get(0).posterUrl()).contains("/poster.jpg");
        verify(valueOps).set(anyString(), anyString(), any());
    }

    @Test
    void search_cacheHit_returnsCachedResultsWithoutCallingTMDB() throws Exception {
        String cached = new ObjectMapper().writeValueAsString(List.of(
                Map.of("tmdbId", 1, "title", "Cached Movie", "mediaType", "movie",
                        "voteAverage", 7.5, "platforms", List.of())
        ));
        when(valueOps.get(anyString())).thenReturn(cached);

        tmdbService.search("anything");

        verify(restTemplate, never()).getForObject(anyString(), any());
    }

    @Test
    void search_apiFailure_returnsEmptyList() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(restTemplate.getForObject(anyString(), eq(byte[].class)))
                .thenThrow(new RestClientException("connection refused"));

        List<MovieSearchResult> results = tmdbService.search("Dune");

        assertThat(results).isEmpty();
    }

    @Test
    void search_filtersOutPersonResults() throws Exception {
        when(valueOps.get(anyString())).thenReturn(null);
        byte[] body = new ObjectMapper().writeValueAsBytes(Map.of("results", List.of(
                Map.of("id", 1, "media_type", "movie", "title", "A Movie",
                        "vote_average", 7.0, "vote_count", 100),
                Map.of("id", 2, "media_type", "person", "name", "An Actor")
        )));
        when(restTemplate.getForObject(anyString(), eq(byte[].class))).thenReturn(body);

        List<MovieSearchResult> results = tmdbService.search("test");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).tmdbId()).isEqualTo(1);
    }
}
