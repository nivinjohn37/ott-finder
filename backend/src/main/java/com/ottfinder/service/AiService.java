package com.ottfinder.service;

import java.util.List;

public interface AiService {
    String summariseMovie(String title, String overview, String genres,
                          Double rating, Integer voteCount, Integer year,
                          List<String> reviews, boolean spoilers);
    boolean isAvailable();
}
