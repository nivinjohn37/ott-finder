package com.ottfinder.service;

import com.ottfinder.entity.AiUsageLog;
import com.ottfinder.repository.AiUsageLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiUsageService {

    private final AiUsageLogRepository repository;

    @Async("apiCallExecutor")
    public void logCacheHit(String feature) {
        try {
            repository.save(AiUsageLog.builder()
                    .feature(feature)
                    .cacheHit(true)
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to log AI cache hit for {}: {}", feature, ex.getMessage());
        }
    }

    @Async("apiCallExecutor")
    public void logClaudeCall(String feature, int inputTokens, int outputTokens) {
        try {
            repository.save(AiUsageLog.builder()
                    .feature(feature)
                    .cacheHit(false)
                    .inputTokens(inputTokens)
                    .outputTokens(outputTokens)
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to log AI usage for {}: {}", feature, ex.getMessage());
        }
    }
}
