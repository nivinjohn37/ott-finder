package com.ottfinder.dto.response;

import java.time.OffsetDateTime;

public record ReviewDto(
        Long id,
        String userDisplayName,
        String userAvatarUrl,
        int rating,
        String note,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean isOwn,
        long likeCount,
        boolean isLikedByMe,
        int reportCount
) {}
