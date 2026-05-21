package com.ottfinder.dto.response;

public record UserMe(
        String uid,
        String email,
        String displayName,
        String role
) {}
