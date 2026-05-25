CREATE TABLE user_badges (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    earned_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, badge_type)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
