package com.ottfinder.dto.response;

import java.util.List;

public record GroupDto(
        Long id,
        String name,
        String inviteCode,
        int memberCount,
        String createdAt,
        boolean isAdmin,
        List<GroupMemberDto> members
) {}
