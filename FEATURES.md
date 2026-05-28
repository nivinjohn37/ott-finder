# WatchMate — Master Feature Catalog

This file is the source-of-truth feature inventory for WatchMate.
It is **append-only** — never delete entries, only mark them as done or parked.
Update `ROADMAP.md` for sequencing and priority; update this file when features are added, changed, or parked.

Last updated: 2026-05-28

---

## Core Discovery

| # | Feature | Status | Notes |
|---|---|---|---|
| C1 | Movie / TV search | ✅ Done | Keyword search via TMDB `/search/multi` |
| C2 | Search autocomplete | ✅ Done | Debounced, triggers at 3+ chars |
| C3 | Sort results | ✅ Done | Relevance / Rating / Year (asc + desc) |
| C4 | Platform filter on search | ✅ Done | Filter by Netflix / Prime / Hotstar etc. |
| C5 | Media type filter | ✅ Done | Movie / TV toggle on search results |
| C6 | Movie detail page | ✅ Done | Poster, backdrop, rating, year, genres, runtime, tagline, overview |
| C7 | OTT availability badges | ✅ Done | Shows which Indian platforms stream the movie |
| C8 | Trailer player | ✅ Done | YouTube modal, TMDB `append_to_response=videos` |
| C9 | Cast row | ✅ Done | Top cast shown on movie detail |
| C10 | Actor filmography drawer | ✅ Done | Slide-in panel with TMDB person credits; login-gated |
| C11 | Genre movies drawer | ✅ Done | Click genre pill → slide-in panel of top movies in that genre |
| C12 | Trending page | ✅ Done | `/trending` — all trending movies from TMDB |
| C13 | Share button | ✅ Done | `navigator.share` + clipboard fallback |
| C14 | Recently viewed shelf | ✅ Done | localStorage, max 10 items, deduped, login-gated |
| C15 | Hero section | ✅ Done | Auto-rotating hero from trending[0..4] on homepage |

---

## Watchlist & Tracking

| # | Feature | Status | Notes |
|---|---|---|---|
| W1 | Add to personal watchlist | ✅ Done | Auth-gated; free tier capped at 5 items |
| W2 | Remove from watchlist | ✅ Done | Hard delete |
| W3 | Mark as watched toggle | ✅ Done | Sets `watched_at`; optimistic update on frontend |
| W4 | Expiring soon warning | ✅ Done | Badge on watchlist items expiring within 7 days |
| W5 | Admin unlimited watchlist | ✅ Done | Admin role bypasses free tier cap (V17 migration) |
| W6 | Watchlist page | ✅ Done | `/watchlist` — shows all saved movies with platform badges |

---

## User & Auth

| # | Feature | Status | Notes |
|---|---|---|---|
| U1 | Google sign-in | ✅ Done | Firebase Auth, Google OAuth |
| U2 | User profile page | ✅ Done | `/profile` — display name, avatar, joined date |
| U3 | Profile stats | ✅ Done | Total watchlist, total watched, favourite genre |
| U4 | Display name editor | ✅ Done | Editable on profile page |
| U5 | Avatar upload | ✅ Done | Stored as BYTEA in PostgreSQL; served via `/api/user/avatar/{uid}` |
| U6 | Genre preferences | ✅ Done | Multi-select chip picker; stored in `user_preferences` table |
| U7 | Platform preferences | ✅ Done | Multi-select chip picker; stored in `user_preferences` table |
| U8 | Admin role | ✅ Done | `role` column on users (V12); V17 seeds admin for app owner |

---

## Ratings & Reviews

| # | Feature | Status | Notes |
|---|---|---|---|
| R1 | Star rating (1–5) | ✅ Done | Stored in `reviews` table (V13) |
| R2 | Text review / note | ✅ Done | Optional note alongside star rating |
| R3 | Review list on movie detail | ✅ Done | `ReviewSection` component on MovieDetailPage |
| R4 | Aggregate rating display | ✅ Done | Average shown alongside TMDB rating |

---

## Gamification & Badges

