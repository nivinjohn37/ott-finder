package com.ottfinder.dto.response;

import java.util.List;

public record ReviewSummaryDto(String summary, List<String> keywords, boolean spoilers) {}
