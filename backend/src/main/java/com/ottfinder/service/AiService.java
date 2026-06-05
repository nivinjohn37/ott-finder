package com.ottfinder.service;

import com.ottfinder.dto.response.AiSuggestion;

import java.util.List;

public interface AiService {
    String summariseMovie(String title, String overview, String genres,
                          Double rating, Integer voteCount, Integer year,
                          List<String> reviews, boolean spoilers);

    List<AiSuggestion> suggestMovies(String mood, String audience, String length, String language);
    List<AiSuggestion> suggestMovies(String mood, String audience, String length, String language, String era);
    List<AiSuggestion> suggestMovies(String mood, String audience, String length, String language,
                                     String era, String mediaType, List<String> excludeTitles);

    List<AiSuggestion> interpretNlQuery(String query);

    boolean isAvailable();
}
