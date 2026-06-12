# WatchMate — Architecture & Implementation Plan

_Last updated: 2026-05-21_

## Project Summary

**What it does:** Answers "Where can I watch this movie/show in India?"  
**Who builds it:** Nivin (Senior Backend Engineer, Java/Spring Boot)  
**Purpose:** Portfolio project for senior product engineering roles in Australia  
**Live URLs:**
- Frontend: https://watchmateapp.vercel.app
- Backend: https://ott-finder-production.up.railway.app

---

## Repository Structure

```
proj-movie/
├── ARCHITECTURE.md          ← This file (source of truth)
├── docker-compose.yml       ← Local dev: Postgres + Redis
├── .github/
│   └── workflows/
│       └── deploy.yml       ← CI/CD pipeline
├── backend/                 ← Spring Boot application
│   ├── pom.xml
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/ottfinder/
│   │   │   │   ├── OttFinderApplication.java
│   │   │   │   ├── config/
│   │   │   │   │   ├── RedisConfig.java
│   │   │   │   │   ├── RestTemplateConfig.java
│   │   │   │   │   ├── SecurityConfig.java
│   │   │   │   │   └── AsyncConfig.java
│   │   │   │   ├── controller/
│   │   │   │   │   ├── MovieController.java
│   │   │   │   │   ├── WatchlistController.java
│   │   │   │   │   └── HealthController.java
│   │   │   │   ├── service/
│   │   │   │   │   ├── MovieSearchService.java
│   │   │   │   │   ├── TMDBService.java
│   │   │   │   │   ├── OTTAvailabilityService.java
│   │   │   │   │   ├── WatchlistService.java
│   │   │   │   │   ├── ExpiringContentService.java
│   │   │   │   │   └── NotificationService.java
│   │   │   │   ├── repository/
│   │   │   │   │   ├── MovieRepository.java
│   │   │   │   │   ├── OttPlatformRepository.java
│   │   │   │   │   ├── MovieAvailabilityRepository.java
│   │   │   │   │   ├── WatchlistRepository.java
│   │   │   │   │   └── NotificationLogRepository.java
│   │   │   │   ├── entity/
│   │   │   │   │   ├── User.java
│   │   │   │   │   ├── Movie.java
│   │   │   │   │   ├── OttPlatform.java
│   │   │   │   │   ├── MovieAvailability.java
│   │   │   │   │   ├── Watchlist.java
│   │   │   │   │   └── NotificationLog.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── request/
│   │   │   │   │   │   └── AddToWatchlistRequest.java
│   │   │   │   │   └── response/
│   │   │   │   │       ├── ApiResponse.java
│   │   │   │   │       ├── MovieSearchResult.java
│   │   │   │   │       ├── MovieDetail.java
│   │   │   │   │       ├── OttAvailability.java
│   │   │   │   │       ├── WatchlistItem.java
│   │   │   │   │       ├── CastMember.java
│   │   │   │   │       └── PersonFilmography.java
│   │   │   │   ├── exception/
│   │   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   │   ├── MovieNotFoundException.java
│   │   │   │   │   ├── ExternalApiException.java
│   │   │   │   │   └── WatchlistLimitException.java
│   │   │   │   ├── security/
│   │   │   │   │   └── FirebaseAuthFilter.java
│   │   │   │   └── scheduler/
│   │   │   │       └── ContentRefreshScheduler.java
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       ├── application-local.yml
│   │   │       └── db/migration/
│   │   │           ├── V1__create_users.sql
│   │   │           ├── V2__create_movies.sql
│   │   │           ├── V3__create_ott_platforms.sql
│   │   │           ├── V4__create_movie_availability.sql
│   │   │           ├── V5__create_watchlists.sql
│   │   │           ├── V6__create_notification_logs.sql
│   │   │           ├── V7__seed_ott_platforms.sql
│   │   │           ├── V8__update_justwatch_provider_ids.sql
│   │   │           ├── V9__add_watched_at_to_watchlists.sql
│   │   │           └── V10__add_avatar_to_users.sql
│   │   └── test/
│   │       └── java/com/ottfinder/
│   │           ├── service/
│   │           │   ├── MovieSearchServiceTest.java
│   │           │   ├── TMDBServiceTest.java
│   │           │   └── WatchlistServiceTest.java
│   │           └── controller/
│   │               ├── MovieControllerTest.java
│   │               └── WatchlistControllerTest.java
└── frontend/                ← React application
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts   ← Cinema colors use CSS var RGB triples for opacity support
    ├── tsconfig.json
    ├── index.html           ← Anti-flash theme script in <head>
    ├── vercel.json          ← SPA rewrite rule (/*  → /index.html)
    ├── .env.example
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css        ← CSS custom properties for dark + light themes
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.tsx          ← Search, theme toggle, auth, profile link
        │   │   └── Layout.tsx
        │   ├── movie/
        │   │   ├── MovieCard.tsx
        │   │   ├── MovieGrid.tsx
        │   │   ├── HeroSection.tsx     ← Auto-rotating hero from trending
        │   │   ├── SearchBar.tsx       ← With autocomplete suggestions dropdown
        │   │   ├── ActorDrawer.tsx     ← Slide-in filmography panel
        │   │   └── RecentlyViewedShelf.tsx  ← Horizontal scroll, login-gated
        │   ├── watchlist/
        │   │   └── WatchlistCard.tsx
        │   └── common/
        │       ├── PlatformBadge.tsx
        │       ├── RatingBadge.tsx
        │       ├── SkeletonCard.tsx
        │       └── EmptyState.tsx
        ├── pages/
        │   ├── HomePage.tsx
        │   ├── SearchPage.tsx       ← Sort + platform/media-type filter
        │   ├── MovieDetailPage.tsx  ← Cast drawer, share, trailer, watchlist
        │   ├── WatchlistPage.tsx
        │   ├── TrendingPage.tsx
        │   ├── InTheatresPage.tsx   ← Now playing in Indian theatres, language tabs, BMS booking link
        │   ├── ProfilePage.tsx
        │   └── NotFoundPage.tsx
        ├── hooks/
        │   ├── useMovies.ts         ← useTrending, useMovieDetail, usePersonFilmography
        │   ├── useWatchlist.ts
        │   └── useRecentlyViewed.ts ← localStorage, max 10 items, deduped
        ├── context/
        │   ├── AuthContext.tsx
        │   └── ThemeContext.tsx     ← dark/light, persisted in localStorage
        ├── api/
        │   ├── axios.ts             ← Axios instance with base URL + auth header
        │   ├── movies.ts            ← Movie API calls
        │   └── watchlist.ts         ← Watchlist API calls
        └── types/
            └── index.ts             ← All TypeScript interfaces
```

