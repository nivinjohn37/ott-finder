package com.ottfinder.dto.response;

import java.util.List;

public record AiUsageStatsDto(
        long totalCallsToday,
        long totalCallsThisWeek,
        long claudeCallsThisWeek,
        long cacheHitsThisWeek,
        double cacheHitRatePct,
        long totalInputTokensThisWeek,
        long totalOutputTokensThisWeek,
        double estimatedCostUsdThisWeek,
        List<FeatureStat> byFeature,
        List<DayBucket> dailyTrend
) {
    public record FeatureStat(
            String feature,
            long totalCalls,
            long claudeCalls,
            long cacheHits,
            long inputTokens,
            long outputTokens,
            double estimatedCostUsd
    ) {}

    public record DayBucket(String date, long totalCalls, long claudeCalls) {}

    // Claude Haiku 4.5 pricing (per million tokens)
    static final double INPUT_PRICE_PER_M  = 0.80;
    static final double OUTPUT_PRICE_PER_M = 4.00;

    public static double estimateCost(long inputTokens, long outputTokens) {
        return (inputTokens / 1_000_000.0 * INPUT_PRICE_PER_M)
             + (outputTokens / 1_000_000.0 * OUTPUT_PRICE_PER_M);
    }
}
