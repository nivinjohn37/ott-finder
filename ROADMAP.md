# WatchMate — Product Roadmap

Last updated: 2026-05-29

**Goal:** Grow from MVP into a portfolio centrepiece for senior product engineering roles in Australia.

**Live URLs:**
- Frontend: https://watchmateapp.vercel.app
- Backend: https://ott-finder-production.up.railway.app

---

## Phase 1 — Complete ✓

- [x] Deploy backend to Railway.app + frontend to Vercel
- [x] Firebase auth + Google sign-in
- [x] Search + movie detail page
- [x] Watchlist (add, remove, per-user cache isolation)
- [x] Mark as watched toggle (V9 migration, optimistic update)
- [x] Trailer player (YouTube modal, TMDB append_to_response)
- [x] Genre pills, runtime, tagline, cast row on movie detail
- [x] Direct URL navigation fix (vercel.json rewrite)
- [x] Watchlist data leak fix between user accounts
- [x] Share button (navigator.share + clipboard fallback)
- [x] Recently viewed shelf (localStorage, login-gated)
- [x] Dark/light theme toggle (CSS vars, anti-flash script)
- [x] Sort + platform filter on search results
- [x] Actor filmography drawer (TMDB person credits, login-gated)
- [x] Search autocomplete suggestions (debounced, 3+ chars)

---

## Phase 1.5 — User Profile & Admin

- [x] **User profile page** `/profile` — display name, Firebase avatar, joined date, stats: movies watched, watchlist size, favourite genre (derived from watchlist genres via V11 migration).
- [x] **Genre/platform preferences** — multi-select chip picker on profile page. V11 migration: `user_preferences` table. `GET/PUT /api/user/preferences`. Powers "For You" shelf in Phase 3.
- [x] **Admin role** — V12 migration: `role VARCHAR(20) DEFAULT 'user'` on `users` table. `GET /api/user/me` returns role. First admin set via Railway DB: `UPDATE users SET role='admin' WHERE email='...'`.
- [x] **Admin dashboard** `/admin` — stats cards (users, watchlist entries, movies in DB, platforms), OTT availability seeding form (search → pick platform → deep link → expiry). Role-gated on frontend (Navigate redirect) and backend (isAdmin check per endpoint).

---

## Phase 2 — Social Layer ✓ *(mostly done)*

- [x] **Ratings + reviews** — `reviews` table (V13), `ReviewController`, `ReviewSection` on movie detail page.
- [x] **Gamification badges** — `BadgeService`, `UserBadge` entity, `BadgeCheckEvent`; "First Review", "10 Movies Watched", "Watchlist Collector" awarded server-side, shown on profile.
- [x] **Genre movies drawer** — `GenreDrawer.tsx`, click genre pill → slide-in panel; `GET /api/movies/genre/{id}`.
- [x] **Admin OTT seeding UI** — `AdminPage` `SeedForm`: search movie → pick platform → deep link → optional expiry. Edit/delete existing availability entries.
- [ ] **Full Admin Dashboard** `/admin` — expanded admin observability and moderation layer. Four tabs:
  - **Overview** — stat cards: total users, total reviews, total watchlist adds, movies in DB, active groups
  - **Content** — most reviewed movies, avg rating distribution chart, genre breakdown (derived from watchlist + reviews data), top OTT platforms by watchlist presence
  - **Reviews** — paginated table of all user reviews; filter by rating / date / reported; delete abusive or policy-violating reviews; soft-delete with reason log
  - **Platforms** — OTT availability seeding form (search movie → pick platform → deep link → optional expiry); existing availability table with edit/delete
  - Backend: `GET /api/admin/stats` (already defined), `GET /api/admin/reviews`, `DELETE /api/admin/reviews/{id}`, extend existing `/api/admin/platforms`
  - Frontend: role-gated (`role === 'admin'`), redirect non-admins to home; reuse existing stat card components

---

## Phase 2.5 — Groups & Collective Watchlists

Core idea: form a group with friends/family, build a shared watchlist, compete on who watches the most.

**DB schema:**
```
groups                   (id, name, invite_code UNIQUE, created_by → users.id, created_at)
group_members            (id, group_id, user_id, role CHECK IN ('admin','member'), joined_at)
group_watchlist          (id, group_id, movie_id, added_by → users.id, added_at, UNIQUE(group_id, movie_id))
group_watchlist_progress (id, group_watchlist_id, user_id, watched_at, UNIQUE(group_watchlist_id, user_id))
group_suggestions        (id, group_id, movie_id, suggested_by → users.id, upvotes INT DEFAULT 0, downvotes INT DEFAULT 0)
```

