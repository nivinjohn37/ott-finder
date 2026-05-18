CREATE TABLE IF NOT EXISTS ott_platforms (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(50) UNIQUE NOT NULL,
    display_name            VARCHAR(100) NOT NULL,
    logo_url                VARCHAR(255),
    base_url                VARCHAR(255),
    affiliate_link_template VARCHAR(500),
    country_code            VARCHAR(5) DEFAULT 'IN',
    justwatch_provider_id   INTEGER UNIQUE
);
