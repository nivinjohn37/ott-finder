package com.ottfinder.dto.response;

import java.util.List;

public record ReviewsResponse(
        long totalReviews,
        double averageRating,
        ReviewDto myReview,
        List<ReviewDto> reviews
) {}
