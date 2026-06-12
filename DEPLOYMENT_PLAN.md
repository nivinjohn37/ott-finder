# WatchMate — Public Launch & Deployment Plan

_Created: 2026-06-11 | Status: PENDING REVIEW — not yet actioned_

This document captures everything that must be addressed before WatchMate goes public. It has two parts:

1. **Pre-Launch Readiness Checklist** — 22 issues identified across security, scaling, reliability, legal, and UX
2. **Multi-Environment Deployment Architecture** — the target infrastructure model with staging + load-balanced production

---

## Part 1 — Pre-Launch Readiness Checklist

Issues are grouped by priority. Nothing in Critical or High should be live-facing before it is resolved.

---

### CRITICAL (ship-blockers — fix before any public traffic)

#### 1. AI endpoints are completely public
**File:** `backend/src/main/java/com/ottfinder/config/SecurityConfig.java:38`

`/api/ai/**` is in the `permitAll` list. Every AI endpoint — review summaries, NL search, mood suggestions — is callable by any anonymous user on the internet. A single script can exhaust your Anthropic API budget overnight.

**Fix:** Move AI endpoints behind auth, or add per-IP rate limiting with Redis counters in front of those routes before removing the `permitAll`.

---

#### 2. No rate limiting (explicitly flagged as not implemented)
**Reference:** ARCHITECTURE.md — "Rate limit: 10 search requests/minute per IP — not yet implemented"

Without rate limiting, a bot can exhaust your TMDB 40 req/10s quota (causing 429s for all users), hammer the Railway DB, and spike memory on the single instance.

**Fix:** Add a Spring `OncePerRequestFilter` that uses Redis `INCR` + `EXPIRE` to count requests per IP per minute. Return `429 Too Many Requests` when the limit is exceeded. Suggested limits:
- Search: 20 req/min per IP
- AI endpoints: 5 req/min per authenticated user
- All other endpoints: 60 req/min per IP

---

#### 3. CORS is too permissive
**File:** `backend/src/main/java/com/ottfinder/config/SecurityConfig.java:53`

`allowedOriginPatterns` includes `https://*.vercel.app` — this matches every Vercel deployment globally, not just yours. A malicious site deployed on Vercel can make authenticated cross-origin requests using your users' credentials.

**Fix:** Replace the wildcard with your exact domain:
```java
config.setAllowedOriginPatterns(List.of(
    "http://localhost:3000",
    "http://localhost:5173",
    "https://watchmateapp.vercel.app",
    "https://watchmateapp-staging.vercel.app"  // staging domain
));
```

---

#### 4. Avatar stored as BYTEA in PostgreSQL
**Reference:** V10 migration — `avatar_data BYTEA` column on the `users` table

Every `SELECT` on the users table loads avatar blobs into JVM heap. With 1000 users this causes routine queries to slow down and Railway's 512MB RAM to start pressuring. There is no file size limit on the upload endpoint either — a 50MB upload would succeed today.

**Fix:**
- Store avatars in Firebase Storage (the SDK is already wired up)
- Save only a URL string in the DB — drop the `avatar_data` and `avatar_content_type` columns in a new migration
- Add `@RequestPart` max size of 2MB on the upload controller
- Add server-side MIME type validation (accept only `image/jpeg`, `image/png`, `image/webp`)

---

### HIGH (fix before announcing publicly)

#### 5. Firebase credentials must not be on disk in production
**File:** `backend/src/main/resources/application.yml:56`

`firebase.credentials-path` defaults to `./firebase-credentials.json`. Verify:
- `firebase-credentials.json` is in `.gitignore`
- Production uses `FIREBASE_CREDENTIALS_JSON` env var (JSON string), not a file path
- The Railway environment has this variable set

---

#### 6. No error tracking
The `GlobalExceptionHandler` logs to SLF4J → Railway stdout. You have no visibility into production error rates unless you are actively watching logs.

**Fix:** Add Sentry for Spring Boot:
```xml
<dependency>
    <groupId>io.sentry</groupId>
    <artifactId>sentry-spring-boot-starter-jakarta</artifactId>
    <version>7.x</version>
</dependency>
```
Add `sentry.dsn=${SENTRY_DSN}` to `application.yml`. Free tier handles ~5k errors/month. Set up an alert for error spikes.

---

#### 7. No uptime monitoring
If Railway crashes at 3am you find out when someone messages you.

**Fix:** Set up a free uptime monitor (UptimeRobot or Better Stack) on:
- `https://ott-finder-production.up.railway.app/api/health` (backend)
- `https://watchmateapp.vercel.app` (frontend)

