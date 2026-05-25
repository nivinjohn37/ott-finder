# OTT Finder — Bug & Feature Tracker

_Last updated: 2026-05-23_

---

## How to use this file

- **Status**: `open` | `in-progress` | `done`
- Add new items under the relevant section; set status to `open`.
- When work starts, update to `in-progress` and note the date.
- When merged/deployed, update to `done` and note the date.

---

## Bugs

### High Priority — Correctness

| ID | Status | Area | Description | Notes |
|----|--------|------|-------------|-------|
| B-01 | done | Reviews | Average rating on movie detail page doesn't update after submitting a review — React Query cache for reviews isn't invalidated by the mutation | Fixed 2026-05-22: replaced render-phase `synced` side-effect with `useEffect` keyed on `serverRating`/`serverNote`; form + aggregate now sync correctly after every mutation |
| B-02 | done | Profile | Favourite genre stat is silently wrong — genres are only persisted to the DB when the detail page is visited; adding a movie from search results leaves genres null, so the stat is computed from incomplete data | Fixed 2026-05-25: `fetchAndSaveMovie` now sets genres from `MovieDetail`; `backfillGenres` patched in `addToWatchlist` for existing movies with null genres |
| B-03 | done | Admin | Blacklist does not fully work — two sub-issues: (1) Axios response interceptor converts errors to `new Error(message)`, stripping `err.response`, so the 401 returned by the filter never triggers a frontend sign-out; (2) Firebase ID token remains valid client-side for up to 1 hour after `revokeRefreshTokens` is called, so the user stays "logged in" on the frontend until their token naturally expires | Fixed 2026-05-22: preserved axios error, added 401 → `signOut(auth)` |

---

### Medium Priority — UX Gaps

| ID | Status | Area | Description | Notes |
|----|--------|------|-------------|-------|
| B-04 | done | Reviews | No edit — user must delete their review and re-submit to change it | Already fixed as part of B-01: POST endpoint does upsert (update if exists); ReviewSection shows "Update" button pre-filled with existing rating/note when `myReview` is present |
| B-05 | done | Watchlist | No sort or filter on the watchlist page — can't filter to "unwatched only" or by platform | Fixed 2026-05-23: filter chips for All/Unwatched/Watched + dynamic per-platform chips derived from items; `useMemo` filtered list, "No items match" empty state for filtered-out results |
| B-06 | done | Search | Platform and media-type filter chips reset whenever a new search query is typed, losing filter context | Fixed 2026-05-23: filter state moved to URL params (`?q=...&type=movie&sort=rating_desc&platforms=netflix,hotstar`); SearchBar preserves existing params on submit; all filter mutations use `setParams` with `replace: true` |
| B-07 | done | Movie detail | Runtime shows blank or "0h 0m" for TV shows with null episode length | Fixed: `runtime && runtime > 0` guard already in place — only renders when runtime is a positive number |
| B-08 | done | Movie detail | Cast row silently truncates at ~15 members with no affordance to see more | Fixed 2026-05-23: shows first 12; "Show all N cast members" / "Show less" toggle button appears when cast > 12 |
| B-09 | done | UX | Hero section auto-rotates with no pause on hover — interrupts users reading the current card | Fixed 2026-05-23: `paused` state added; `onMouseEnter`/`onMouseLeave` on the container toggle it; interval effect depends on `paused` and clears itself immediately on hover |
| B-10 | done | UX | Browser tab title is always "OTT Finder" — detail page doesn't update `<title>` to the movie name | Fixed 2026-05-23: `useEffect` on `movie?.title` sets `document.title` to `"{title} — OTT Finder"`, cleanup resets to "OTT Finder" on unmount |

---

### Low Priority — Polish

