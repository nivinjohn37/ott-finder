package com.ottfinder.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottfinder.dto.response.CastMember;
import com.ottfinder.dto.response.CrewMember;
import com.ottfinder.dto.response.MovieDetail;
import com.ottfinder.dto.response.MovieSearchResult;
import com.ottfinder.dto.response.OttAvailability;
import com.ottfinder.dto.response.PersonFilmography;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.zip.GZIPInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class TMDBService {

    private final RestTemplate restTemplate;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${tmdb.api-key}")
    private String apiKey;

    @Value("${tmdb.base-url}")
    private String baseUrl;

    @Value("${tmdb.image-base-url}")
    private String imageBaseUrl;

    private static final Duration SEARCH_TTL    = Duration.ofHours(24);
    private static final Duration DETAIL_TTL    = Duration.ofHours(24);
    private static final Duration TRENDING_TTL  = Duration.ofHours(6);
    private static final Duration GENRE_TTL     = Duration.ofHours(6);
    private static final Duration DISCOVER_TTL  = Duration.ofHours(6);

    private static final Map<String, Integer> GENRE_IDS = Map.ofEntries(
        Map.entry("Action", 28),
        Map.entry("Adventure", 12),
        Map.entry("Animation", 16),
        Map.entry("Comedy", 35),
        Map.entry("Crime", 80),
        Map.entry("Documentary", 99),
        Map.entry("Drama", 18),
        Map.entry("Family", 10751),
        Map.entry("Fantasy", 14),
        Map.entry("History", 36),
        Map.entry("Horror", 27),
        Map.entry("Music", 10402),
        Map.entry("Mystery", 9648),
        Map.entry("Romance", 10749),
        Map.entry("Science Fiction", 878),
        Map.entry("Thriller", 53),
        Map.entry("War", 10752),
        Map.entry("Western", 37)
    );

    public List<MovieSearchResult> search(String query) {
        String cacheKey = "tmdb:search:" + query.toLowerCase().replaceAll("\\s+", "_");
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached, new TypeReference<>() {});
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/search/multi")
                .queryParam("api_key", apiKey)
                .queryParam("query", query)
                .queryParam("language", "en-US")
                .queryParam("page", 1)
                .toUriString();

        List<MovieSearchResult> results = fetchAndMapResults(url);
        if (!results.isEmpty()) cache(cacheKey, results, SEARCH_TTL);
        return results;
    }

    public MovieDetail getDetails(Integer tmdbId, String mediaType) {
        String cacheKey = "tmdb:movie:" + tmdbId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            MovieDetail hit = deserialize(cached, MovieDetail.class);
            // crew == null means stale cache entry from before crew was added — re-fetch
            if (hit != null && hit.crew() != null) return hit;
        }

        String endpoint = "movie".equals(mediaType) ? "/movie/" : "/tv/";
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + endpoint + tmdbId)
                .queryParam("api_key", apiKey)
                .queryParam("language", "en-US")
                .queryParam("append_to_response", "videos,credits")
                .toUriString();

        MovieDetail detail = fetchAndMapDetail(url, tmdbId, mediaType);
        if (detail != null) {
            cache(cacheKey, detail, DETAIL_TTL);
        }
        return detail;
    }

    public List<MovieSearchResult> getTrending(String region, String language) {
        String safeRegion = (region == null || region.isBlank()) ? "global" : region.toUpperCase();
        String safeLang   = (language == null || language.isBlank() || "all".equalsIgnoreCase(language))
                ? "all" : language.toLowerCase();

        String cacheKey = "tmdb:trending:" + safeRegion + ":" + safeLang;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached, new TypeReference<>() {});
        }

        List<MovieSearchResult> results;
        if ("all".equals(safeLang)) {
            // Use TMDB trending endpoint (supports region, not language)
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromHttpUrl(baseUrl + "/trending/all/day")
                    .queryParam("api_key", apiKey)
                    .queryParam("language", "en-US");
            if (!"GLOBAL".equals(safeRegion)) builder.queryParam("region", safeRegion);
            results = fetchAndMapResults(builder.toUriString());
        } else {
            // TMDB trending doesn't support original_language — use discover instead
            results = fetchLanguageDiscover(safeLang);
        }

        if (!results.isEmpty()) cache(cacheKey, results, TRENDING_TTL);
        return results;
    }

    private List<MovieSearchResult> fetchLanguageDiscover(String language) {
        List<MovieSearchResult> movies = fetchDiscover("movie", language);
        List<MovieSearchResult> tv     = fetchDiscover("tv", language);
        // Interleave: top 10 movies + top 10 TV, already sorted by popularity.desc from TMDB
        List<MovieSearchResult> combined = new ArrayList<>();
        combined.addAll(movies.stream().limit(10).toList());
        combined.addAll(tv.stream().limit(10).toList());
        return combined;
    }

    @SuppressWarnings("unchecked")
    private List<MovieSearchResult> fetchDiscover(String mediaType, String language) {
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/discover/" + mediaType)
                .queryParam("api_key", apiKey)
                .queryParam("language", "en-US")
                .queryParam("sort_by", "popularity.desc")
                .queryParam("with_original_language", language)
                .queryParam("page", 1)
                .toUriString();
        try {
            Map<String, Object> response = fetchMap(url);
            if (response == null || !response.containsKey("results")) return Collections.emptyList();
            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            return results.stream()
                    .map(r -> {
                        // Discover endpoints don't include media_type — inject it
                        java.util.HashMap<String, Object> copy = new java.util.HashMap<>(r);
                        copy.put("media_type", mediaType.equals("tv") ? "tv" : "movie");
                        return copy;
                    })
                    .map(this::mapToSearchResult)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception ex) {
            log.error("TMDB discover failed type={} lang={}: {}", mediaType, language, ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<MovieSearchResult> getGenreMovies(String genreName, String mediaType) {
        Integer genreId = GENRE_IDS.get(genreName);
        if (genreId == null) return Collections.emptyList();

        String resolvedType = "tv".equals(mediaType) ? "tv" : "movie";
        String cacheKey = "tmdb:genre:" + genreId + ":" + resolvedType;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached, new TypeReference<>() {});
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/discover/" + resolvedType)
                .queryParam("api_key", apiKey)
                .queryParam("language", "en-US")
                .queryParam("with_genres", genreId)
                .queryParam("sort_by", "popularity.desc")
                .queryParam("page", 1)
                .toUriString();

        List<MovieSearchResult> results = fetchAndMapResults(url);
        if (!results.isEmpty()) cache(cacheKey, results, GENRE_TTL);
        return results;
    }

    public Set<String> getSupportedGenres() {
        return GENRE_IDS.keySet();
    }

    public Integer getGenreIdForName(String name) {
        return GENRE_IDS.get(name);
    }

    public List<MovieSearchResult> discoverByFilters(
            String mediaType,
            String sortBy,
            String withProviders,
            String withGenreIds,
            Double voteAverageGte,
            Integer voteCountGte,
            Integer voteCountLte) {

        String safeProviders = withProviders != null ? withProviders.replace("|", "_") : "any";
        String cacheKey = String.format("tmdb:discover:%s:%s:%s:%s:%s:%s:%s",
                mediaType, sortBy, safeProviders,
                withGenreIds != null ? withGenreIds : "any",
                voteAverageGte != null ? voteAverageGte : "any",
                voteCountGte != null ? voteCountGte : "any",
                voteCountLte != null ? voteCountLte : "any");

        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return deserializeList(cached, new TypeReference<>() {});
        }

        String resolvedType = "tv".equals(mediaType) ? "tv" : "movie";
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(baseUrl + "/discover/" + resolvedType)
                .queryParam("api_key", apiKey)
                .queryParam("language", "en-US")
                .queryParam("watch_region", "IN")
                .queryParam("sort_by", sortBy)
                .queryParam("page", 1);

        if (withProviders != null) builder.queryParam("with_watch_providers", withProviders);
        if (withGenreIds != null) builder.queryParam("with_genres", withGenreIds);
        if (voteAverageGte != null) builder.queryParam("vote_average.gte", voteAverageGte);
        if (voteCountGte != null) builder.queryParam("vote_count.gte", voteCountGte);
        if (voteCountLte != null) builder.queryParam("vote_count.lte", voteCountLte);

        List<MovieSearchResult> results = fetchDiscoverResults(builder.toUriString(), resolvedType);
        if (!results.isEmpty()) cache(cacheKey, results, DISCOVER_TTL);
        return results;
    }

    @SuppressWarnings("unchecked")
    private List<MovieSearchResult> fetchDiscoverResults(String url, String mediaType) {
        try {
            Map<String, Object> response = fetchMap(url);
            if (response == null || !response.containsKey("results")) return Collections.emptyList();
            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            return results.stream()
                    .map(r -> {
                        java.util.HashMap<String, Object> copy = new java.util.HashMap<>(r);
                        copy.put("media_type", mediaType);
                        return copy;
                    })
                    .map(this::mapToSearchResult)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception ex) {
            log.error("TMDB discoverByFilters failed url={}: {}", url, ex.getMessage());
            return Collections.emptyList();
        }
    }

    public PersonFilmography getPersonFilmography(Integer personId) {
        String cacheKey = "tmdb:person:v2:" + personId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            PersonFilmography result = deserialize(cached, PersonFilmography.class);
            if (result != null) return result;
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/person/" + personId)
                .queryParam("api_key", apiKey)
                .queryParam("language", "en-US")
                .queryParam("append_to_response", "combined_credits")
                .toUriString();

        PersonFilmography filmography = fetchAndMapPerson(url, personId);
        if (filmography != null) cache(cacheKey, filmography, DETAIL_TTL);
        return filmography;
    }

    @SuppressWarnings("unchecked")
    private PersonFilmography fetchAndMapPerson(String url, Integer personId) {
        try {
            Map<String, Object> r = fetchMap(url);
            if (r == null) return null;

            String name = (String) r.get("name");
            String knownFor = (String) r.get("known_for_department");

            // Directors/writers appear in crew[], not cast[] — using cast for them
            // yields talk-show appearances and red-carpet events, not their actual work.
            boolean preferCrew = "Directing".equals(knownFor)
                    || "Writing".equals(knownFor)
                    || "Production".equals(knownFor);

            List<MovieSearchResult> credits = Collections.emptyList();
            Map<String, Object> combined = (Map<String, Object>) r.get("combined_credits");
            if (combined != null) {
                List<Map<String, Object>> castList = (List<Map<String, Object>>) combined.get("cast");
                List<Map<String, Object>> crewList = (List<Map<String, Object>>) combined.get("crew");

                List<Map<String, Object>> sourceList;
                if (preferCrew && crewList != null) {
                    // Directors: only their "Director" credits; writers: any crew entry
                    String filterJob = "Directing".equals(knownFor) ? "Director" : null;
                    Set<Object> seenIds = new java.util.HashSet<>();
                    sourceList = crewList.stream()
                            .filter(c -> filterJob == null || filterJob.equals(c.get("job")))
                            .filter(c -> seenIds.add(c.get("id")))  // deduplicate same movie
                            .collect(java.util.stream.Collectors.toList());
                } else {
                    sourceList = castList != null ? castList : Collections.emptyList();
                }

                // Lower vote threshold for crew (regional films have fewer votes than Hollywood)
                int minVotes = preferCrew ? 3 : 10;
                credits = sourceList.stream()
                        .filter(c -> c.get("poster_path") != null)
                        .filter(c -> {
                            Object vc = c.get("vote_count");
                            return vc instanceof Number n && n.intValue() >= minVotes;
                        })
                        .sorted((a, b) -> Double.compare(
                                toDoubleOrZero(b.get("popularity")),
                                toDoubleOrZero(a.get("popularity"))))
                        .limit(20)
                        .map(this::mapToSearchResult)
                        .filter(Objects::nonNull)
                        .toList();
            }

            return new PersonFilmography(personId, name, buildImageUrl((String) r.get("profile_path")), knownFor, credits);
        } catch (Exception ex) {
            log.error("TMDB person fetch failed for personId={}: {}", personId, ex.getMessage());
            return null;
        }
    }

    private double toDoubleOrZero(Object val) {
        if (val instanceof Number n) return n.doubleValue();
        return 0.0;
    }

    // TMDB responses are sometimes double-gzipped (CDN adds a second gzip layer on top of
    // the Content-Encoding layer that HttpURLConnection already decompressed). Fetching as
    // byte[] and decompressing manually handles both 0, 1, and 2-layer cases.
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchMap(String url) {
        try {
            byte[] bytes = restTemplate.getForObject(url, byte[].class);
            if (bytes == null) return null;
            String json = decompressIfNeeded(bytes);
            return objectMapper.readValue(json, Map.class);
        } catch (RestClientException | IOException ex) {
            log.error("TMDB fetch failed for {}: {}", url, ex.getMessage());
            return null;
        }
    }

    private String decompressIfNeeded(byte[] bytes) throws IOException {
        if (bytes.length >= 2 && bytes[0] == (byte) 0x1f && bytes[1] == (byte) 0x8b) {
            // Java's GZIPInputStream supports concatenated gzip streams. If trailing garbage
            // (e.g. a \n) follows the valid stream it throws ZipException AFTER the real data
            // is already decompressed. Read chunk-by-chunk so we keep whatever was read.
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(bytes))) {
                byte[] buf = new byte[8192];
                int n;
                try {
                    while ((n = gis.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                } catch (java.util.zip.ZipException ignored) {
                    // Trailing non-gzip bytes after valid stream — data already in baos
                    if (baos.size() == 0) throw ignored;
                }
            }
            return decompressIfNeeded(baos.toByteArray());
        }
        return new String(bytes, StandardCharsets.UTF_8).trim();
    }

    @SuppressWarnings("unchecked")
    private List<MovieSearchResult> fetchAndMapResults(String url) {
        try {
            Map<String, Object> response = fetchMap(url);
            if (response == null || !response.containsKey("results")) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
            return results.stream()
                    .filter(r -> !"person".equals(r.get("media_type")))
                    .map(this::mapToSearchResult)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception ex) {
            log.error("TMDB search failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private MovieDetail fetchAndMapDetail(String url, Integer tmdbId, String mediaType) {
        try {
            Map<String, Object> r = fetchMap(url);
            if (r == null) return null;

            String title = "tv".equals(mediaType)
                    ? (String) r.get("name")
                    : (String) r.get("title");
            String date = "tv".equals(mediaType)
                    ? (String) r.get("first_air_date")
                    : (String) r.get("release_date");

            String trailerKey = extractTrailerKey((Map<String, Object>) r.get("videos"));
            List<String> genres = extractGenres((List<Map<String, Object>>) r.get("genres"));
            List<CastMember> cast = extractCast((Map<String, Object>) r.get("credits"));
            List<CrewMember> crew = extractCrew((Map<String, Object>) r.get("credits"), r, mediaType);
            Integer runtime = "tv".equals(mediaType)
                    ? extractTvRuntime((List<Integer>) r.get("episode_run_time"))
                    : toInt(r.get("runtime"));

            return new MovieDetail(
                    tmdbId,
                    title,
                    buildImageUrl((String) r.get("poster_path")),
                    buildImageUrl((String) r.get("backdrop_path")),
                    (String) r.get("overview"),
                    date,
                    mediaType,
                    toDouble(r.get("vote_average")),
                    toInt(r.get("vote_count")),
                    Collections.emptyList(),
                    trailerKey,
                    (String) r.get("tagline"),
                    runtime,
                    genres,
                    cast,
                    crew
            );
        } catch (Exception ex) {
            log.error("TMDB detail fetch failed for tmdbId={}: {}", tmdbId, ex.getMessage());
            return null;
        }
    }

    private List<String> extractGenres(List<Map<String, Object>> genres) {
        if (genres == null) return Collections.emptyList();
        return genres.stream()
                .map(g -> (String) g.get("name"))
                .filter(Objects::nonNull)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private List<CastMember> extractCast(Map<String, Object> credits) {
        if (credits == null) return Collections.emptyList();
        List<Map<String, Object>> castList = (List<Map<String, Object>>) credits.get("cast");
        if (castList == null) return Collections.emptyList();
        return castList.stream()
                .limit(8)
                .map(c -> new CastMember(
                        toInt(c.get("id")),
                        (String) c.get("name"),
                        (String) c.get("character"),
                        buildImageUrl((String) c.get("profile_path"))
                ))
                .toList();
    }

    private static final Set<String> KEY_CREW_JOBS = Set.of(
            "Director", "Director of Photography", "Original Music Composer",
            "Screenplay", "Writer", "Story"
    );

    @SuppressWarnings("unchecked")
    private List<CrewMember> extractCrew(Map<String, Object> credits, Map<String, Object> root, String mediaType) {
        List<CrewMember> result = new ArrayList<>();

        // TV: creators come from top-level created_by[], not credits.crew
        if ("tv".equals(mediaType)) {
            List<Map<String, Object>> creators = (List<Map<String, Object>>) root.get("created_by");
            if (creators != null) {
                creators.stream()
                        .limit(2)
                        .map(c -> new CrewMember(
                                toInt(c.get("id")),
                                (String) c.get("name"),
                                "Creator",
                                buildImageUrl((String) c.get("profile_path"))))
                        .forEach(result::add);
            }
        }

        if (credits == null) return result;
        List<Map<String, Object>> crewList = (List<Map<String, Object>>) credits.get("crew");
        if (crewList == null) return result;

        // Keep at most 2 entries per job, preserving TMDB order
        Map<String, Integer> jobCounts = new LinkedHashMap<>();
        for (Map<String, Object> c : crewList) {
            String job = (String) c.get("job");
            if (!KEY_CREW_JOBS.contains(job)) continue;
            int count = jobCounts.getOrDefault(job, 0);
            if (count >= 2) continue;
            result.add(new CrewMember(
                    toInt(c.get("id")),
                    (String) c.get("name"),
                    job,
                    buildImageUrl((String) c.get("profile_path"))));
            jobCounts.put(job, count + 1);
        }
        return result;
    }

    private Integer extractTvRuntime(List<Integer> episodeRunTime) {
        if (episodeRunTime == null || episodeRunTime.isEmpty()) return null;
        return episodeRunTime.get(0);
    }

    @SuppressWarnings("unchecked")
    private String extractTrailerKey(Map<String, Object> videos) {
        if (videos == null) return null;
        List<Map<String, Object>> results = (List<Map<String, Object>>) videos.get("results");
        if (results == null) return null;
        return results.stream()
                .filter(v -> "YouTube".equals(v.get("site")) && "Trailer".equals(v.get("type")))
                .filter(v -> Boolean.TRUE.equals(v.get("official")))
                .findFirst()
                .or(() -> results.stream()
                        .filter(v -> "YouTube".equals(v.get("site")) && "Trailer".equals(v.get("type")))
                        .findFirst())
                .map(v -> (String) v.get("key"))
                .orElse(null);
    }

    @SuppressWarnings("unchecked")
    private MovieSearchResult mapToSearchResult(Map<String, Object> r) {
        try {
            String mediaType = (String) r.getOrDefault("media_type", "movie");
            String title = "tv".equals(mediaType)
                    ? (String) r.get("name")
                    : (String) r.get("title");
            String date = "tv".equals(mediaType)
                    ? (String) r.get("first_air_date")
                    : (String) r.get("release_date");

            return new MovieSearchResult(
                    toInt(r.get("id")),
                    title,
                    buildImageUrl((String) r.get("poster_path")),
                    buildImageUrl((String) r.get("backdrop_path")),
                    (String) r.get("overview"),
                    date,
                    mediaType,
                    toDouble(r.get("vote_average")),
                    Collections.emptyList()
            );
        } catch (Exception ex) {
            log.warn("Failed to map TMDB result: {}", ex.getMessage());
            return null;
        }
    }

    public String buildImageUrl(String path) {
        if (path == null || path.isBlank()) return null;
        return imageBaseUrl + path;
    }

    private Double toDouble(Object val) {
        if (val == null) return null;
        return val instanceof Number n ? n.doubleValue() : null;
    }

    private Integer toInt(Object val) {
        if (val == null) return null;
        return val instanceof Number n ? n.intValue() : null;
    }

    private void cache(String key, Object value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception ex) {
            log.warn("Redis cache write failed for key={}: {}", key, ex.getMessage());
        }
    }

    private <T> T deserialize(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception ex) {
            log.warn("Redis cache deserialization failed: {}", ex.getMessage());
            return null;
        }
    }

    private <T> List<T> deserializeList(String json, TypeReference<List<T>> typeRef) {
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception ex) {
            log.warn("Redis cache deserialization failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}
