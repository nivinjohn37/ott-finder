ALTER TABLE movies ADD COLUMN genres TEXT;

CREATE TABLE user_preferences (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_type  VARCHAR(20) NOT NULL CHECK (preference_type IN ('genre', 'platform')),
    value            VARCHAR(100) NOT NULL,
    UNIQUE (user_id, preference_type, value)
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