Configure email/Slack alerts for any downtime over 2 minutes.

---

#### 8. Railway auto-deploys to production with no gate
Any push to `main` deploys directly to production. If a Flyway migration fails, the app is down until you push a fix.

**Fix:** This is addressed fully in Part 2 (staging environment). Until that is set up, enable Railway's deploy confirmation prompt so you can review before each production deploy goes live.

---

#### 9. No input length constraints on free-text fields
Review bodies, search queries, group names, and display names have no server-side `@Size` constraint. A 1MB search query won't cause SQL injection (JPA is safe) but will log giant strings, waste Redis memory (`tmdb:search:{query}` key becomes huge), and can cause OOM on the thread pool queue.

**Fix:** Add `@Size` annotations on all request DTOs:
- Search query: max 200 chars
- Review body: max 2000 chars
- Display name: max 100 chars
- Group name: max 100 chars

---

#### 10. JustWatch unofficial API — user-facing fallback missing
JustWatch is an unofficial API with no SLA. It already fails gracefully (returns empty list), but the UI shows "not available on any platform" with no explanation, which looks like a bug to users.

**Fix:** Add a `lastVerifiedAt` timestamp to the OTT availability UI on `MovieDetailPage`. When availability is empty and `lastVerifiedAt` is null or stale (>24h), show: "OTT data unavailable — check back later."

---

### MEDIUM (within first week of going live)

#### 11. No Privacy Policy or Terms of Service
You collect: email addresses, watchlists (which movies a person watches), reviews linked to user identity, and avatars. Google OAuth sign-in requires a privacy policy URL registered in Firebase Console. Without it, some Google accounts may be blocked from signing in. This is also legally required under India's IT Rules 2021.

**Fix:**
- Write a simple 1-page privacy policy (generators: Termly, PrivacyPolicies.com)
- Add links in the footer and on the sign-in screen
- Register the URL in Firebase Console → Authentication → Settings → Privacy policy URL

---

#### 12. TMDB attribution missing
TMDB's API terms require you to display "This product uses the TMDB API" with their logo on any page showing TMDB data.

**Fix:** Add TMDB logo + link in the footer:
```
This product uses the TMDB API but is not endorsed or certified by TMDB.
[TMDB logo → https://www.themoviedb.org]
```

---

#### 13. Notification system is incomplete
The `notification_logs` table exists and `ExpiringContentService` runs daily, but there is no email delivery — no SMTP, no SendGrid, no Firebase Cloud Messaging. The scheduler writes logs to the DB but no user ever receives a notification.

**Fix (Option A):** Wire up SendGrid (free tier: 100 emails/day). Add `spring-boot-starter-mail`, configure SendGrid SMTP, and send a simple HTML email when `ExpiringContentService` fires.

**Fix (Option B):** Disable the scheduler and remove expiry warning UI elements until notifications are properly implemented. Do not show users a feature that silently does nothing.

---

#### 14. Vercel auto-deploy is broken
**Reference:** ARCHITECTURE.md — "Vercel GitHub webhook broken. Manual deploy required: `cd frontend && vercel --prod`"

If you push a backend fix to `main`, the backend updates but the frontend does not. This creates version mismatches between API and UI.

**Fix:** In Vercel Dashboard → Project Settings → Git → disconnect the GitHub repo and reconnect it. This re-registers the webhook. Verify a test push triggers an automatic deployment.

---

#### 15. No graceful shutdown
Railway restarts the dyno on every deploy. In-flight requests are killed mid-execution. With the current single instance, this means a brief window of errors on every deploy.

**Fix:** Add to `application.yml`:
```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 15s
```
Spring will stop accepting new requests and drain existing ones before shutting down.

---

#### 16. DB connection pool vs Railway Postgres limits
Railway Hobby PostgreSQL allows a maximum of 25 concurrent connections. `hikari.maximum-pool-size: 10` currently uses 40% of that limit with one instance. Two production instances (see Part 2) would use 20 connections — close to the cap. Async jobs and Flyway migrations also hold connections.

**Fix (short-term):** Reduce `hikari.maximum-pool-size` to 7 per instance (2 instances × 7 = 14, leaves headroom for migrations and admin queries).

**Fix (long-term):** Upgrade to Railway Pro Postgres which supports pgBouncer connection pooling, removing the hard connection cap.

---

### LOW (post-launch polish)

#### 17. No structured logging
Logs are plain text. For production debugging you cannot filter by user ID, request ID, or error code without grepping raw lines.