| ID | Status | Area | Description | Notes |
|----|--------|------|-------------|-------|
| B-11 | done | Search | Suggestions dropdown has no debounce — fires on every keystroke at ≥ 2 chars, can show stale results on fast typing | Fixed: 300ms `setTimeout` debounce already in place in SearchBar; threshold is 3+ chars; `clearTimeout` on cleanup prevents stale results |
| B-12 | done | Genre drawer | Only fetches movies — clicking a genre pill on a TV show page still shows films only | Fixed 2026-05-25: `mediaType` threaded through TMDBService → MovieSearchService → MovieController → API → hook → GenreDrawer → MovieDetailPage; cache key updated to `tmdb:genre:{id}:{type}`; drawer subtitle shows "TV shows" vs "movies" |
| B-13 | done | Movie detail | "Not currently available on Indian OTT platforms" is shown regardless of whether that's true or whether JustWatch simply hasn't indexed the title yet | Fixed 2026-05-23: changed to "Availability unknown — this title may not be indexed yet. Add to watchlist and we'll notify you when it lands on an Indian OTT platform." |
| B-14 | done | Admin | After seeding OTT availability, the TMDB movie detail Redis cache is invalidated; the next detail request repopulates it fresh from TMDB — but that re-fetch only calls JustWatch, not the DB, so the seeded entry is absent until the DB-merge path runs again on the next cache miss | Fixed 2026-05-23: removed `tmdb:movie:{id}` deletion from AdminController seed endpoint; now only invalidates `ott:availability:{id}` |
| B-15 | done | Admin | No way to delete or edit an existing seeded availability entry from the admin UI | Fixed 2026-05-25: `GET /api/admin/availability/movie/{tmdbId}` + `DELETE /api/admin/availability/{id}` endpoints added; SeedForm shows `ExistingEntries` component when movie selected, with per-row Trash2 delete button; cache invalidated on delete |
| B-16 | done | Infrastructure | `via.placeholder.com` used as fallback for missing posters/backdrops — external dependency that breaks silently if the service is down | Fixed 2026-05-23: replaced all 5 occurrences with inline SVG data URIs — dark background with faint image icon, zero external dependency |
| B-17 | done | Reviews | Review list has no pagination — on popular titles the list could grow very long | Fixed 2026-05-25: backend returns 10 reviews per page with `hasMore` flag; ReviewSection tracks `extraReviews` + `nextPage`; "Load more reviews" button fetches next page and appends |
| B-18 | open | Personalization | Genre/platform preferences are saved but never read back to influence the homepage, trending, or any recommendations | Fix (post-bug phase): use preferences to filter/sort trending or add a "For You" shelf |
| B-19 | done | Watchlist | Watchlist limit error was wired to check `err.response.data.error.code` but the axios interceptor was stripping `err.response` — so the limit message never actually appeared | Fixed 2026-05-22 together with B-03 |

---

## Features Completed

| Phase | Feature | Deployed |
|-------|---------|----------|
| MVP | Movie search + TMDB integration | ✅ |
| MVP | OTT availability via JustWatch (India) | ✅ |
| MVP | Trending page | ✅ |
| MVP | Movie detail page (cast, trailer, platforms, tagline, runtime) | ✅ |
| MVP | Watchlist (add/remove, mark watched, expiry warnings) | ✅ |
| MVP | Firebase Google Auth | ✅ |
| MVP | Dark / light theme with anti-flash | ✅ |
| MVP | Search suggestions autocomplete | ✅ |
| MVP | Actor filmography drawer (login-gated) | ✅ |
| MVP | Platform badges with deep links | ✅ |
| MVP | Sort + platform filter on search results | ✅ |
| MVP | Share button (navigator.share + clipboard fallback) | ✅ |
| 1.5 | Admin role + dashboard | ✅ |
| 1.5 | Admin user details modal | ✅ |
| 1.5 | Admin OTT availability seeding | ✅ |
| 1.5 | Admin blacklist (Firebase disable + Redis fast-reject) | ✅ |
| 1.5 | User preferences (genre + platform) | ✅ |
| 1.5 | Favourite genre stat on profile | ✅ |
| 1.5 | Recently viewed shelf (login-gated, UID-scoped) | ✅ |
| 2.0 | Reviews + ratings (submit, delete, average) | ✅ |
| 2.0 | Genre movies drawer (click genre pill → top 20 by genre) | ✅ |
| 2.0 | Watchlist limit 3 → 5 with inline error message | ✅ |
| 2.0 | PWA homescreen login bug (signInWithRedirect) | ✅ |
| 2.0 | Scroll lag fix (RAF throttle + GPU layer) | ✅ |
| 2.0 | Separate TMDb vs community rating display | ✅ |

