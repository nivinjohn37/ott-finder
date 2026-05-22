ALTER TABLE users ADD COLUMN blacklisted BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_users_blacklisted ON users(blacklisted) WHERE blacklisted = TRUE;
