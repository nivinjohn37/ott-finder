package com.ottfinder.dto.response;

public record CrewMember(
        Integer personId,
        String name,
        String job,
        String profileUrl
) {}
