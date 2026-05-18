package com.ottfinder.controller;

import com.ottfinder.dto.request.AddToWatchlistRequest;
import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.WatchlistItem;
import com.ottfinder.security.FirebasePrincipal;
import com.ottfinder.service.WatchlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WatchlistItem>>> getWatchlist(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                watchlistService.getWatchlist(principal(auth))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WatchlistItem>> addToWatchlist(
            @Valid @RequestBody AddToWatchlistRequest request,
            Authentication auth) {

        WatchlistItem item = watchlistService.addToWatchlist(
                principal(auth), request.movieId(), request.resolvedMediaType());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(item));
    }

    @DeleteMapping("/{watchlistId}")
    public ResponseEntity<Void> removeFromWatchlist(
            @PathVariable Long watchlistId,
            Authentication auth) {

        watchlistService.removeFromWatchlist(principal(auth), watchlistId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/expiring")
    public ResponseEntity<ApiResponse<List<WatchlistItem>>> getExpiring(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                watchlistService.getExpiring(principal(auth))));
    }

    private FirebasePrincipal principal(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof FirebasePrincipal p)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return p;
    }
}
