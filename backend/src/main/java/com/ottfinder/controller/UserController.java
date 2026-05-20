package com.ottfinder.controller;

import com.ottfinder.dto.response.ApiResponse;
import com.ottfinder.entity.User;
import com.ottfinder.repository.UserRepository;
import com.ottfinder.security.FirebasePrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;

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