| # | Feature | Status | Notes |
|---|---|---|---|
| G1 | "First Review" badge | ✅ Done | Awarded on first review submitted |
| G2 | "10 Movies Watched" badge | ✅ Done | Awarded when `watched_at` count reaches 10 |
| G3 | "Watchlist Collector" badge | ✅ Done | Awarded when watchlist reaches threshold |
| G4 | Badges displayed on profile | ✅ Done | Shown in profile page badge section |
| G5 | Server-side badge award logic | ✅ Done | `BadgeService` + `BadgeCheckEvent` on relevant actions |

---

## Groups & Collective Watchlists

| # | Feature | Status | Notes |
|---|---|---|---|
| GR1 | Create a group | ✅ Done | Generates short unique invite code (e.g. `NINJA42`) |
| GR2 | Join group via invite code | ✅ Done | Any authenticated user can join with code |
| GR3 | Groups list page | ✅ Done | `/groups` — all groups the user belongs to |
| GR4 | Group detail page | ✅ Done | `/groups/{groupId}` — three-tab view |
| GR5 | Group watchlist tab | ✅ Done | Movies added by any member; per-member watched progress |
| GR6 | Add movie to group watchlist | ✅ Done | From movie detail page alongside personal watchlist button |
| GR7 | Leaderboard tab | ✅ Done | Members ranked by % of group watchlist watched; 🥇🥈🥉 medals |
| GR8 | Suggest a movie | ✅ Done | Any member can propose a movie |
| GR9 | Upvote / downvote suggestions | ✅ Done | Toggle voting; top suggestion highlighted |
| GR10 | Leave group | ✅ Done | Member can leave; confirmation dialog |
| GR11 | Group FCM notifications | 🔜 Phase 4 | "John added Inception to your group" — deferred |

---

## Admin Dashboard

| # | Feature | Status | Notes |
|---|---|---|---|
| A1 | Role-gated access | ✅ Done | Non-admins redirected to home; backend isAdmin check |
| A2 | Stats cards | ✅ Done | Users, watchlist entries, movies in DB, platforms |
| A3 | OTT availability seeding form | ✅ Done | Search movie → pick platform → deep link → optional expiry |
| A4 | Edit / delete availability entries | ✅ Done | Manage existing `movie_availability` rows |
| A5 | Overview tab (expanded) | 🔜 Phase 2 | Total users, reviews, watchlist adds, movies, active groups |
| A6 | Content metrics tab | 🔜 Phase 2 | Most reviewed movies, rating distribution, genre breakdown, top platforms |
| A7 | Review moderation tab | 🔜 Phase 2 | Paginated all-reviews table; filter; delete abusive reviews |
| A8 | Platforms management tab | 🔜 Phase 2 | Full CRUD on OTT availability entries |
| A9 | User management | 🔜 Phase 2 | View all users, blacklist/unblacklist |

---

## UI & Experience

| # | Feature | Status | Notes |
|---|---|---|---|
| UX1 | Dark / light theme toggle | ✅ Done | CSS custom properties; anti-flash inline script in `index.html` |
| UX2 | Responsive layout | ✅ Done | Mobile-first Tailwind; navbar collapses to hamburger |
| UX3 | Skeleton loading cards | ✅ Done | `SkeletonCard` component during fetch |
| UX4 | Empty state illustrations | ✅ Done | `EmptyState` component for no-results / empty watchlist |
| UX5 | PWA install support | ✅ Done | `manifest.webmanifest` + `sw.js`; iOS/Android install guide on Features page |
| UX6 | Features page | ✅ Done | `/features` — animated showcase of all app capabilities |
| UX7 | Offline fallback | ✅ Done | Service worker cache-first for static assets |
| UX8 | Pagination / infinite scroll | 🔜 Phase 4 | `useInfiniteQuery` + IntersectionObserver |

---

## Geo-awareness & Regions

| # | Feature | Status | Notes |
|---|---|---|---|
| GEO1 | India-only OTT availability | ✅ Done | JustWatch locale hardcoded to `en_IN` |
| GEO2 | Country / region selector | 🔜 Phase 3a | Navbar dropdown; India, AU, USA, UK, Canada, Global |
| GEO3 | Trending by region | 🔜 Phase 3a | TMDB `region` param; homepage label "Trending in India" |
| GEO4 | Country-aware OTT availability | 🔜 Phase 3b | Dynamic JustWatch locale per country |
| GEO5 | Platform seeds per country | 🔜 Phase 3b | AU (Stan, Binge, Foxtel), US (Hulu, HBO Max), UK (ITVX) etc. |
| GEO6 | "Not available in [country]" | 🔜 Phase 3b | Message on movie detail when no platforms in selected region |