**Features:**
- [x] Create group → generates short invite code (e.g. `NINJA42`)
- [x] Join group via invite code
- [x] Group watchlist page `/groups/{groupId}` — movies added by any member, avatars showing who has/hasn't watched each
- [x] Add to group watchlist from movie detail page (alongside personal watchlist button)
- [x] Leaderboard — members ranked by % of group watchlist watched
- [x] "Suggest a movie" — propose + upvote/downvote; top suggestion auto-added
- [ ] Notifications — "John added Inception to your group" (Firebase FCM, deferred to Phase 4)

**Interview value:** multi-user data, invite flows, leaderboard aggregation, social product thinking — rare in portfolio projects.

---

## Phase 3 — Geo-awareness, Data Pipeline & Recommendations

### Phase 3a — Region-aware trending *(quick win, do first)*

- [ ] **Country/region selector** — navbar dropdown: India, Australia, USA, UK, Canada, Global. Persisted in localStorage. Flag + country name. Auto-detect default via `navigator.language`.
- [ ] **Trending by region** — pass `region` param to TMDB `GET /trending/all/day?region={code}`. Cache key: `tmdb:trending:{region}` TTL 24h. Homepage label: "Trending in India" / "Trending Globally".
- OTT availability stays India-only in this phase — platform seeds are India-only.

### Phase 3b — Full country-aware OTT availability *(plan carefully, do after Phase 1.5)*

- [ ] **Region param flows through every API call** — search, detail, availability endpoints all accept `region`. JustWatch locale switches from hardcoded `en_IN` to dynamic per country.
- [ ] **Platform seeds per country** — new Flyway migration seeding platforms for AU (Stan, Binge, Foxtel), US (Hulu, HBO Max, Peacock), UK (ITVX, Channel 4), etc. Each has own JustWatch provider IDs.
- [ ] **Cache key restructure** — `ott:availability:{tmdbId}:{countryCode}`. Breaking change — flush old keys on deploy.
- [ ] **User country preference** — stored in `user_preferences` table (same migration as Phase 1.5 prefs). Falls back to localStorage for logged-out users.
- [ ] **"Where to Watch" adapts per country** — movie detail shows correct platforms for selected country. "Not available in [country]" message when no match.

### Phase 3c — Recommendations & Insights

- [ ] **Curated shelves** on homepage — "Top Rated on Netflix India", "Leaving Soon", "Hidden Gems", "New Arrivals". Built by scheduled job using TMDB Discover + availability data. No user data needed. Redis TTL 6h.
- [ ] **"For You" personalised shelf** — TMDB Discover filtered by user's preferred genres/platforms (needs Phase 1.5 preferences). No ML required.
- [ ] **Recommendation system** — "Because you watched X". Start with PostgreSQL cosine similarity on genre vectors; evolve to ML model as data grows. Shown on homepage + profile.
- [ ] **Insights dashboard** `/insights` — sentiment scoring on reviews, "hidden gem" detector (high user rating + low TMDB rating), platform value score, genre trending. PostgreSQL window functions + `/api/insights` endpoint.
- [ ] **Collaborative filtering** — "Users who watched X also liked Y". Feeds from reviews + watchlist + group watch history.

**Tech path:** PostgreSQL window functions → Kafka + Spark if dataset grows.

---

## Phase 3.5 — AI Features *(LLM-powered)*

Core idea: use a large language model (Claude / OpenAI) to make movie discovery feel intelligent and personal. Every feature here is genuinely rare in portfolio projects and maps directly to senior product engineering interview conversations.

**LLM provider:** Claude API (Anthropic) or OpenAI — abstracted behind an `AiService` interface so the provider can be swapped. API key in Railway env vars. Responses cached in Redis to minimise cost.

### 1. Mood / Questionnaire-based Suggestions
- [ ] Frontend: multi-step questionnaire — mood (happy/sad/thrilled/romantic…), genre, runtime preference, language, who you're watching with (alone/family/date/friends)
- [ ] Backend: `POST /api/ai/suggest` — sends answers to LLM with a structured prompt; LLM returns 5 movie titles + reasons; backend searches TMDB for each and returns full `MovieSearchResult[]`
- [ ] UI: dedicated `/discover` page with animated question cards; results shown as a movie grid with "Why we picked this" blurb per card
- [ ] Redis cache key: `ai:suggest:{hash(answers)}` TTL 24h (same answers → same result, saves API cost)

