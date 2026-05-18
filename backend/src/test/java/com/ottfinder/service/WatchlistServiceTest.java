package com.ottfinder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.WatchlistItem;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.User;
import com.ottfinder.entity.Watchlist;
import com.ottfinder.exception.WatchlistLimitException;
import com.ottfinder.repository.MovieAvailabilityRepository;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchlistRepository;
import com.ottfinder.security.FirebasePrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WatchlistServiceTest {

    @Mock WatchlistRepository watchlistRepository;
    @Mock UserRepository userRepository;
    @Mock MovieRepository movieRepository;
    @Mock MovieAvailabilityRepository availabilityRepository;
    @Mock TMDBService tmdbService;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;
    @Mock ObjectMapper objectMapper;

    @InjectMocks WatchlistService watchlistService;

    private final FirebasePrincipal principal =
            new FirebasePrincipal("uid-123", "test@example.com", "Test User");
    private final User user =
            User.builder().id(1L).firebaseUid("uid-123").email("test@example.com").build();
    private final Movie movie =
            Movie.builder().id(10L).tmdbId(693134).title("Dune: Part Two").mediaType("movie").build();

    @Test
    void addToWatchlist_success() {
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(user));
        when(watchlistRepository.countByUserId(1L)).thenReturn(0L);
        when(movieRepository.findByTmdbId(693134)).thenReturn(Optional.of(movie));
        Watchlist saved = Watchlist.builder().id(1L).user(user).movie(movie).build();
        when(watchlistRepository.save(any())).thenReturn(saved);
        when(availabilityRepository.findByMovieIdWithPlatform(10L)).thenReturn(Collections.emptyList());
        when(redisTemplate.delete(anyString())).thenReturn(true);

        WatchlistItem result = watchlistService.addToWatchlist(principal, 693134, "movie");

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.movie().title()).isEqualTo("Dune: Part Two");
        verify(watchlistRepository).save(any());
    }

    @Test
    void addToWatchlist_freeTierLimitExceeded_throwsException() {
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(user));
        when(watchlistRepository.countByUserId(1L)).thenReturn(3L);

        assertThatThrownBy(() -> watchlistService.addToWatchlist(principal, 693134, "movie"))
                .isInstanceOf(WatchlistLimitException.class);

        verify(watchlistRepository, never()).save(any());
    }

    @Test
    void getWatchlist_cacheHit_returnsCachedData() throws Exception {
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(user));
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.get("watchlist:user:1")).thenReturn("[{\"id\":1}]");
        when(objectMapper.readValue(anyString(), any(com.fasterxml.jackson.core.type.TypeReference.class)))
                .thenReturn(List.of());

        watchlistService.getWatchlist(principal);

        verify(watchlistRepository, never()).findByUserIdWithMovie(any());
    }

    @Test
    void removeFromWatchlist_invalidatesCache() {
        Watchlist entry = Watchlist.builder().id(5L).user(user).movie(movie).build();
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(user));
        when(watchlistRepository.findById(5L)).thenReturn(Optional.of(entry));
        when(redisTemplate.delete(anyString())).thenReturn(true);

        watchlistService.removeFromWatchlist(principal, 5L);

        verify(watchlistRepository).delete(entry);
        verify(redisTemplate).delete("watchlist:user:1");
    }

    @Test
    void addToWatchlist_userNotInDB_createsUser() {
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(watchlistRepository.countByUserId(1L)).thenReturn(0L);
        when(movieRepository.findByTmdbId(693134)).thenReturn(Optional.of(movie));
        Watchlist saved = Watchlist.builder().id(1L).user(user).movie(movie).build();
        when(watchlistRepository.save(any(Watchlist.class))).thenReturn(saved);
        when(availabilityRepository.findByMovieIdWithPlatform(10L)).thenReturn(Collections.emptyList());
        when(redisTemplate.delete(anyString())).thenReturn(true);

        watchlistService.addToWatchlist(principal, 693134, "movie");

        verify(userRepository).save(any(User.class));
    }
}
