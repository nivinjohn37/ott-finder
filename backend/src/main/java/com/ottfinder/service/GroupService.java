package com.ottfinder.service;

import com.ottfinder.dto.response.*;
import com.ottfinder.entity.*;
import com.ottfinder.repository.*;
import com.ottfinder.security.FirebasePrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LEN = 6;
    private static final int MAX_GROUPS_PER_USER = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Value("${tmdb.image-base-url}")
    private String imageBaseUrl;

    private final WatchGroupRepository groupRepository;
    private final GroupMemberRepository memberRepository;
    private final GroupWatchlistRepository watchlistRepository;
    private final GroupWatchlistProgressRepository progressRepository;
    private final GroupSuggestionRepository suggestionRepository;
    private final GroupSuggestionVoteRepository voteRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final TMDBService tmdbService;
    private final OTTAvailabilityService ottAvailabilityService;

    // ── Groups ──────────────────────────────────────────────────────────────

    @Transactional
    public GroupDto createGroup(FirebasePrincipal principal, String name) {
        User user = requireUser(principal);
        long owned = groupRepository.findGroupsByUserId(user.getId()).stream()
                .filter(g -> g.getCreatedBy().getId().equals(user.getId()))
                .count();
        if (owned >= MAX_GROUPS_PER_USER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group limit reached");
        }

        WatchGroup group = groupRepository.save(WatchGroup.builder()
                .name(name.trim())
                .inviteCode(generateUniqueCode())
                .createdBy(user)
                .build());

        memberRepository.save(GroupMember.builder()
                .group(group)
                .user(user)
                .role("admin")
                .build());

        List<GroupMember> members = memberRepository.findByGroupIdWithUser(group.getId());
        return toGroupDto(group, members, user.getId());
    }

    @Transactional(readOnly = true)
    public List<GroupDto> getMyGroups(FirebasePrincipal principal) {
        User user = requireUser(principal);
        return groupRepository.findGroupsByUserId(user.getId()).stream()
                .map(g -> {
                    List<GroupMember> members = memberRepository.findByGroupIdWithUser(g.getId());
                    return toGroupDto(g, members, user.getId());
                })
                .toList();
    }

    @Transactional
    public GroupDto joinGroup(FirebasePrincipal principal, String inviteCode) {
        User user = requireUser(principal);
        WatchGroup group = groupRepository.findByInviteCode(inviteCode.toUpperCase().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite code"));

        if (memberRepository.existsByGroupIdAndUserId(group.getId(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already a member");
        }

        memberRepository.save(GroupMember.builder()
                .group(group)
                .user(user)
                .role("member")
                .build());

        List<GroupMember> members = memberRepository.findByGroupIdWithUser(group.getId());
        return toGroupDto(group, members, user.getId());
    }

    @Transactional
    public void leaveGroup(FirebasePrincipal principal, Long groupId) {
        User user = requireUser(principal);
        GroupMember member = memberRepository.findByGroupIdAndUserId(groupId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not a member"));
        memberRepository.delete(member);
    }

    @Transactional(readOnly = true)
    public GroupDto getGroup(FirebasePrincipal principal, Long groupId) {
        User user = requireUser(principal);
        requireMember(groupId, user.getId());
        WatchGroup group = requireGroup(groupId);
        List<GroupMember> members = memberRepository.findByGroupIdWithUser(groupId);
        return toGroupDto(group, members, user.getId());
    }

    // ── Group Watchlist ──────────────────────────────────────────────────────

    @Transactional
    public GroupWatchlistItemDto addToGroupWatchlist(
            FirebasePrincipal principal, Long groupId, Integer tmdbId, String mediaType) {

        User user = requireUser(principal);
        requireMember(groupId, user.getId());
        WatchGroup group = requireGroup(groupId);

        if (watchlistRepository.existsByGroupIdAndMovieTmdbId(groupId, tmdbId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already in group watchlist");
        }

        Movie movie = movieRepository.findByTmdbId(tmdbId)
                .orElseGet(() -> fetchAndSaveMovie(tmdbId, mediaType));

        GroupWatchlist item = watchlistRepository.save(GroupWatchlist.builder()
                .group(group)
                .movie(movie)
                .addedBy(user)
                .build());

        List<GroupMember> members = memberRepository.findByGroupIdWithUser(groupId);
        return toWatchlistItemDto(item, Collections.emptyList(), user.getId(), members.size());
    }

    @Transactional
    public GroupWatchlistItemDto toggleWatched(
            FirebasePrincipal principal, Long groupId, Long itemId) {

        User user = requireUser(principal);
        requireMember(groupId, user.getId());

        GroupWatchlist item = watchlistRepository.findById(itemId)
                .filter(i -> i.getGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));

        Optional<GroupWatchlistProgress> existing =
                progressRepository.findByGroupWatchlistItemIdAndUserId(itemId, user.getId());

        if (existing.isPresent()) {
            progressRepository.delete(existing.get());
        } else {
            progressRepository.save(GroupWatchlistProgress.builder()
                    .groupWatchlistItem(item)
                    .user(user)
                    .build());
        }

        List<GroupWatchlistProgress> progress = progressRepository.findByGroupWatchlistItemId(itemId);
        int totalMembers = (int) memberRepository.countByGroupId(groupId);
        return toWatchlistItemDto(item, progress, user.getId(), totalMembers);
    }

    @Transactional(readOnly = true)
    public List<GroupWatchlistItemDto> getGroupWatchlist(FirebasePrincipal principal, Long groupId) {
        User user = requireUser(principal);
        requireMember(groupId, user.getId());

        List<GroupWatchlist> items = watchlistRepository.findByGroupIdWithDetails(groupId);
        if (items.isEmpty()) return Collections.emptyList();

        Set<Long> itemIds = items.stream().map(GroupWatchlist::getId).collect(Collectors.toSet());
        List<GroupWatchlistProgress> allProgress = progressRepository.findByItemIds(itemIds);
        Map<Long, List<GroupWatchlistProgress>> progressByItem = allProgress.stream()
                .collect(Collectors.groupingBy(p -> p.getGroupWatchlistItem().getId()));

        int totalMembers = (int) memberRepository.countByGroupId(groupId);

        return items.stream()
                .map(item -> toWatchlistItemDto(
                        item,
                        progressByItem.getOrDefault(item.getId(), Collections.emptyList()),
                        user.getId(),
                        totalMembers))
                .toList();
    }

    // ── Leaderboard ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaderboardEntryDto> getLeaderboard(FirebasePrincipal principal, Long groupId) {
        User user = requireUser(principal);
        requireMember(groupId, user.getId());

        List<GroupMember> members = memberRepository.findByGroupIdWithUser(groupId);
        long totalItems = watchlistRepository.countByGroupId(groupId);

        List<Object[]> watchedCounts = progressRepository.countWatchedPerUserInGroup(groupId);
        Map<Long, Long> watchedByUser = watchedCounts.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> ((Number) row[1]).longValue()
                ));

        List<LeaderboardEntryDto> entries = new ArrayList<>();
        for (GroupMember m : members) {
            long watched = watchedByUser.getOrDefault(m.getUser().getId(), 0L);
            int pct = totalItems > 0 ? (int) Math.round(watched * 100.0 / totalItems) : 0;
            entries.add(new LeaderboardEntryDto(
                    m.getUser().getId(),
                    m.getUser().getDisplayName() != null ? m.getUser().getDisplayName() : "Anonymous",
                    (int) watched,
                    (int) totalItems,
                    pct,
                    0 // rank filled in below
            ));
        }

        // Sort by watched desc, then by name asc for tie-breaking
        entries.sort(Comparator.comparingInt(LeaderboardEntryDto::watchedCount).reversed()
                .thenComparing(LeaderboardEntryDto::displayName));

        // Assign ranks
        List<LeaderboardEntryDto> ranked = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            LeaderboardEntryDto e = entries.get(i);
            ranked.add(new LeaderboardEntryDto(e.userId(), e.displayName(),
                    e.watchedCount(), e.totalItems(), e.percentage(), i + 1));
        }
        return ranked;
    }

    // ── Suggestions ──────────────────────────────────────────────────────────

    @Transactional
    public GroupSuggestionDto suggestMovie(
            FirebasePrincipal principal, Long groupId, Integer tmdbId, String mediaType) {

        User user = requireUser(principal);
        requireMember(groupId, user.getId());
        WatchGroup group = requireGroup(groupId);

        if (suggestionRepository.existsByGroupIdAndMovieTmdbId(groupId, tmdbId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already suggested");
        }

        Movie movie = movieRepository.findByTmdbId(tmdbId)
                .orElseGet(() -> fetchAndSaveMovie(tmdbId, mediaType));

        GroupSuggestion suggestion = suggestionRepository.save(GroupSuggestion.builder()
                .group(group)
                .movie(movie)
                .suggestedBy(user)
                .build());

        return toSuggestionDto(suggestion, 0);
    }

    @Transactional(readOnly = true)
    public List<GroupSuggestionDto> getSuggestions(FirebasePrincipal principal, Long groupId) {
        User user = requireUser(principal);
        requireMember(groupId, user.getId());

        List<GroupSuggestion> suggestions = suggestionRepository.findByGroupIdWithDetails(groupId);
        if (suggestions.isEmpty()) return Collections.emptyList();

        Set<Long> suggestionIds = suggestions.stream().map(GroupSuggestion::getId).collect(Collectors.toSet());
        Map<Long, Short> myVotes = voteRepository
                .findByUserVotesForSuggestions(suggestionIds, user.getId()).stream()
                .collect(Collectors.toMap(v -> v.getSuggestion().getId(), GroupSuggestionVote::getVote));

        return suggestions.stream()
                .map(s -> toSuggestionDto(s, myVotes.getOrDefault(s.getId(), (short) 0)))
                .toList();
    }

    @Transactional
    public GroupSuggestionDto vote(
            FirebasePrincipal principal, Long groupId, Long suggestionId, int vote) {

        if (vote != 1 && vote != -1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vote must be 1 or -1");
        }
        User user = requireUser(principal);
        requireMember(groupId, user.getId());

        GroupSuggestion suggestion = suggestionRepository.findById(suggestionId)
                .filter(s -> s.getGroup().getId().equals(groupId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suggestion not found"));

        Optional<GroupSuggestionVote> existing =
                voteRepository.findBySuggestionIdAndUserId(suggestionId, user.getId());

        if (existing.isPresent()) {
            GroupSuggestionVote v = existing.get();
            if (v.getVote() == vote) {
                // Toggle off — remove vote
                voteRepository.delete(v);
                if (vote == 1) suggestion.setUpvotes(Math.max(0, suggestion.getUpvotes() - 1));
                else suggestion.setDownvotes(Math.max(0, suggestion.getDownvotes() - 1));
                suggestionRepository.save(suggestion);
                return toSuggestionDto(suggestion, 0);
            } else {
                // Switch vote
                if (vote == 1) {
                    suggestion.setUpvotes(suggestion.getUpvotes() + 1);
                    suggestion.setDownvotes(Math.max(0, suggestion.getDownvotes() - 1));
                } else {
                    suggestion.setDownvotes(suggestion.getDownvotes() + 1);
                    suggestion.setUpvotes(Math.max(0, suggestion.getUpvotes() - 1));
                }
                v.setVote((short) vote);
                voteRepository.save(v);
            }
        } else {
            voteRepository.save(GroupSuggestionVote.builder()
                    .suggestion(suggestion)
                    .user(user)
                    .vote((short) vote)
                    .build());
            if (vote == 1) suggestion.setUpvotes(suggestion.getUpvotes() + 1);
            else suggestion.setDownvotes(suggestion.getDownvotes() + 1);
        }

        suggestionRepository.save(suggestion);
        return toSuggestionDto(suggestion, vote);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(CODE_LEN);
            for (int i = 0; i < CODE_LEN; i++) sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
            code = sb.toString();
        } while (groupRepository.existsByInviteCode(code));
        return code;
    }

    private User requireUser(FirebasePrincipal principal) {
        return userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private WatchGroup requireGroup(Long groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
    }

    private void requireMember(Long groupId, Long userId) {
        if (!memberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this group");
        }
    }

    private GroupDto toGroupDto(WatchGroup group, List<GroupMember> members, Long currentUserId) {
        boolean isAdmin = members.stream()
                .anyMatch(m -> m.getUser().getId().equals(currentUserId) && "admin".equals(m.getRole()));
        List<GroupMemberDto> memberDtos = members.stream()
                .map(m -> new GroupMemberDto(
                        m.getUser().getId(),
                        m.getUser().getDisplayName() != null ? m.getUser().getDisplayName() : "Anonymous",
                        m.getRole(),
                        m.getJoinedAt() != null ? m.getJoinedAt().toString() : null))
                .toList();
        return new GroupDto(
                group.getId(), group.getName(), group.getInviteCode(),
                members.size(), group.getCreatedAt().toString(), isAdmin, memberDtos);
    }

    private GroupWatchlistItemDto toWatchlistItemDto(
            GroupWatchlist item,
            List<GroupWatchlistProgress> progress,
            Long currentUserId,
            int totalMembers) {

        Movie m = item.getMovie();
        List<OttAvailability> platforms = ottAvailabilityService
                .findAvailability(m.getTmdbId(), m.getMediaType(), m.getTitle());

        MovieSearchResult movie = new MovieSearchResult(
                m.getTmdbId(), m.getTitle(),
                m.getPosterPath() != null ? imageBaseUrl + m.getPosterPath() : null,
                m.getBackdropPath() != null ? imageBaseUrl + m.getBackdropPath() : null,
                m.getOverview(), m.getReleaseDate() != null ? m.getReleaseDate().toString() : null,
                m.getMediaType(), m.getVoteAverage() != null ? m.getVoteAverage().doubleValue() : null,
                platforms);

        boolean currentUserWatched = progress.stream()
                .anyMatch(p -> p.getUser().getId().equals(currentUserId));

        List<GroupWatchlistItemDto.MemberProgressDto> memberProgress = progress.stream()
                .map(p -> new GroupWatchlistItemDto.MemberProgressDto(
                        p.getUser().getDisplayName() != null ? p.getUser().getDisplayName() : "Anonymous",
                        true,
                        p.getWatchedAt() != null ? p.getWatchedAt().toString() : null))
                .toList();

        return new GroupWatchlistItemDto(
                item.getId(), movie,
                item.getAddedBy().getDisplayName() != null ? item.getAddedBy().getDisplayName() : "Anonymous",
                item.getAddedAt() != null ? item.getAddedAt().toString() : null,
                currentUserWatched, progress.size(), totalMembers, memberProgress);
    }

    private GroupSuggestionDto toSuggestionDto(GroupSuggestion s, int currentUserVote) {
        Movie m = s.getMovie();
        List<OttAvailability> platforms = ottAvailabilityService
                .findAvailability(m.getTmdbId(), m.getMediaType(), m.getTitle());
        MovieSearchResult movie = new MovieSearchResult(
                m.getTmdbId(), m.getTitle(),
                m.getPosterPath() != null ? imageBaseUrl + m.getPosterPath() : null,
                null, m.getOverview(), m.getReleaseDate() != null ? m.getReleaseDate().toString() : null,
                m.getMediaType(), m.getVoteAverage() != null ? m.getVoteAverage().doubleValue() : null,
                platforms);
        return new GroupSuggestionDto(
                s.getId(), movie,
                s.getSuggestedBy().getDisplayName() != null ? s.getSuggestedBy().getDisplayName() : "Anonymous",
                s.getUpvotes(), s.getDownvotes(), currentUserVote,
                s.getSuggestedAt() != null ? s.getSuggestedAt().toString() : null);
    }

    private Movie fetchAndSaveMovie(Integer tmdbId, String mediaType) {
        String resolvedType = "tv".equals(mediaType) ? "tv" : "movie";
        var detail = tmdbService.getDetails(tmdbId, resolvedType);
        if (detail == null) detail = tmdbService.getDetails(tmdbId, "tv".equals(resolvedType) ? "movie" : "tv");
        if (detail == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found");
        var d = detail;
        return movieRepository.save(Movie.builder()
                .tmdbId(tmdbId).title(d.title())
                .posterPath(extractPath(d.posterUrl()))
                .backdropPath(extractPath(d.backdropUrl()))
                .overview(d.overview())
                .releaseDate(parseDate(d.releaseDate()))
                .voteAverage(d.voteAverage() != null ? BigDecimal.valueOf(d.voteAverage()) : null)
                .voteCount(d.voteCount()).mediaType(resolvedType)
                .genres(d.genres() != null && !d.genres().isEmpty() ? String.join(",", d.genres()) : null)
                .build());
    }

    private String extractPath(String url) {
        if (url == null) return null;
        int idx = url.lastIndexOf("/t/p/w500");
        return idx >= 0 ? url.substring(idx + 9) : url;
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) return null;
        try { return LocalDate.parse(date); } catch (Exception e) { return null; }
    }
}