### 2. Natural Language / Emotion Search
- [ ] Frontend: "Describe what you want to watch" free-text input on Search page (alongside existing keyword search); examples shown: "something like Interstellar but shorter", "a feel-good Hindi movie for a rainy Sunday"
- [ ] Backend: `POST /api/ai/nl-search` — LLM interprets the query, extracts intent (genres, themes, mood, era, language), returns TMDB search terms; backend queries TMDB and returns results
- [ ] UI: toggled input mode on SearchPage — "Keyword" vs "Describe it" tab; results look identical to normal search
- [ ] Redis cache key: `ai:nlsearch:{hash(query)}` TTL 6h

### 3. Share a Reel → Auto-add Movies to Wishlist
- [ ] PWA Web Share Target — register app as a share target in `manifest.webmanifest`; when user shares an Instagram/YouTube reel URL to WatchMate, app opens at `/share-target?url=…`
- [ ] Backend: `POST /api/ai/extract-movies` — fetches URL metadata (title, description, captions if available via yt-dlp or oEmbed); sends text to LLM to extract all movie names mentioned; searches TMDB for each; returns list of matched movies
- [ ] Frontend: `/share-target` page — shows extracted movies with posters; user can tick which ones to add to watchlist or group watchlist; one-tap "Add All"
- [ ] Graceful fallback: if URL extraction fails (private reel, no captions), show manual text input — "Paste the caption or description here"
- [ ] Redis cache key: `ai:reel:{hash(url)}` TTL 1h

