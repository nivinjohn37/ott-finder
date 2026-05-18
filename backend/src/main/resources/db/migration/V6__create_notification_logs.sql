CREATE TABLE IF NOT EXISTS notification_logs (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    movie_id            BIGINT NOT NULL REFERENCES movies(id),
    notification_type   VARCHAR(50) CHECK (notification_type IN ('expiring_soon', 'new_availability')),
    sent_at             TIMESTAMPTZ DEFAULT NOW(),
    status              VARCHAR(20) CHECK (status IN ('sent', 'failed', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_user ON notification_logs(user_id);
