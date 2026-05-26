-- watch_groups avoids collision with the SQL reserved word "groups"
CREATE TABLE watch_groups (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10)  UNIQUE NOT NULL,
    created_by  BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_watch_groups_invite_code ON watch_groups(invite_code);
CREATE INDEX idx_watch_groups_created_by  ON watch_groups(created_by);

CREATE TABLE group_members (
    id        BIGSERIAL PRIMARY KEY,
    group_id  BIGINT      NOT NULL REFERENCES watch_groups(id) ON DELETE CASCADE,
    user_id   BIGINT      NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    role      VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user  ON group_members(user_id);

CREATE TABLE group_watchlist (
    id        BIGSERIAL PRIMARY KEY,
    group_id  BIGINT      NOT NULL REFERENCES watch_groups(id) ON DELETE CASCADE,
    movie_id  BIGINT      NOT NULL REFERENCES movies(id)       ON DELETE CASCADE,
    added_by  BIGINT      NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    added_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, movie_id)
);

CREATE INDEX idx_group_watchlist_group ON group_watchlist(group_id);

CREATE TABLE group_watchlist_progress (
    id                 BIGSERIAL PRIMARY KEY,
    group_watchlist_id BIGINT      NOT NULL REFERENCES group_watchlist(id) ON DELETE CASCADE,
    user_id            BIGINT      NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
    watched_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_watchlist_id, user_id)
);

CREATE INDEX idx_gwp_item ON group_watchlist_progress(group_watchlist_id);
CREATE INDEX idx_gwp_user ON group_watchlist_progress(user_id);

CREATE TABLE group_suggestions (
    id           BIGSERIAL PRIMARY KEY,
    group_id     BIGINT      NOT NULL REFERENCES watch_groups(id) ON DELETE CASCADE,
    movie_id     BIGINT      NOT NULL REFERENCES movies(id)       ON DELETE CASCADE,
    suggested_by BIGINT      NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    upvotes      INT         NOT NULL DEFAULT 0,
    downvotes    INT         NOT NULL DEFAULT 0,
    suggested_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, movie_id)
);

CREATE INDEX idx_group_suggestions_group ON group_suggestions(group_id);

-- Tracks who voted on what so users can't vote twice and we can show their current vote
CREATE TABLE group_suggestion_votes (
    id            BIGSERIAL PRIMARY KEY,
    suggestion_id BIGINT     NOT NULL REFERENCES group_suggestions(id) ON DELETE CASCADE,
    user_id       BIGINT     NOT NULL REFERENCES users(id)             ON DELETE CASCADE,
    vote          SMALLINT   NOT NULL CHECK (vote IN (1, -1)),
    UNIQUE (suggestion_id, user_id)
);
