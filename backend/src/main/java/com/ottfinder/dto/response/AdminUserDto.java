package com.ottfinder.dto.response;

import java.time.OffsetDateTime;

public record AdminUserDto(
        Long id,
        String email,
        String displayName,
        String role,
        OffsetDateTime joinedAt,
        long watchlistCount,
        long reviewCount,
        boolean blacklisted
) {}