---

## Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 21 | Language (use Records for DTOs) |
| Spring Boot | 3.2.x | Framework |
| Spring Data JPA | included | ORM / DB access |
| Spring Security | included | Auth filter chain |
| PostgreSQL | 15 | Primary database |
| Redis | 7 | Response caching |
| Flyway | 9.x | DB migrations |
| Lombok | latest | Boilerplate reduction on entities |
| Firebase Admin SDK | 9.x | JWT verification |
| Maven | 3.9.x | Build tool |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| React Router | v6 | Navigation |
| React Query (TanStack) | v5 | Server state + caching |
| Axios | 1.x | HTTP client |
| Firebase JS SDK | 10.x | Auth on frontend |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker Compose | Local Postgres + Redis |
| Railway.app | Backend hosting (free tier) |
| Vercel | Frontend hosting (free tier) |
| GitHub Actions | CI/CD |

---

## Database Schema

### Entity Relationship

```
users ──< watchlists >── movies ──< movie_availability >── ott_platforms
  │                        │
  └──< notification_logs >─┘
```

### Table Definitions

```sql
-- users: managed by Firebase, we store minimal profile
users (
  id                   BIGSERIAL PRIMARY KEY,
  firebase_uid         VARCHAR(128) UNIQUE NOT NULL,  -- indexed
  email                VARCHAR(255) UNIQUE NOT NULL,
  display_name         VARCHAR(100),
  avatar_data          BYTEA,                         -- stored avatar blob (V10)
  avatar_content_type  VARCHAR(100),                  -- e.g. 'image/jpeg' (V10)
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
)

-- movies: cached from TMDB
movies (
  id              BIGSERIAL PRIMARY KEY,
  tmdb_id         INTEGER UNIQUE NOT NULL,       -- indexed
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
)
-- Full-text index: CREATE INDEX idx_movies_title ON movies USING gin(to_tsvector('english', title))

-- ott_platforms: seeded, rarely changes
ott_platforms (
  id                      BIGSERIAL PRIMARY KEY,
  name                    VARCHAR(50) UNIQUE NOT NULL,  -- e.g. 'netflix'
  display_name            VARCHAR(100) NOT NULL,        -- e.g. 'Netflix'
  logo_url                VARCHAR(255),
  base_url                VARCHAR(255),
  affiliate_link_template VARCHAR(500),
  country_code            VARCHAR(5) DEFAULT 'IN',
  justwatch_provider_id   INTEGER UNIQUE               -- for JustWatch mapping
)

-- movie_availability: updated by scheduled jobs + on-demand
movie_availability (
  id               BIGSERIAL PRIMARY KEY,
  movie_id         BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  platform_id      BIGINT NOT NULL REFERENCES ott_platforms(id),
  deep_link        VARCHAR(500),
  available_until  TIMESTAMPTZ,                  -- NULL = unknown expiry
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (movie_id, platform_id)
)
-- Index: CREATE INDEX idx_availability_until ON movie_availability(available_until)

-- watchlists: user's saved movies
watchlists (
  id                      BIGSERIAL PRIMARY KEY,
  user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id                BIGINT NOT NULL REFERENCES movies(id),
  added_at                TIMESTAMPTZ DEFAULT NOW(),
  watched_at              TIMESTAMPTZ,                   -- NULL = not yet watched (V9)
  notified_before_expiry  BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, movie_id)
)
-- Index: CREATE INDEX idx_watchlists_user ON watchlists(user_id)

-- notification_logs: audit trail
notification_logs (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id),
  movie_id            BIGINT NOT NULL REFERENCES movies(id),
  notification_type   VARCHAR(50) CHECK (notification_type IN ('expiring_soon', 'new_availability')),
  sent_at             TIMESTAMPTZ DEFAULT NOW(),
  status              VARCHAR(20) CHECK (status IN ('sent', 'failed', 'pending'))
)
```

