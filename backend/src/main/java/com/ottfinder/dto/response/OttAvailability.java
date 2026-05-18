package com.ottfinder.dto.response;

public record OttAvailability(
        String platformName,
        String displayName,
        String logoUrl,
        String deepLink,
        String availableUntil
) {}
