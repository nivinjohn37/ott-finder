CREATE TABLE IF NOT EXISTS movie_availability (
    id               BIGSERIAL PRIMARY KEY,
    movie_id         BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    platform_id      BIGINT NOT NULL REFERENCES ott_platforms(id),
    deep_link        VARCHAR(500),
    available_until  TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (movie_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_movie ON movie_availability(movie_id);
CREATE INDEX IF NOT EXISTS idx_availability_until ON movie_availability(available_until)
    WHERE available_until IS NOT NULL;
