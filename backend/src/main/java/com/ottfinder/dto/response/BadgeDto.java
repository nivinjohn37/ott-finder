package com.ottfinder.dto.response;

import java.time.OffsetDateTime;

public record BadgeDto(String badgeType, OffsetDateTime earnedAt) {}