**Fix:** Add `logstash-logback-encoder` and output JSON logs. Railway's log drain can then query by field.

---

#### 18. No Spring Actuator health probes
`/api/health` returns 200 regardless of whether the DB or Redis connection is actually healthy. If Redis goes down, the app silently returns stale data (or errors) but the health check still passes.

**Fix:** Add Spring Actuator with a deep health check:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      show-details: when-authorized
```
Point your uptime monitor at `/actuator/health` instead of `/api/health`.

---

#### 19. PWA / installable app
The app works on mobile but cannot be installed to the home screen. For a portfolio project, an installable PWA is a strong differentiator.

**Fix:** Add `manifest.json` (name, icons, theme colour) and a minimal service worker for offline fallback. Vite's `vite-plugin-pwa` makes this ~30 minutes of work.

---

#### 20. No analytics
Without analytics you cannot tell which features users actually use, which pages have high bounce rates, or whether any users return after day one. Analytics data is also useful evidence for portfolio presentations.

**Fix:** Add Plausible Analytics or PostHog (both have free tiers, both are privacy-friendly). Add the script tag to `index.html`.

---

#### 21. Search pagination not visible to users
The backend supports `?page={n}` on `/api/movies/search` but `SearchPage.tsx` only shows page 1. Users searching for a common title (e.g. "Spider-Man") get 20 results with no way to see more.

**Fix:** Add infinite scroll or a "Load more" button on `SearchPage`. Use React Query's `useInfiniteQuery` — it is already a dependency.

---

#### 22. AI review summary cached for 48h including the "not enough reviews" case
`ReviewSummaryService` returns null when there are fewer than 3 reviews. That null response is cached under the same Redis key with the same 48h TTL. After a movie gets its 3rd review, the summary won't appear for up to 48 hours.

**Fix:** Only write to the cache when there are enough reviews. Return the null response without caching when the threshold is not met.

---

## Part 2 — Multi-Environment Deployment Architecture

---

### Overview

The target model is three tiers:

```
Local (docker-compose)
    │
    │  PR merged to staging branch
    ▼
Staging (Railway) ─── 1 instance, staging DB, staging Redis
    │
    │  PR merged to main after QA sign-off
    ▼
Production (Railway) ─── 2 replicas, load balanced, prod DB, prod Redis
                               │
                    Railway built-in round-robin LB
```

The frontend mirrors this automatically through Vercel:
- Pull request → Vercel preview URL (isolated, per-PR)
- `staging` branch → `watchmateapp-staging.vercel.app`
- `main` branch → `watchmateapp.vercel.app` (production)

---

### Git Branching Model

```
feature/xyz ──┐
feature/abc ──┤──► staging ──► main
hotfix/def ───┘         │       │
                        │       └── production
                        └────────── staging environment
