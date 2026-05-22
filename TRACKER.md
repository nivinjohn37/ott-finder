# OTT Finder — Bug & Feature Tracker

_Last updated: 2026-05-22_

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
| B-02 | open | Profile | Favourite genre stat is silently wrong — genres are only persisted to the DB when the detail page is visited; adding a movie from search results leaves genres null, so the stat is computed from incomplete data | Fix: populate genres when adding to watchlist — either fetch detail in background or call TMDB genres endpoint |
| B-03 | done | Admin | Blacklist does not fully work — two sub-issues: (1) Axios response interceptor converts errors to `new Error(message)`, stripping `err.response`, so the 401 returned by the filter never triggers a frontend sign-out; (2) Firebase ID token remains valid client-side for up to 1 hour after `revokeRefreshTokens` is called, so the user stays "logged in" on the frontend until their token naturally expires | Fixed 2026-05-22: preserved axios error, added 401 → `signOut(auth)` |

---

### Medium Priority — UX Gaps

| ID | Status | Area | Description | Notes |
|----|--------|------|-------------|-------|
| B-04 | open | Reviews | No edit — user must delete their review and re-submit to change it | Fix: add `PATCH /api/movies/{tmdbId}/reviews` endpoint and edit mode in ReviewSection |
| B-05 | open | Watchlist | No sort or filter on the watchlist page — can't filter to "unwatched only" or by platform | Fix: client-side filter chips (Watched / Unwatched / Platform) |
| B-06 | open | Search | Platform and media-type filter chips reset whenever a new search query is typed, losing filter context | Fix: persist filter state in URL params (`?q=...&type=movie&platform=netflix`) |
| B-07 | open | Movie detail | Runtime shows blank or "0h 0m" for TV shows with null episode length | Fix: guard `runtime` — only render the row when `runtime > 0` |
| B-08 | open | Movie detail | Cast row silently truncates at ~15 members with no affordance to see more | Fix: show first 12, add "Show all N" expand button |
| B-09 | open | UX | Hero section auto-rotates with no pause on hover — interrupts users reading the current card | Fix: pause interval `onMouseEnter`, resume `onMouseLeave` |
| B-10 | open | UX | Browser tab title is always "OTT Finder" — detail page doesn't update `<title>` to the movie name | Fix: `useEffect` setting `document.title` on MovieDetailPage, reset on unmount |

---

### Low Priority — Polish

| ID | Status | Area | Description | Notes |
|----|--------|------|-------------|-------|
| B-11 | open | Search | Suggestions dropdown has no debounce — fires on every keystroke at ≥ 2 chars, can show stale results on fast typing | Fix: 300 ms debounce on the suggestions query |
| B-12 | open | Genre drawer | Only fetches movies — clicking a genre pill on a TV show page still shows films only | Fix: pass `mediaType` to backend; add TV support to `getGenreMovies` (TMDB Discover `/tv`) |
| B-13 | open | Movie detail | "Not currently available on Indian OTT platforms" is shown regardless of whether that's true or whether JustWatch simply hasn't indexed the title yet | Fix: surface a softer message like "Availability unknown" when JustWatch returns no results but the movie exists |
| B-14 | open | Admin | After seeding OTT availability, the TMDB movie detail Redis cache is invalidated; the next detail request repopulates it fresh from TMDB — but that re-fetch only calls JustWatch, not the DB, so the seeded entry is absent until the DB-merge path runs again on the next cache miss | Fix: don't invalidate `tmdb:movie:{id}` on seed; only invalidate `ott:availability:{id}` — the OTT layer is separate from TMDB metadata |
| B-15 | open | Admin | No way to delete or edit an existing seeded availability entry from the admin UI | Fix: add delete button per platform row in admin; add `DELETE /api/admin/availability/{id}` endpoint |
| B-16 | open | Infrastructure | `via.placeholder.com` used as fallback for missing posters/backdrops — external dependency that breaks silently if the service is down | Fix: replace with an inline SVG data URI or a locally hosted placeholder |
| B-17 | open | Reviews | Review list has no pagination — on popular titles the list could grow very long | Fix: limit to 10 per page with a "Load more" button; add `?page=` param to the reviews endpoint |
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
| 1.5 | Admin role + dashboard | ✅ |
| 1.5 | Admin user details modal | ✅ |
| 1.5 | Admin OTT availability seeding | ✅ |
| 1.5 | User preferences (genre + platform) | ✅ |
| 1.5 | Favourite genre stat on profile | ✅ |
| 1.5 | Recently viewed shelf (login-gated, UID-scoped) | ✅ |
| 2.0 | Reviews + ratings (submit, delete, average) | ✅ |
| 2.0 | Genre movies drawer (click genre pill → top 20 by genre) | ✅ |
| 2.0 | Admin blacklist (Firebase disable + Redis fast-reject) | ✅ (B-03 pending) |
| 2.0 | Watchlist limit 3 → 5 with inline error message | ✅ (B-19 pending) |
| 2.0 | PWA homescreen login bug (signInWithRedirect) | ✅ |
| 2.0 | Scroll lag fix (RAF throttle + GPU layer) | ✅ |

---

## Features Backlog

| ID | Phase | Priority | Description |
|----|-------|----------|-------------|
| F-01 | 3 | High | Gamification badges — First Review, 10 Movies Watched, Watchlist Collector |
| F-02 | 3 | High | "For You" shelf using saved genre/platform preferences |
| F-03 | 3 | Medium | Region-aware trending — country selector, TMDB `?region=` param |
| F-04 | 3 | Medium | Push notifications for expiring watchlist titles |
| F-05 | 3 | Low | Social layer — share watchlist, see what friends are watching |
| F-06 | 4 | Low | Mobile app (React Native or PWA enhancement) |

---

## Architecture Notes

- Next Flyway migration: **V15**
- Backend hosted on Railway; frontend on Vercel (auto-deploy broken — run `vercel --prod` manually from `frontend/`)
- Redis cache key reference: see `ARCHITECTURE.md`
- All new endpoints must follow `ApiResponse<T>` envelope
