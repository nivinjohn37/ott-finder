-- JustWatch migrated from REST to GraphQL; package IDs changed
-- Netflix (8) unchanged
-- Prime Video: 9 → 119
UPDATE ott_platforms SET justwatch_provider_id = 119 WHERE name = 'primevideo';

-- Hotstar + JioCinema merged into JioHotstar (packageId 2336)
UPDATE ott_platforms
SET name = 'jiohotstar', display_name = 'JioHotstar', justwatch_provider_id = 2336
WHERE name = 'hotstar';

-- Remove JioCinema row (merged into JioHotstar)
DELETE FROM ott_platforms WHERE name = 'jiocinema';

-- SonyLIV: 232 → 237
UPDATE ott_platforms SET justwatch_provider_id = 237 WHERE name = 'sonyliv';

-- ZEE5: 218 → 232
UPDATE ott_platforms SET justwatch_provider_id = 232 WHERE name = 'zee5';

-- MXPlayer no longer tracked on JustWatch India — set to null
UPDATE ott_platforms SET justwatch_provider_id = NULL WHERE name = 'mxplayer';
