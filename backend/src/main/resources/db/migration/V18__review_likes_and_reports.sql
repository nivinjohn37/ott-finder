CREATE TABLE review_likes (
    id          BIGSERIAL PRIMARY KEY,
    review_id   BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_likes_review ON review_likes(review_id);

ALTER TABLE reviews ADD COLUMN report_count INT NOT NULL DEFAULT 0;
