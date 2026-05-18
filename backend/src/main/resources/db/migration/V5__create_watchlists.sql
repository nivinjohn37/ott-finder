CREATE TABLE IF NOT EXISTS watchlists (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id                BIGINT NOT NULL REFERENCES movies(id),
    added_at                TIMESTAMPTZ DEFAULT NOW(),
    notified_before_expiry  BOOLEAN DEFAULT FALSE,
    UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
