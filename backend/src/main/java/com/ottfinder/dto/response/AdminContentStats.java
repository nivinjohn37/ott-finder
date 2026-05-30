package com.ottfinder.dto.response;

import java.util.List;

public record AdminContentStats(
        List<TopReviewedMovie> topReviewedMovies,
        List<RatingBucket> ratingDistribution,
        List<PlatformCount> topPlatforms
) {
    public record TopReviewedMovie(Integer tmdbId, String title, long reviewCount, double avgRating) {}
    public record RatingBucket(int rating, long count) {}
    public record PlatformCount(String displayName, long count) {}
}
