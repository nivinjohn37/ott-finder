package com.ottfinder.dto.response;

public record GroupMemberDto(
        Long userId,
        String displayName,
        String role,
        String joinedAt
) {}
