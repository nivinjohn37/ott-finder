package com.ottfinder.dto.response;

import java.time.OffsetDateTime;

public record ReviewDto(
        Long id,
        String userDisplayName,
        String userAvatarUrl,
        int rating,
        String note,
        OffsetDateTime createdAt,
        boolean isOwn
) {}
