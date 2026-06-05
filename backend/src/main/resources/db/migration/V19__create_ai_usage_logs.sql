CREATE TABLE ai_usage_logs (
    id            BIGSERIAL PRIMARY KEY,
    feature       VARCHAR(30) NOT NULL CHECK (feature IN ('review-summary', 'suggest', 'nl-search')),
    cache_hit     BOOLEAN NOT NULL DEFAULT FALSE,
    input_tokens  INTEGER,
    output_tokens INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_created ON ai_usage_logs (created_at DESC);
CREATE INDEX idx_ai_usage_feature  ON ai_usage_logs (feature);