---

## Features Backlog

### Phase 2 — Remaining

| ID | Priority | Description |
|----|----------|-------------|
| F-01 | done | **Gamification badges** — "First Review", "10 Movies Watched", "Watchlist Collector". Awarded server-side on qualifying action, displayed on profile page | Fixed 2026-05-25: V15 migration; BadgeService with REQUIRES_NEW tx; wired into ReviewController + WatchlistService; GET /api/user/badges; Achievements section on ProfilePage with locked/earned states |

---

### Phase 2.5 — Groups & Collective Watchlists

Core idea: form a group with friends/family, build a shared watchlist, compete on who watches the most.

| ID | Priority | Description |
|----|----------|-------------|
| F-02 | High | **Create group** — generates a short invite code (e.g. `NINJA42`), stored in `groups` table |
| F-03 | High | **Join group via invite code** — any logged-in user pastes the code and joins |
| F-04 | High | **Group watchlist page** `/groups/{groupId}` — movies added by any member, member avatars showing who has/hasn't watched each title |
| F-05 | High | **Add to group watchlist** — button on movie detail page alongside personal watchlist |
| F-06 | Medium | **Leaderboard** — members ranked by % of group watchlist watched |
| F-07 | Medium | **Suggest a movie** — propose + upvote/downvote within a group; top suggestion auto-added |
| F-08 | Low | **Group notifications** — "John added Inception to your group" (Firebase FCM, links to Phase 4) |

**DB schema needed (next migrations):**
```
groups                   (id, name, invite_code UNIQUE, created_by → users.id, created_at)
group_members            (id, group_id, user_id, role CHECK IN ('admin','member'), joined_at)
group_watchlist          (id, group_id, movie_id, added_by → users.id, added_at, UNIQUE(group_id, movie_id))
group_watchlist_progress (id, group_watchlist_id, user_id, watched_at, UNIQUE(group_watchlist_id, user_id))
group_suggestions        (id, group_id, movie_id, suggested_by → users.id, upvotes INT DEFAULT 0, downvotes INT DEFAULT 0)
```

---

### Phase 2.6 — Discovery & Filtering *(next up)*

| ID | Priority | Description |
|----|----------|-------------|
| F-25 | High | **Unified filter panel on Search/Discover** — genre multi-select, language, platform, min TMDb rating slider, release era (pre-2000 / 2000s / 2010s / 2020s), "available now" toggle. State persisted in URL params so filters survive navigation |
| F-26 | High | **Sort options** — TMDb rating (desc), release date (new/old), popularity, community rating, A–Z. Persisted in URL params alongside filters |
| F-27 | High | **Taste profile setup modal** — 3-step onboarding: pick genres → pick platforms → pick languages. Written to `user_preferences`. Shown on first login; editable from Profile page |
| F-28 | High | **Discover page** `/discover` — curated horizontal shelves driven by preferences: "Because you like Action", "Top on Netflix India", "Leaving Soon", "New Arrivals". Each shelf is a horizontally scrollable `MovieCard` row; TMDB Discover API + availability filter |

---

### Phase 3a — Region-aware Trending *(quick win)*

| ID | Priority | Description |
|----|----------|-------------|
| F-09 | High | **Country/region selector** — navbar dropdown (India, Australia, USA, UK, Canada, Global). Persisted in localStorage. Auto-detect default via `navigator.language` |
| F-10 | High | **Trending by region** — pass `region` to TMDB `/trending/all/day?region={code}`. Cache key `tmdb:trending:{region}` TTL 24h. Label: "Trending in India" / "Trending Globally" |

---

### Phase 3b — Full Country-aware OTT Availability

