-- Widen ai_usage_logs.feature CHECK to include 'snap-search'
ALTER TABLE ai_usage_logs DROP CONSTRAINT IF EXISTS ai_usage_logs_feature_check;
ALTER TABLE ai_usage_logs ADD CONSTRAINT ai_usage_logs_feature_check
    CHECK (feature IN ('review-summary', 'suggest', 'nl-search', 'snap-search'));