---

## Recommendations & Insights

| # | Feature | Status | Notes |
|---|---|---|---|
| REC1 | Curated shelves on homepage | 🔜 Phase 3c | "Top Rated on Netflix", "Leaving Soon", "Hidden Gems", "New Arrivals" |
| REC2 | "For You" personalised shelf | 🔜 Phase 3c | TMDB Discover filtered by user genre/platform preferences |
| REC3 | Collaborative filtering | 🔜 Phase 3c | "Users who watched X also liked Y" |
| REC4 | Insights dashboard | 🔜 Phase 3c | `/insights` — hidden gem detector, genre trends, platform value scores |

---

## AI Features *(LLM-powered)*

| # | Feature | Status | Notes |
|---|---|---|---|
| AI1 | Mood / questionnaire suggestions | 🔜 Phase 3.5 | `/discover` — animated quiz → LLM → 5 tailored movies with reasons |
| AI2 | Natural language / emotion search | 🔜 Phase 3.5 | "Something like Interstellar but shorter" → LLM intent → TMDB results |
| AI3 | Share a reel → auto-add to wishlist | 🔜 Phase 3.5 | Web Share Target → LLM extracts movie names from reel → add to watchlist |
| AI4 | AI review summary (spoiler toggle) | 🔜 Phase 3.5 | TMDB + Reddit + own reviews → LLM → spoiler-free / full toggle on movie detail |
| AI5 | "Because you watched X" shelf | 🔜 Phase 3.5 | Watch history → LLM → 8 recommendations with reasons on homepage |

---

## Platform & Infrastructure

| # | Feature | Status | Notes |
|---|---|---|---|
| P1 | Backend on Railway.app | ✅ Done | Spring Boot; auto-deploy on push to main |
| P2 | Frontend on Vercel | ✅ Done | React/Vite; manual `vercel --prod` (webhook broken) |
| P3 | Firebase Auth | ✅ Done | Google sign-in; JWT verified server-side |
| P4 | PostgreSQL on Railway | ✅ Done | Primary database; Flyway migrations V1–V17 |
| P5 | Redis on Railway | ✅ Done | Response caching; TTLs defined per key pattern |
| P6 | GitHub Actions CI | ✅ Done | Backend tests + frontend lint/build on push to main |
| P7 | Firebase FCM push notifications | 🔜 Phase 4 | Expiring content alerts + group activity |
| P8 | React Native mobile app | 🔜 Phase 4 | REST API already mobile-ready; add pagination first |
| P9 | Rate limiting | 🔜 Phase 5 | Redis counter per IP; 20 req/min on search/reviews/join-group |
| P10 | Sentry error tracking | 🔜 Phase 5 | `sentry-spring-boot-starter`, free tier |
| P11 | UptimeRobot monitoring | 🔜 Phase 5 | `/api/health` every 5 min |
| P12 | Security headers | 🔜 Phase 5 | CSP, X-Frame-Options via Spring Security |
| P13 | HikariCP pool tuning | 🔜 Phase 5 | `maximum-pool-size: 20` |
| P14 | Horizontal scaling | 🔜 Phase 5 | Railway Pro multi-instance when >500 concurrent users |
| P15 | Avatar storage migration | 🔜 Phase 5 | PostgreSQL BYTEA → Cloudflare R2 |
| P16 | TMDB Watch Providers migration | 🔜 Phase 5 | Replace unofficial JustWatch API with TMDB official endpoint |
| P17 | Audit logging | 🔜 Phase 5 | `audit_logs` table for admin actions and role changes |

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✅ Done | Built and deployed |
| 🔜 Phase X | Planned, not yet started |
| ⏸ Parked | Deprioritised, may revisit |
| ❌ Dropped | Decided not to build |