| ID | Priority | Description |
|----|----------|-------------|
| F-11 | Medium | **Region param through all API calls** — search, detail, and availability endpoints accept `region`; JustWatch locale switches from hardcoded `en_IN` to dynamic |
| F-12 | Medium | **Platform seeds per country** — migrations for AU (Stan, Binge, Foxtel), US (Hulu, Max, Peacock), UK (ITVX, Channel 4) with correct JustWatch provider IDs |
| F-13 | Medium | **Cache key restructure** — `ott:availability:{tmdbId}:{countryCode}`. Breaking change — flush old keys on deploy |
| F-14 | Low | **User country preference** — stored in `user_preferences`, falls back to localStorage for logged-out users |

---

### Phase 3c — Recommendations & Insights

| ID | Priority | Description |
|----|----------|-------------|
| F-15 | High | **"For You" shelf** — TMDB Discover filtered by user's saved genre/platform preferences (preferences already stored, just not used yet — also tracked as B-18) |
| F-16 | Medium | **Curated shelves** on homepage — "Top Rated on Netflix India", "Leaving Soon", "Hidden Gems", "New Arrivals". Built by scheduled job, Redis TTL 6h |
| F-17 | Medium | **Recommendation system** — "Because you watched X". PostgreSQL cosine similarity on genre vectors built from watchlist + ratings |
| F-18 | Low | **Collaborative filtering** — "Users who watched X also liked Y". Feeds from reviews + watchlist + group watch history |

---

### Phase 3d — Data Insights Pipeline

Core idea: derive non-obvious signals from the review/watchlist data already collected and surface them on a dedicated `/insights` page.

| ID | Priority | Description |
|----|----------|-------------|
| F-29 | High | **Hidden Gems detector** — movies with community avg ≥ 4.0 / 5 AND ≥ 3 reviews AND community score beats TMDB-normalised score. SQL: `AVG(r.rating) > (m.vote_average/10*5)` with `vote_count < 50k` guard |
| F-30 | High | **Platform Value Score** — each OTT platform ranked by average community rating across its available titles. Bar/ranked-list on `/insights`. Redis key `insights:platform_scores` TTL 6h |
| F-31 | Medium | **Trending Genres this week** — `LATERAL unnest(genres)` + watchlist `added_at > NOW()-7d` aggregation. Pill chips ranked by addition count |
| F-32 | Medium | **Rising Now** — titles whose 7-day watchlist adds / total adds ratio (momentum score) is highest. Surfaces films gaining traction before they become mainstream |
| F-33 | Low | **Community completion rate** — `watched_at IS NOT NULL` / total adds per movie. Shows which titles people actually finish vs add-and-forget |

**Backend additions needed:**
- `InsightsService` + `InsightsController` (`GET /api/insights` — returns all five sections in one call, auth optional)
- `InsightsRefreshScheduler` — `@Scheduled(cron="0 0 3 * * *")` nightly, writes all five Redis keys
- No new DB migrations — reads existing `reviews`, `watchlists`, `movies`, `movie_availability` tables

**New Redis keys:**

| Key | TTL |
|---|---|
| `insights:hidden_gems` | 6h |
| `insights:platform_scores` | 6h |
| `insights:genre_trends` | 6h |
| `insights:rising` | 6h |
| `insights:completion_rate` | 6h |

**When Kafka becomes relevant:** only when concurrent users reach thousands and we need real-time counters. PostgreSQL batch nightly refresh is sufficient through Phase 3d.

---

### Phase 3e — Community Sentiment *(AI-powered outside-world reviews)*

Core idea: aggregate TMDB reviews + Reddit community discussion per movie, run AI summarisation, surface sentiment + key opinions with a spoiler toggle on the movie detail page.