### Migration History

| Version | Description |
|---|---|
| V1 | Create users table |
| V2 | Create movies table |
| V3 | Create ott_platforms table |
| V4 | Create movie_availability table |
| V5 | Create watchlists table |
| V6 | Create notification_logs table |
| V7 | Seed OTT platforms (7 Indian platforms) |
| V8 | Update JustWatch provider IDs to current values |
| V9 | Add `watched_at` to watchlists (mark as watched feature) |
| V10 | Add `avatar_data` + `avatar_content_type` to users (profile avatar upload) |
| V11 | Add `genres TEXT` to movies; create `user_preferences` table |
| V12 | Add `role VARCHAR(20) DEFAULT 'user'` to users |
| V13 | Create reviews table |
| V14 | Add `blacklisted` to users |
| V15 | Create user badges table |
| V16 | Create groups table |
| V17 | Seed admin role for app owner (getnivinjohn@gmail.com) |
| V18 | Add `review_likes` table (review_id, user_id, UNIQUE) + `report_count INT DEFAULT 0` on reviews |

Next available: **V19**

### OTT Platform Seeds (V7 migration)

| justwatch_provider_id | name | display_name |
|---|---|---|
| 8 | netflix | Netflix |
| 9 | primevideo | Prime Video |
| 122 | hotstar | Disney+ Hotstar |
| 158 | jiocinema | JioCinema |
| 232 | sonyliv | SonyLIV |
| 11 | mxplayer | MX Player |
| 218 | zee5 | ZEE5 |

