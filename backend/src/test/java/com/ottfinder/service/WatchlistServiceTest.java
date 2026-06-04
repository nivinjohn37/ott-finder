package com.ottfinder.service;

import com.ottfinder.dto.response.WatchlistItem;
import com.ottfinder.entity.Movie;
import com.ottfinder.entity.User;
import com.ottfinder.entity.Watchlist;
import com.ottfinder.exception.WatchlistLimitException;
import com.ottfinder.repository.MovieRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchlistRepository;
import com.ottfinder.security.FirebasePrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WatchlistServiceTest {

    @Mock WatchlistRepository watchlistRepository;
    @Mock UserRepository userRepository;
    @Mock MovieRepository movieRepository;
    @Mock TMDBService tmdbService;
    @Mock OTTAvailabilityService ottAvailabilityService;
    @Mock ApplicationEventPublisher eventPublisher;

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
        when(ottAvailabilityService.findAvailability(anyInt(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());

        WatchlistItem result = watchlistService.addToWatchlist(principal, 693134, "movie");

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.movie().title()).isEqualTo("Dune: Part Two");
        verify(watchlistRepository).save(any());
        verify(eventPublisher).publishEvent(any(BadgeCheckEvent.class));
    }

    @Test
    void addToWatchlist_freeTierLimitExceeded_throwsException() {
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(user));
        when(watchlistRepository.countByUserId(1L)).thenReturn(5L);

        assertThatThrownBy(() -> watchlistService.addToWatchlist(principal, 693134, "movie"))
                .isInstanceOf(WatchlistLimitException.class);

        verify(watchlistRepository, never()).save(any());
    }

    @Test
    void getWatchlist_returnsItemsFromRepository() {
        Watchlist entry = Watchlist.builder().id(1L).user(user).movie(movie).build();
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(user));
        when(watchlistRepository.findByUserIdWithMovie(1L)).thenReturn(java.util.List.of(entry));
        when(ottAvailabilityService.findAvailability(anyInt(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());

        java.util.List<WatchlistItem> result = watchlistService.getWatchlist(principal);

        assertThat(result).hasSize(1);
        verify(watchlistRepository).findByUserIdWithMovie(1L);
    }

    @Test
    void removeFromWatchlist_deletesEntry() {
        Watchlist entry = Watchlist.builder().id(5L).user(user).movie(movie).build();
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.of(user));
        when(watchlistRepository.findById(5L)).thenReturn(Optional.of(entry));

        watchlistService.removeFromWatchlist(principal, 5L);

        verify(watchlistRepository).delete(entry);
    }

    @Test
    void addToWatchlist_userNotInDB_createsUser() {
        when(userRepository.findByFirebaseUid("uid-123")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(watchlistRepository.countByUserId(1L)).thenReturn(0L);
        when(movieRepository.findByTmdbId(693134)).thenReturn(Optional.of(movie));
        Watchlist saved = Watchlist.builder().id(1L).user(user).movie(movie).build();
        when(watchlistRepository.save(any(Watchlist.class))).thenReturn(saved);
        when(ottAvailabilityService.findAvailability(anyInt(), anyString(), anyString()))
                .thenReturn(Collections.emptyList());

        watchlistService.addToWatchlist(principal, 693134, "movie");

        verify(userRepository).save(any(User.class));
    }
}
