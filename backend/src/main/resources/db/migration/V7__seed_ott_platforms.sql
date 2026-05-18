INSERT INTO ott_platforms (name, display_name, logo_url, base_url, country_code, justwatch_provider_id)
VALUES
    ('netflix',    'Netflix',           '/logos/netflix.png',    'https://www.netflix.com',             'IN', 8),
    ('primevideo', 'Prime Video',       '/logos/prime.png',      'https://www.primevideo.com',           'IN', 9),
    ('hotstar',    'Disney+ Hotstar',   '/logos/hotstar.png',    'https://www.hotstar.com',              'IN', 122),
    ('jiocinema',  'JioCinema',         '/logos/jiocinema.png',  'https://www.jiocinema.com',            'IN', 158),
    ('sonyliv',    'SonyLIV',           '/logos/sonyliv.png',    'https://www.sonyliv.com',              'IN', 232),
    ('mxplayer',   'MX Player',         '/logos/mxplayer.png',   'https://www.mxplayer.in',              'IN', 11),
    ('zee5',       'ZEE5',              '/logos/zee5.png',       'https://www.zee5.com',                 'IN', 218)
ON CONFLICT (name) DO NOTHING;
