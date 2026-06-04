package com.ottfinder.service;

import java.util.List;

public interface AiService {
    String reviewSummary(String movieTitle, List<String> reviews, boolean spoilers);
    boolean isAvailable();
}