### 4. AI Review Summary (Spoiler-free + Spoiler mode)
- [ ] Data sources: TMDB reviews (`GET /movie/{id}/reviews`), Reddit search via Pushshift/Reddit API (`r/movies`, `r/india`, `r/bollywood`), user reviews from our own `reviews` table
- [ ] Backend: `GET /api/ai/review-summary/{tmdbId}?spoilers=false|true` — aggregates review text, sends to LLM with prompt to summarise in ~150 words; two separate summaries generated (spoiler-free and full)
- [ ] LLM prompt: "Summarise these reviews in 150 words. Mode: spoiler-free — do not reveal plot twists, endings, or deaths. Focus on tone, performances, and whether audiences enjoyed it."
- [ ] Frontend: on MovieDetailPage, "AI Summary" card below the overview — toggle switch "Spoiler-free / Full summary"; blurred by default for full mode until toggled
- [ ] Redis cache key: `ai:review-summary:{tmdbId}:free` / `ai:review-summary:{tmdbId}:full` TTL 48h (reviews don't change often)

### 5. AI-powered "Because You Watched X" Recommendations
- [ ] Backend: `GET /api/ai/recommendations` (auth required) — takes user's top 5 watched movies (by recency + rating), sends to LLM: "The user enjoyed [Movie A, B, C]. Recommend 8 movies they would like. Return only titles and a one-line reason."
- [ ] Backend searches TMDB for each recommendation, returns `MovieSearchResult[]` with reason attached
- [ ] Frontend: "Picked for You" shelf on HomePage (below trending, login-gated); each card shows the reason tooltip on hover
- [ ] Refreshed when user marks a new movie as watched; Redis cache key: `ai:recs:{userId}` TTL 12h

**Interview value:** LLM integration, prompt engineering, cost management (caching), Web Share Target API, multi-source data aggregation, graceful degradation — covers AI product thinking end-to-end.

---

## Phase 6 — JustWatch-inspired Discovery Features *(do last, polish layer)*

Features identified by studying JustWatch India. Each adds discoverability and engagement without changing the core product. Do after Phase 5 when the product is stable.

### 6a — Content Discovery Enhancements

- [ ] **"Similar Titles" on movie detail** — `GET /api/movies/{id}/similar` → TMDB `/movie/{id}/recommendations`. Show as horizontal shelf below cast. Low effort, high value. Redis TTL 24h.
- [ ] **Multiple trailers on detail page** — TMDB videos response already fetched; currently we display only the first trailer. Surface teaser + trailer + clip as tabs. No new API call needed.
- [ ] **"Hidden Gems" shelf** — TMDB Discover with `vote_average.gte=7.5&vote_count.lte=5000&sort_by=vote_average.desc`. Add as a curated shelf on homepage or genre pages.
- [ ] **"Other works by director/actor"** — already have ActorDrawer for cast; extend to show director's filmography shelf on detail page (links to filtered search, no new API needed).

### 6b — "What's New" & "Coming Soon" Pages

- [ ] **Coming Soon page** `/coming-soon` — TMDB `/movie/upcoming` + `/tv/on_the_air`. Show release date countdown badge per card. No JustWatch dependency. Redis TTL 6h.
- [ ] **What's New page** `/new` — content newly added to each OTT platform. Requires scheduled job to diff JustWatch availability snapshots (complex). Phase 6b candidate; simpler fallback: TMDB `/movie/now_playing` + `/tv/airing_today` per region.

### 6c — Streaming Charts

- [ ] **Daily streaming chart** — rank all movies/shows by TMDB popularity score; run a daily scheduler to snapshot scores and compute rank delta vs. yesterday ("↑26 since yesterday"). Store in new `streaming_chart_snapshots` table.
- [ ] **Rank badge on movie cards** — small chip on MovieCard showing `#12 ↑4` when in chart context.
- [ ] **Charts page** `/charts` — top 50 movies + top 50 shows, with rank movement arrows and delta numbers.

### 6d — Smarter Notifications

- [ ] **"Notify me when available"** — users can flag a movie that's not yet on their preferred platform. When our availability data updates and that platform now has it, trigger a notification. Extends existing `ExpiringContentService` logic with a new `notification_type = 'new_availability'` (already defined in schema).
- [ ] **"Notify me when free"** — variant of above: alert when a rent-only title lands on a subscription service. Requires tracking availability type (free vs. subscription) from JustWatch response — currently ignored.

### 6e — Curated Editorial Lists

- [ ] **Franchise "In Order" guides** — e.g. "MCU in chronological order", "Harry Potter in order". Store as manually seeded `curated_lists` table (id, name, description, ordered list of tmdbIds). `GET /api/lists/{slug}`. Frontend: `/lists/{slug}` page.
- [ ] **"Best of" collections** — "Best Bollywood of 2024", "Top 10 Christopher Nolan Films". Same curated_lists table, admin-seeded via admin dashboard.
- [ ] **Admin list management** — extend admin dashboard with a Lists tab: create/edit/reorder curated lists. No code on movie detail pages needed — lists are standalone discovery pages.

---

## Phase 4 — Platform Expansion

- [x] PWA manifest + service worker — `manifest.webmanifest`, `sw.js`, iOS/Android install guide on Features page
- [ ] Pagination / infinite scroll on search results (currently page 1 only)
- [ ] Push notifications via Firebase FCM (expiring content, group activity)
- [ ] React Native mobile app (REST API already mobile-ready; add pagination first)
- [ ] Rate limiting on search — Redis counter per IP (Spring filter)

---

## Phase 5 — Production Readiness *(do last, before any public launch)*

Full details in [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md).

- [ ] **Rate limiting** — Redis counter per IP on search, join-group, reviews (20 req/min)
- [ ] **Group membership audit** — verify all `/api/groups/{id}/**` endpoints return 403 for non-members
- [ ] **Avatar upload validation** — 2MB size cap, JPEG/PNG/WebP only
- [ ] **Firebase fail-safe** — fail hard on startup if credentials missing in non-local profile
- [ ] **TMDB Watch Providers migration** — replace unofficial JustWatch API with TMDB's official `/watch/providers` endpoint (same data, free, stable)
- [ ] **Sentry error tracking** — `sentry-spring-boot-starter`, free tier, 30 min to add
- [ ] **UptimeRobot** — monitor `/api/health` every 5 min, free
- [ ] **Security headers** — CSP, X-Frame-Options, Content-Type-Options via Spring Security
- [ ] **Audit logging** — `audit_logs` table for admin actions, role changes, group admin ops
- [ ] **Connection pool tuning** — HikariCP `maximum-pool-size: 20`
- [ ] **Group invite code regeneration** — admin can invalidate and regenerate invite code
- [ ] **Pagination / infinite scroll** — `useInfiniteQuery` + IntersectionObserver
- [ ] **Horizontal scaling** — Railway Pro multi-instance when >500 concurrent users
- [ ] **Move avatar storage to object storage** — Cloudflare R2 instead of PostgreSQL BYTEA

---

## Known Limitations

| Limitation | Workaround |
|---|---|
| JustWatch gaps for Indian regional films | Admin OTT seeding UI (Phase 2) |
| Free tier watchlist capped at 3 items | Intentional freemium design |
| Vercel GitHub webhook not auto-deploying | Manual `vercel --prod` after every push |
| OTT availability hardcoded to India (`en_IN`) | Full country support in Phase 3b |