---

## Backend Architecture

### Request Flow

```
HTTP Request
    │
    ▼
FirebaseAuthFilter          ← Validates Bearer JWT, sets SecurityContext
    │
    ▼
Controller                  ← @RestController, input validation, HTTP mapping
    │
    ▼
Service                     ← Business logic, orchestration, caching
    │
    ├──→ Redis               ← Cache-aside check first
    ├──→ TMDB API            ← External: movie metadata
    ├──→ JustWatch API       ← External: OTT availability
    └──→ Repository          ← JPA → PostgreSQL
```

### Service Responsibilities

#### MovieSearchService
- Entry point for all search operations
- Check `tmdb:search:{query}` in Redis
- On miss: `CompletableFuture` parallel calls to TMDBService + OTTAvailabilityService
- Merge results, persist new movies to DB
- Write-through to Redis before returning
- Timeout: 5s per external call (fail open — return partial data)

```java
// Core async pattern
CompletableFuture<List<TMDBMovie>> tmdbFuture =
    CompletableFuture.supplyAsync(() -> tmdbService.search(query), asyncExecutor);

CompletableFuture<Map<Integer, List<OttAvailability>>> ottFuture =
    CompletableFuture.supplyAsync(() -> ottService.findBulkAvailability(tmdbIds), asyncExecutor);

CompletableFuture.allOf(tmdbFuture, ottFuture)
    .orTimeout(5, TimeUnit.SECONDS)
    .exceptionally(ex -> null)
    .join();
```

#### TMDBService
- Wraps TMDB REST API
- Methods: `search(query)`, `getDetails(tmdbId)`, `getTrending()`, `getPersonFilmography(personId)`
- `getPersonFilmography`: calls `/person/{personId}?append_to_response=combined_credits`, filters poster_path not null + vote_count > 10, sorts by popularity, limits to 20
- Redis cache key: `tmdb:search:{query}` (TTL: 24h), `tmdb:movie:{tmdbId}` (TTL: 24h), `tmdb:trending` (TTL: 24h), `tmdb:person:{personId}` (TTL: 24h)
- Rate limit: 40 req/10s — handled via exponential backoff on 429
- Image base URL: `https://image.tmdb.org/t/p/w500/{poster_path}`

#### OTTAvailabilityService
- Wraps JustWatch unofficial API
- Endpoint: `GET https://apis.justwatch.com/content/titles/{type}/{tmdb_id}/locale/en_IN`
- Maps `provider_id` → `OttPlatform` via lookup table
- Redis cache key: `ott:availability:{tmdbId}` (TTL: 6h)
- On JustWatch failure: return empty list (do not throw — partial data is better than 500)

#### WatchlistService
- Auth-gated: all methods require userId from SecurityContext
- Freemium limit: max 3 items for free tier (check before add)
- Optimistic read from `watchlist:user:{userId}` Redis cache (TTL: 1h)
- Invalidate cache on add/remove
- `getExpiring()`: items where `available_until < NOW() + 7 days`

#### ExpiringContentService (@Scheduled)
- Cron: `0 0 8 * * *` (daily 8 AM)
- SQL:
  ```sql
  SELECT ma.*, w.user_id
  FROM movie_availability ma
  JOIN watchlists w ON ma.movie_id = w.movie_id
  WHERE ma.available_until BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND w.notified_before_expiry = FALSE
  ```
- Group by user → send notification → mark notified

