# OTT Finder — Product Roadmap

Last updated: 2026-05-21

**Goal:** Grow from MVP into a portfolio centrepiece for senior product engineering roles in Australia.

**Live URLs:**
- Frontend: https://ott-finder-delta.vercel.app
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

## Phase 2 — Social Layer

- [ ] **Ratings + reviews** — new `reviews` table: `user_id, movie_id, rating 1-5, note TEXT, created_at`. Show aggregate rating + review list on movie detail page.
- [ ] **Gamification badges** — "First Review", "10 Movies Watched", "Watchlist Collector". Awarded server-side, displayed on profile.
- [ ] **Genre movies drawer** — click genre pill → slide-in panel with top movies in that genre. Backend: `GET /api/movies/genre/{id}`, Redis `tmdb:genre:{id}` TTL 6h. Shares same drawer component as actor drawer.
- [ ] **Admin OTT seeding UI** — form to manually add platform availability for movies JustWatch misses (Indian regional films).

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
- [ ] Create group → generates short invite code (e.g. `NINJA42`)
- [ ] Join group via invite code
- [ ] Group watchlist page `/groups/{groupId}` — movies added by any member, avatars showing who has/hasn't watched each
- [ ] Add to group watchlist from movie detail page (alongside personal watchlist button)
- [ ] Leaderboard — members ranked by % of group watchlist watched
- [ ] "Suggest a movie" — propose + upvote/downvote; top suggestion auto-added
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

## Phase 4 — Platform Expansion

- [ ] PWA manifest + service worker (do before native app)
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
