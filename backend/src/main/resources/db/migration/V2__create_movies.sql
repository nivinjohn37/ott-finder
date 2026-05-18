CREATE TABLE IF NOT EXISTS movies (
    id              BIGSERIAL PRIMARY KEY,
    tmdb_id         INTEGER UNIQUE NOT NULL,
    title           VARCHAR(500) NOT NULL,
    poster_path     VARCHAR(255),
    backdrop_path   VARCHAR(255),
    overview        TEXT,
    release_date    DATE,
    vote_average    NUMERIC(3,1),
    vote_count      INTEGER,
    media_type      VARCHAR(10) CHECK (media_type IN ('movie', 'tv')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies USING gin(to_tsvector('english', title));