#### ContentRefreshScheduler (@Scheduled)
- Cron: `0 0 2 * * *` (daily 2 AM)
- Fetch trending from TMDB → update availability → refresh Redis

### REST API Endpoints

```
GET  /api/health
     → 200 { status: "UP" }

GET  /api/movies/search?q={query}&page={n}
     → 200 ApiResponse<List<MovieSearchResult>>
     ← No auth required

GET  /api/movies/trending
     → 200 ApiResponse<List<MovieSearchResult>>
     ← No auth required

GET  /api/movies/now-playing?language={all|ml|ta|te|kn|hi|en}
     → 200 ApiResponse<List<MovieSearchResult>>
     ← No auth required
     TMDB discover: theatrical releases (type 3|2) in IN, last 45 days, by original language

GET  /api/movies/person/{personId}
     → 200 ApiResponse<PersonFilmography>
     ← No auth required; login-gated on frontend

GET  /api/movies/{tmdbId}?type={movie|tv}
     → 200 ApiResponse<MovieDetail>
     ← No auth required

GET  /api/watchlist                    ← Auth required
     → 200 ApiResponse<List<WatchlistItem>>

POST /api/watchlist                    ← Auth required
     Body: { "movieId": 693134, "mediaType": "movie" }
     → 201 ApiResponse<WatchlistItem>
     → 409 if already in list
     → 402 if free tier limit reached

DELETE /api/watchlist/{watchlistId}    ← Auth required
     → 204 No Content

PATCH /api/watchlist/{watchlistId}/watched   ← Auth required
     → 200 ApiResponse<WatchlistItem>
     Sets watched_at = NOW() (or clears it if already watched)

GET  /api/watchlist/expiring           ← Auth required
     → 200 ApiResponse<List<WatchlistItem>>

GET  /api/user/stats                   ← Auth required
     → 200 ApiResponse<UserStats>
     Computes favouriteGenre from watchlist movies' genres column

GET  /api/user/preferences             ← Auth required
     → 200 ApiResponse<UserPreferencesDto>

PUT  /api/user/preferences             ← Auth required
     Body: { "genres": ["Action", "Drama"], "platforms": ["netflix"] }
     → 200 ApiResponse<UserPreferencesDto>
     Replaces all preferences atomically

POST /api/user/avatar                  ← Auth required (multipart)
     → 200 ApiResponse<String> (URL path to avatar)

GET  /api/user/avatar/{uid}            ← Public
     → 200 image bytes

GET  /api/ai/review-summary/{tmdbId}?type={movie|tv}&spoilers={true|false}
     → 200 ApiResponse<ReviewSummaryDto>  ← No auth required
     ← Claude API; returns null if < 3 reviews; cached 48h (ai:review-summary:{tmdbId}:{free|full})

GET  /api/admin/stats                  ← Auth required, admin role
     → 200 ApiResponse<AdminStats>

GET  /api/admin/platforms              ← Auth required, admin role
     → 200 ApiResponse<List<OttAvailability>>

POST /api/admin/availability           ← Auth required, admin role
     Body: { tmdbId, mediaType, platformName, deepLink?, availableUntil? }
     → 200 ApiResponse<String> (confirmation message)
     Upserts movie_availability; fetches movie from TMDB if not in DB
```

### Standard Response Envelope

```json
{
  "success": true,
  "data": { },
  "error": null,
  "timestamp": "2026-05-14T10:30:00Z"
}
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "MOVIE_NOT_FOUND",
    "message": "Movie with TMDB ID 999 not found"
  },
  "timestamp": "2026-05-14T10:30:00Z"
}
```

### Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| MOVIE_NOT_FOUND | 404 | TMDB ID not found |
| WATCHLIST_DUPLICATE | 409 | Movie already in watchlist |
| WATCHLIST_LIMIT_EXCEEDED | 402 | Free tier limit (3 items) |
| EXTERNAL_API_ERROR | 502 | TMDB/JustWatch call failed |
| UNAUTHORIZED | 401 | Missing/invalid Firebase JWT |
| VALIDATION_ERROR | 400 | Invalid request body |