| ID | Priority | Description |
|----|----------|-------------|
| F-38 | High | **ReviewAggregatorService** — fetches TMDB `/movie/{id}/reviews` (official, free) + searches Reddit API for movie discussion threads (`r/movies`, `r/television`); merges raw text corpus per tmdbId |
| F-39 | High | **AI summarisation job** — sends corpus to Claude/OpenAI; structured output: overall sentiment (Loved/Mixed/Divisive), 3–4 spoiler-free bullet points, 2–3 spoiler-tagged insights. Result cached in Redis key `sentiment:{tmdbId}` TTL 24h |
| F-40 | High | **Spoiler filter UX** — Community Sentiment panel on movie detail page: sentiment pill, bullet list, source chips ("TMDB Reviews · Reddit"). Spoiler section hidden behind blur overlay + "Show spoilers" confirm button |
| F-41 | Medium | **Scheduled refresh** — nightly `@Scheduled` job refreshes sentiment cache for all movies in any watchlist or recently viewed, so detail page loads feel instant |
| F-42 | Low | **Kafka upgrade path** — replace `@Async` aggregation with a Kafka topic (`sentiment.refresh.requested`) when concurrent users reach thousands; Spring Kafka consumer triggers the AI job. Note in design doc now; implement later. |

**Backend additions needed:**
- `ReviewAggregatorService` — TMDB reviews fetch + Reddit OAuth2 API search (100 req/min free tier)
- `SentimentService` — Claude/OpenAI chat completion call, parses structured JSON response
- `SentimentCacheScheduler` — nightly refresh for active movies
- `GET /api/movies/{tmdbId}/sentiment` — returns cached summary; triggers async generation on cache miss
- New Redis keys: `sentiment:{tmdbId}` (TTL 24h)

**Data sources chosen:**
- ✅ TMDB `/movie/{id}/reviews` — official, free, already integrated
- ✅ Reddit API — OAuth2 app, free tier sufficient for portfolio scale
- ❌ Google Reviews — no public API, blocked scraping
- ❌ IMDb/Letterboxd — no official API, ToS violation

---

### Phase 3f — AI Reel Share *(import movie names from shared social reels)*

Core idea: user shares a reel/video from Instagram/YouTube to the app via the mobile share sheet; app extracts movie names from the content and offers to add them to the watchlist.

| ID | Priority | Description |
|----|----------|-------------|
| F-34 | High | **Web Share Target** — add `share_target` to PWA manifest; app receives shared URL/title/text from mobile share sheet via `POST /share-target` |
| F-35 | High | **Text extraction** — parse shared URL/title/text for movie names using regex + Claude API; fastest path, covers most "Top 10 movies" style posts |
| F-36 | High | **YouTube transcript fallback** — if shared URL is a YouTube link, fetch transcript via `youtube-transcript` npm package; send transcript to Claude to extract movie names |
| F-37 | Medium | **Audio scan fallback** — if transcript unavailable, download audio via yt-dlp, transcribe with OpenAI Whisper, extract names from transcript. Heaviest path; runs server-side as async job |

**Flow:** Share sheet → `/share-target` → text extraction (fast) → YouTube transcript (medium) → Whisper audio (slow, async) → return extracted movie list → user confirms → bulk add to watchlist

---

### Phase 4 — Platform Expansion

| ID | Priority | Description |
|----|----------|-------------|
| F-20 | High | **Pagination / infinite scroll** on search results — currently returns page 1 only |
| F-21 | High | **PWA manifest + service worker** — offline shell, install prompt, background sync |
| F-22 | Medium | **Push notifications** — Firebase FCM for expiring watchlist titles and group activity |
| F-23 | Medium | **Rate limiting** — Redis counter per IP on search endpoint (Spring filter) |
| F-24 | Low | **React Native mobile app** — REST API already mobile-ready; needs pagination first |

---

## Architecture Notes

- Next Flyway migration: **V15**
- Backend hosted on Railway; frontend on Vercel (auto-deploy broken — run `vercel --prod` manually from `frontend/`)
- Redis cache key reference: see `ARCHITECTURE.md`
- All new endpoints must follow `ApiResponse<T>` envelope
- Phase 2.5 is the highest-interview-value phase — multi-user data, invite flows, leaderboard aggregation are rare in portfolio projects
- Phase 3e sentiment key: `sentiment:{tmdbId}` TTL 24h — see Phase 3d for other insight keys
