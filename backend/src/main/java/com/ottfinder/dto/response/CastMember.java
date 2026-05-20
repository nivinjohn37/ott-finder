package com.ottfinder.dto.response;

public record CastMember(
        Integer personId,
        String name,
        String character,
        String profileUrl
) {}