### Redis Cache Keys Reference

| Key Pattern | TTL | Invalidated By |
|---|---|---|
| `tmdb:search:{query}` | 24h | TTL only |
| `tmdb:movie:{tmdbId}` | 24h | TTL only |
| `tmdb:trending` | 24h | TTL only |
| `tmdb:person:{personId}` | 24h | TTL only |
| `tmdb:now_playing:{lang}` | 12h | TTL only |
| `ott:availability:{tmdbId}` | 6h | TTL only |
| `watchlist:user:{userId}` | 1h | add/remove/watched toggle |
| `ai:review-summary:{tmdbId}:free` | 48h | TTL only |
| `ai:review-summary:{tmdbId}:full` | 48h | TTL only |

### Security

- **Auth:** Firebase JWT in `Authorization: Bearer {token}`
- **Filter:** `FirebaseAuthFilter` validates token, sets `UsernamePasswordAuthenticationToken` in context
- **CORS:** Allow only frontend Vercel domain (and `localhost:5173` in dev)
- **Rate limit:** 10 search requests/minute per IP (Spring filter or Redis counter) — not yet implemented
- **Input validation:** `@Valid` + Bean Validation on all request DTOs
- **SQL injection:** Spring Data JPA parameterized queries (no raw SQL except scheduled job)
- **Public endpoints:** `/api/health`, `/api/movies/**`
- **Protected endpoints:** all `/api/watchlist/**`
- **Login-gated on frontend (not backend):** actor filmography drawer, recently viewed shelf

### Async Configuration

```java
// AsyncConfig.java — dedicated thread pool for external API calls
@Bean("apiCallExecutor")
public Executor apiCallExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(5);
    executor.setMaxPoolSize(20);
    executor.setQueueCapacity(100);
    executor.setThreadNamePrefix("api-call-");
    return executor;
}
```

---

## Frontend Architecture

### Page → Component Map

```
HomePage
├── Navbar (SearchBar w/ autocomplete, ThemeToggle, Auth)
├── HeroSection (auto-rotating from trending[0..4])
├── SearchBar (standalone CTA)
├── RecentlyViewedShelf (login-gated, localStorage)
└── MovieGrid (trending, max 12) → MovieCard[]

SearchPage (?q=query)
├── Navbar
├── SearchBar (pre-filled)
├── Sort dropdown (Relevance / Rating / Year↑↓)
├── Filter chips (Movie/TV • Netflix/PrimeVideo/Hotstar…)
└── MovieGrid → MovieCard[]

TrendingPage (/trending)
├── Navbar
└── MovieGrid (all trending) → MovieCard[]

InTheatresPage (/in-theatres)
├── Navbar
├── Language chips (All / Malayalam / Tamil / Telugu / Kannada / Hindi / English)
└── TheatreCard[] (poster → detail, "Book Tickets" → BookMyShow search deep link)

MovieDetailPage (/movie/:tmdbId?type=movie|tv)
├── Navbar
├── Backdrop + gradient overlay
├── Poster + metadata (rating, year, genres, runtime, tagline)
├── PlatformBadge[] or "not available" notice
├── Actions: [Watch Trailer] [Add to Watchlist] [Watch on X] [Share]
├── Cast row → ActorDrawer (login-gated)
├── TrailerModal (YouTube iframe, AnimatePresence)
└── ActorDrawer (slide-in, TMDB person credits)

WatchlistPage (/watchlist)           ← Auth required
├── Navbar
└── WatchlistCard[]
    ├── Poster + title + platforms
    ├── Mark as watched toggle (optimistic update)
    └── ExpiryWarning (if expiring < 7 days)

ProfilePage (/profile)               ← Auth required
├── Navbar
└── Display name editor + Firebase avatar
```

