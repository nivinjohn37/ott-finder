package com.ottfinder.dto.response;

import java.time.OffsetDateTime;

public record AdminReviewDto(
        Long id,
        Integer movieTmdbId,
        String movieTitle,
        String userDisplayName,
        String userEmail,
        int rating,
        String note,
        OffsetDateTime createdAt,
        long likeCount,
        int reportCount
) {}
