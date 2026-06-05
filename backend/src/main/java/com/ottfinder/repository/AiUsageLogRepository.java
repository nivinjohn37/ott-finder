package com.ottfinder.repository;

import com.ottfinder.entity.AiUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, Long> {

    @Query("""
        SELECT l.feature,
               COUNT(l),
               SUM(CASE WHEN l.cacheHit = TRUE THEN 1 ELSE 0 END),
               COALESCE(SUM(l.inputTokens), 0),
               COALESCE(SUM(l.outputTokens), 0)
        FROM AiUsageLog l
        WHERE l.createdAt >= :since
        GROUP BY l.feature
        ORDER BY l.feature
        """)
    List<Object[]> featureStats(OffsetDateTime since);

    @Query("""
        SELECT DATE(l.createdAt), COUNT(l),
               SUM(CASE WHEN l.cacheHit = FALSE THEN 1 ELSE 0 END)
        FROM AiUsageLog l
        WHERE l.createdAt >= :since
        GROUP BY DATE(l.createdAt)
        ORDER BY DATE(l.createdAt) ASC
        """)
    List<Object[]> dailyTrend(OffsetDateTime since);

    long countByCacheHitFalseAndCreatedAtAfter(OffsetDateTime since);

    long countByCreatedAtAfter(OffsetDateTime since);
}