### Custom Hooks

```typescript
// useMovies.ts — all movie-related React Query hooks
useTrending(): { data: MovieSearchResult[], isLoading, isError }
useNowPlaying(language?: string): { data: MovieSearchResult[], isLoading, isError }
useMovieSearch(query: string): { data: MovieSearchResult[], isLoading, isError }
useMovieDetail(tmdbId: number, type?: string): { data: MovieDetail, isLoading, isError }
usePersonFilmography(personId: number | null): { data: PersonFilmography, isLoading }
  // enabled only when personId !== null && > 0; staleTime 30 min

// useWatchlist.ts — full watchlist management
useWatchlist(): { data: WatchlistItem[] }
useAddToWatchlist(): { mutateAsync }
useRemoveFromWatchlist(): { mutateAsync }
useToggleWatched(): { mutateAsync }           // optimistic update
useIsInWatchlist(tmdbId: number): boolean

// useRecentlyViewed.ts — localStorage, max 10 items, deduped by tmdbId
useRecentlyViewed(): {
  items: MovieSearchResult[],
  addItem: (movie: MovieSearchResult) => void,
  clearAll: () => void
}

// useAuth — from AuthContext
useAuth(): {
  user: FirebaseUser | null,
  isLoading: boolean,
  signInWithGoogle: () => Promise<void>,
  signOut: () => Promise<void>
}

// useTheme — from ThemeContext
useTheme(): { theme: 'dark' | 'light', toggle: () => void }

// useUser.ts — profile stats and preferences
useUserStats(): { data: UserStats }
useUserPreferences(): { data: UserPreferences }
useSavePreferences(): { mutateAsync: (prefs: UserPreferences) => Promise<void>, isPending }
```

### TypeScript Types

```typescript
// Core types (src/types/index.ts)

interface MovieSearchResult {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  releaseDate: string;
  mediaType: 'movie' | 'tv';
  voteAverage: number;
  voteCount?: number;
  platforms: OttAvailability[];
}

interface MovieDetail extends MovieSearchResult {
  tagline?: string;
  genres?: string[];
  runtime?: number;
  trailerKey?: string | null;
  cast?: CastMember[];
}

interface OttAvailability {
  platformName: string;
  displayName: string;
  logoUrl: string;
  deepLink: string;
  availableUntil: string | null;
}

interface CastMember {
  personId?: number | null;   // TMDB person ID — null for uncredited
  name: string;
  character: string;
  profileUrl: string | null;
}

interface PersonFilmography {
  personId: number;
  name: string;
  profileUrl: string | null;
  knownFor: string | null;
  credits: MovieSearchResult[];
}

interface WatchlistItem {
  id: number;
  movie: MovieSearchResult;
  addedAt: string;
  watchedAt: string | null;   // null = not yet watched
  expiringPlatforms: OttAvailability[];
}

interface UserStats {
  favouriteGenre: string | null;
  totalWatchlist: number;
  totalWatched: number;
}

interface UserPreferences {
  genres: string[];
  platforms: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  timestamp: string;
}
```

### State Management Strategy

| State Type | Solution | Why |
|---|---|---|
| Server data (movies, watchlist) | React Query | Caching, refetch, loading states built in |
| Auth state | Context API + Firebase | Global, needs to persist across nav |
| Theme (dark/light) | ThemeContext + localStorage | Global, anti-flash via inline script in index.html |
| Recently viewed | localStorage + useState | No backend needed, survives refresh |
| Search input | Local `useState` | Component-scoped |
| UI state (modals, drawers) | Local `useState` | Simple, co-located |

---

## External API Reference

### TMDB API

- **Base URL:** `https://api.themoviedb.org/3`
- **Auth:** `?api_key={TMDB_API_KEY}` query param
- **Rate limit:** 40 requests / 10 seconds

