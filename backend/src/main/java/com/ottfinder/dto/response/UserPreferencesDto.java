package com.ottfinder.dto.response;

import java.util.List;

public record UserPreferencesDto(
        List<String> genres,
        List<String> platforms
) {}