```

| Branch | Purpose | Deploys to |
|---|---|---|
| `feature/*` | Developer work | Vercel PR preview only |
| `staging` | Integration + QA | Staging Railway + Vercel staging |
| `main` | Stable, production-ready | Production Railway + Vercel production |

**Rules:**
- Feature branches open PRs against `staging`, never directly against `main`
- `main` only receives PRs from `staging` (after QA passes) and hotfixes
- Hotfixes branch off `main`, merge to `main` first, then back-merge to `staging`

---

### Infrastructure Per Environment

| Resource | Local | Staging | Production |
|---|---|---|---|
| Backend instances | 1 (docker-compose) | 1 (Railway) | 2 replicas (Railway Pro) |
| Load balancer | N/A | N/A | Railway built-in (round-robin) |
| PostgreSQL | docker-compose | Dedicated Railway Postgres | Dedicated Railway Postgres |
| Redis | docker-compose | Dedicated Railway Redis | Dedicated Railway Redis |
| Frontend | `localhost:5173` | Vercel staging deploy | Vercel production |
| Firebase project | Dev Firebase project | Dev Firebase project | Production Firebase project |
| TMDB API key | Shared | Shared (staging traffic is tiny) | Shared |
| Anthropic API key | Shared | Separate key with spending limit | Production key |
| Sentry environment | — | `staging` | `production` |

**Key point:** Staging and production databases are completely separate. You never test against production data. Staging always runs the same or newer Flyway migration version than production — migrations are validated on staging first.

---

### Deployment Workflow

#### Feature development
```
1. git checkout staging && git pull
2. git checkout -b feature/my-feature
3. ... develop and commit ...
4. Open PR: feature/my-feature → staging
5. Vercel generates a preview URL — review UI in isolation
6. Code review passes → merge to staging
7. Railway auto-deploys staging backend
8. Vercel auto-deploys staging frontend
9. QA on watchmateapp-staging.vercel.app with staging DB
10. Open PR: staging → main
11. Final review → merge
12. Railway rolling restart: replica 1 updates, then replica 2
13. Vercel production deploy triggers automatically
```

#### Hotfix
```
1. git checkout main && git pull
2. git checkout -b hotfix/critical-bug
3. Fix → open PR against main
4. Merge to main → production deploy
5. Cherry-pick or back-merge the fix to staging
```

#### Database migration
```
1. Write the new V{n}__description.sql migration
2. Deploy to staging → Flyway runs on startup → verify app works
3. Deploy to production → Flyway runs on startup → production migrated
```
Never write a destructive migration (DROP COLUMN, DROP TABLE) until the column/table has been unused in production for at least one full deploy cycle.

---

### Session Stickiness

Not required. All auth state is in Firebase JWTs (stateless). All shared state (cache, blacklists) is in Redis, which both production replicas connect to. Any replica can serve any request.

---

### Rollback Strategy

| Layer | Method | Time to recover |
|---|---|---|
| Frontend | Vercel dashboard → Promote previous deployment | < 1 minute |
| Backend (code) | Railway dashboard → Redeploy previous image tag | 2–3 minutes |
| Backend (schema) | Manual: write a compensating migration, deploy | 5–15 minutes |

Database rollback is the slow path. Avoid it by testing every migration on staging first. For large or risky migrations (dropping columns, changing types), keep the old column around for one release cycle before removing it.

---

### Environment Variables

Each Railway environment has its own set of variables. No variable is shared between staging and production.

| Variable | Staging value | Production value |
|---|---|---|
| `DATABASE_URL` | Staging Postgres connection string | Production Postgres connection string |
| `REDIS_HOST` / `REDIS_PASSWORD` | Staging Redis | Production Redis |
| `FIREBASE_CREDENTIALS_JSON` | Dev Firebase project credentials | Production Firebase project credentials |
| `TMDB_API_KEY` | Same key (shared) | Same key (shared) |
| `ANTHROPIC_API_KEY` | Separate key with $10/mo spending cap | Production key |
| `SENTRY_DSN` | Staging DSN | Production DSN |
| `FIREBASE_ENABLED` | `true` | `true` |

---

### Cost Estimate (post-launch)

| Resource | Monthly cost (approx.) |
|---|---|
| Railway Pro plan (required for replicas) | $20 |
| 2 × production backend instances | $10–15 compute |
| 1 × staging backend instance | $5 compute |
| Production PostgreSQL (Railway Pro Postgres) | $5–10 |
| Staging PostgreSQL | $5 |
| Production Redis | $3 |
| Staging Redis | $3 |
| Vercel (frontend, all environments) | Free |
| Sentry (error tracking) | Free (up to 5k errors/mo) |
| UptimeRobot (uptime monitoring) | Free |
| **Total estimate** | **~$50–60/mo** |

Current spend is approximately $10–15/mo. Public launch roughly quadruples the infrastructure cost.

---

### What Railway Pro Buys You

The current Railway Hobby plan does not support multiple replicas. Upgrading to Railway Pro ($20/mo base) unlocks:
- Horizontal scaling with multiple replicas per service
- Built-in round-robin load balancer
- Higher Postgres connection limits (via pgBouncer on Pro Postgres)
- Zero-downtime deploys (rolling restart across replicas)
- Deploy pause / manual promotion gates

---

### Implementation Order

When ready to execute this plan, follow this sequence:

1. **Fix all 4 Critical items** (rate limiting, AI auth, CORS, avatar storage)
2. **Fix all 6 High items** (Sentry, uptime monitor, Firebase creds, graceful shutdown, input validation, JustWatch fallback UI)
3. **Set up staging environment** on Railway, connect `staging` branch
4. **Fix Vercel webhook** so staging and production auto-deploy
5. **Write and publish Privacy Policy + ToS**
6. **Add TMDB attribution** to the UI
7. **Upgrade Railway to Pro**, enable 2 replicas on production
8. **Address Medium items** (notifications decision, Actuator health)
9. **Announce** — share on LinkedIn, add to portfolio, submit to Product Hunt / IndieHackers
10. **Address Low items** iteratively after launch

---

_Next migration available: V21_
_Last infrastructure review: 2026-06-11_