| Endpoint | Use |
|---|---|
| `GET /search/multi?query={q}&page={n}` | Search movies + TV |
| `GET /movie/{tmdb_id}?append_to_response=credits,videos` | Movie details with cast + trailer |
| `GET /tv/{tmdb_id}?append_to_response=credits,videos` | TV show details with cast + trailer |
| `GET /trending/all/day` | Homepage trending |
| `GET /person/{tmdb_id}?append_to_response=combined_credits` | Actor filmography |

Image URL pattern: `https://image.tmdb.org/t/p/w500/{poster_path}`

### JustWatch API (Unofficial)

- **Base URL:** `https://apis.justwatch.com`
- **Auth:** None required
- **Stability:** Unofficial — handle failures gracefully, always return empty list on error

| Endpoint | Use |
|---|---|
| `GET /content/titles/movie/{tmdb_id}/locale/en_IN` | Movie OTT availability |
| `GET /content/titles/show/{tmdb_id}/locale/en_IN` | TV show OTT availability |

Response `offers[].provider_id` maps to our `ott_platforms.justwatch_provider_id`.

---

## Environment Variables

### Backend (`backend/src/main/resources/application-local.yml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ottfinder
    username: postgres
    password: postgres
  data:
    redis:
      host: localhost
      port: 6379

tmdb:
  api-key: ${TMDB_API_KEY}
  base-url: https://api.themoviedb.org/3
  image-base-url: https://image.tmdb.org/t/p/w500

firebase:
  credentials-path: ${FIREBASE_CREDENTIALS_PATH:./firebase-credentials.json}
```

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

---

## Docker Compose (Local Dev)

```yaml
# docker-compose.yml (project root)
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ottfinder
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin' }
      - run: cd backend && mvn test -B

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run lint && npm run build

  deploy:
    needs: [test-backend, test-frontend]
    # Railway auto-deploys backend on push to main
    # Vercel auto-deploys frontend on push to main
```

---

## Build Status

MVP is live and deployed. See `ROADMAP.md` for the full feature backlog and phase plan.

**Next migration:** V19

---

## Performance Targets

| Metric | Target |
|---|---|
| Search response p95 | < 800ms |
| Time to Interactive (4G) | < 2s |
| Redis cache hit rate | > 80% |
| DB query time p95 | < 100ms |
| API uptime | 99% |

---

## Known Constraints & Decisions

| Decision | Rationale |
|---|---|
| JustWatch unofficial API | No official Indian OTT API exists; JustWatch has comprehensive data. Mitigated by 6h cache + graceful fallback. |
| Firebase Auth (not custom) | Saves 1+ day of auth implementation; security handled by Google. |
| RestTemplate over WebClient | Synchronous calls are fine since we use CompletableFuture manually; simpler than reactive. |
| Railway Hobby plan | Upgraded from free trial — $5/mo + compute. Required for persistent backend hosting. |
| Vercel GitHub webhook broken | Auto-deploy does not trigger on push. Manual deploy required: `cd frontend && vercel --prod`. |
| Records for DTOs | Immutable, concise, Java 21 idiomatic — no Lombok needed on DTOs. |
| Lombok only on entities | Entities need mutability; Records don't work with JPA proxies. |
| No soft-delete | Portfolio scope — hard deletes are fine, simpler to reason about. |
| `available_until` nullable | JustWatch often doesn't return expiry dates — NULL means "unknown, not necessarily permanent". |
| Login-gate on frontend only | Actor drawer + recently viewed gated in React (not backend) for simplicity; public API is acceptable since it's read-only TMDB data. |
| CSS vars for theme | RGB triple format (`6 8 15`) in CSS vars + Tailwind config enables opacity modifier support (`text-cinema-muted/50`). Anti-flash script in `index.html` reads localStorage before React renders. |
| OTT availability hardcoded to India | JustWatch locale is `en_IN` throughout. Full country support planned for Phase 3b. |
