package com.ottfinder.controller;

import com.ottfinder.dto.response.*;
import com.ottfinder.security.FirebasePrincipal;
import com.ottfinder.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    public record CreateGroupRequest(String name) {}
    public record JoinGroupRequest(String inviteCode) {}
    public record AddMovieRequest(Integer tmdbId, String mediaType) {}
    public record SuggestMovieRequest(Integer tmdbId, String mediaType) {}
    public record VoteRequest(int vote) {}

    // ── Group CRUD ─────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<GroupDto>> createGroup(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody CreateGroupRequest body) {
        requireAuth(principal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(groupService.createGroup(principal, body.name())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<GroupDto>>> getMyGroups(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(groupService.getMyGroups(principal)));
    }

    @PostMapping("/join")
    public ResponseEntity<ApiResponse<GroupDto>> joinGroup(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody JoinGroupRequest body) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(groupService.joinGroup(principal, body.inviteCode())));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupDto>> getGroup(
            @PathVariable Long groupId,
            @AuthenticationPrincipal FirebasePrincipal principal) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(groupService.getGroup(principal, groupId)));
    }

    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @PathVariable Long groupId,
            @AuthenticationPrincipal FirebasePrincipal principal) {
        requireAuth(principal);
        groupService.leaveGroup(principal, groupId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ── Group Watchlist ────────────────────────────────────────────────────

    @GetMapping("/{groupId}/watchlist")
    public ResponseEntity<ApiResponse<List<GroupWatchlistItemDto>>> getWatchlist(
            @PathVariable Long groupId,
            @AuthenticationPrincipal FirebasePrincipal principal) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(groupService.getGroupWatchlist(principal, groupId)));
    }

    @PostMapping("/{groupId}/watchlist")
    public ResponseEntity<ApiResponse<GroupWatchlistItemDto>> addToWatchlist(
            @PathVariable Long groupId,
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody AddMovieRequest body) {
        requireAuth(principal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        groupService.addToGroupWatchlist(principal, groupId, body.tmdbId(), body.mediaType())));
    }

    @PatchMapping("/{groupId}/watchlist/{itemId}/watched")
    public ResponseEntity<ApiResponse<GroupWatchlistItemDto>> toggleWatched(
            @PathVariable Long groupId,
            @PathVariable Long itemId,
            @AuthenticationPrincipal FirebasePrincipal principal) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(groupService.toggleWatched(principal, groupId, itemId)));
    }

    // ── Leaderboard ────────────────────────────────────────────────────────

    @GetMapping("/{groupId}/leaderboard")
    public ResponseEntity<ApiResponse<List<LeaderboardEntryDto>>> getLeaderboard(
            @PathVariable Long groupId,
            @AuthenticationPrincipal FirebasePrincipal principal) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(groupService.getLeaderboard(principal, groupId)));
    }

    // ── Suggestions ────────────────────────────────────────────────────────

    @GetMapping("/{groupId}/suggestions")
    public ResponseEntity<ApiResponse<List<GroupSuggestionDto>>> getSuggestions(
            @PathVariable Long groupId,
            @AuthenticationPrincipal FirebasePrincipal principal) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(groupService.getSuggestions(principal, groupId)));
    }

    @PostMapping("/{groupId}/suggestions")
    public ResponseEntity<ApiResponse<GroupSuggestionDto>> suggest(
            @PathVariable Long groupId,
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody SuggestMovieRequest body) {
        requireAuth(principal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        groupService.suggestMovie(principal, groupId, body.tmdbId(), body.mediaType())));
    }

    @PostMapping("/{groupId}/suggestions/{suggestionId}/vote")
    public ResponseEntity<ApiResponse<GroupSuggestionDto>> vote(
            @PathVariable Long groupId,
            @PathVariable Long suggestionId,
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody VoteRequest body) {
        requireAuth(principal);
        return ResponseEntity.ok(ApiResponse.success(
                groupService.vote(principal, groupId, suggestionId, body.vote())));
    }

    private void requireAuth(FirebasePrincipal principal) {
        if (principal == null) throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Authentication required");
    }
}
