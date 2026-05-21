package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.dto.response.UserMe;
import com.ottfinder.dto.response.UserPreferencesDto;
import com.ottfinder.dto.response.UserStats;
import com.ottfinder.entity.User;
import com.ottfinder.entity.UserPreference;
import com.ottfinder.entity.Watchlist;
import com.ottfinder.repository.UserPreferenceRepository;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.repository.WatchlistRepository;
import com.ottfinder.security.FirebasePrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;
    private final WatchlistRepository watchlistRepository;
    private final UserPreferenceRepository userPreferenceRepository;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserMe>> getMe(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Authentication required"));
        }
        return userRepository.findByFirebaseUid(principal.uid())
                .map(u -> ResponseEntity.ok(ApiResponse.success(
                        new UserMe(u.getFirebaseUid(), u.getEmail(), u.getDisplayName(), u.getRole()))))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("USER_NOT_FOUND", "User not found")));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<UserStats>> getStats(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Authentication required"));
        }
        User user = userRepository.findByFirebaseUid(principal.uid()).orElse(null);
        if (user == null) return ResponseEntity.ok(ApiResponse.success(new UserStats(null, 0, 0)));

        List<Watchlist> watchlist = watchlistRepository.findByUserIdWithMovie(user.getId());
        long total = watchlist.size();
        long watched = watchlist.stream().filter(w -> w.getWatchedAt() != null).count();

        String favouriteGenre = watchlist.stream()
                .map(w -> w.getMovie().getGenres())
                .filter(g -> g != null && !g.isBlank())
                .flatMap(g -> Arrays.stream(g.split(",")))
                .map(String::trim)
                .filter(g -> !g.isBlank())
                .collect(Collectors.groupingBy(g -> g, Collectors.counting()))
                .entrySet().stream()
                .max(Comparator.comparingLong(Map.Entry::getValue))
                .map(Map.Entry::getKey)
                .orElse(null);

        return ResponseEntity.ok(ApiResponse.success(new UserStats(favouriteGenre, total, watched)));
    }

    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<UserPreferencesDto>> getPreferences(
            @AuthenticationPrincipal FirebasePrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Authentication required"));
        }
        User user = userRepository.findByFirebaseUid(principal.uid()).orElse(null);
        if (user == null) return ResponseEntity.ok(ApiResponse.success(new UserPreferencesDto(List.of(), List.of())));

        List<UserPreference> prefs = userPreferenceRepository.findByUserId(user.getId());
        List<String> genres = prefs.stream().filter(p -> "genre".equals(p.getPreferenceType())).map(UserPreference::getValue).toList();
        List<String> platforms = prefs.stream().filter(p -> "platform".equals(p.getPreferenceType())).map(UserPreference::getValue).toList();

        return ResponseEntity.ok(ApiResponse.success(new UserPreferencesDto(genres, platforms)));
    }

    @PutMapping("/preferences")
    @Transactional
    public ResponseEntity<ApiResponse<UserPreferencesDto>> savePreferences(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestBody UserPreferencesDto body) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Authentication required"));
        }
        User user = userRepository.findByFirebaseUid(principal.uid())
                .orElseThrow(() -> new RuntimeException("User not found"));

        userPreferenceRepository.deleteByUserId(user.getId());

        List<UserPreference> newPrefs = new java.util.ArrayList<>();
        if (body.genres() != null) {
            body.genres().forEach(g -> newPrefs.add(
                    UserPreference.builder().user(user).preferenceType("genre").value(g).build()));
        }
        if (body.platforms() != null) {
            body.platforms().forEach(p -> newPrefs.add(
                    UserPreference.builder().user(user).preferenceType("platform").value(p).build()));
        }
        userPreferenceRepository.saveAll(newPrefs);

        return ResponseEntity.ok(ApiResponse.success(body));
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadAvatar(
            @AuthenticationPrincipal FirebasePrincipal principal,
            @RequestParam("file") MultipartFile file) {

        if (principal == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("UNAUTHORIZED", "Authentication required"));
        }
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("VALIDATION_ERROR", "File is empty"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("VALIDATION_ERROR", "File must be an image"));
        }
        if (file.getSize() > 2L * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("VALIDATION_ERROR", "File must be under 2MB"));
        }

        try {
            User user = userRepository.findByFirebaseUid(principal.uid())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            user.setAvatarData(file.getBytes());
            user.setAvatarContentType(contentType);
            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("/api/user/avatar/" + principal.uid()));
        } catch (Exception e) {
            log.error("Avatar upload failed for uid={}: {}", principal.uid(), e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("INTERNAL_ERROR", "Avatar upload failed"));
        }
    }

    @GetMapping("/avatar/{uid}")
    public ResponseEntity<byte[]> getAvatar(@PathVariable String uid) {
        return userRepository.findByFirebaseUid(uid)
                .filter(u -> u.getAvatarData() != null)
                .map(u -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(u.getAvatarContentType()))
                        .body(u.getAvatarData()))
                .orElse(ResponseEntity.notFound().build());
    }
}
