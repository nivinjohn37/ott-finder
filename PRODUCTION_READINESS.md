# WatchMate — Production Readiness Plan

_Last updated: 2026-05-27_

This document covers everything needed before a real public launch: scalability, security hardening, API sustainability, and monitoring. Treat this as **Phase 5** — to be tackled after Phase 4 (Platform Expansion).

---

## Current Capacity Baseline

| Component | Host | Comfortable Ceiling |
|---|---|---|
| Frontend | Vercel CDN | ✅ Unlimited — auto-scales |
| Backend | Railway Hobby (1 instance) | ~200–300 concurrent users |
| PostgreSQL | Railway (single instance) | ~200 concurrent connections |
| Redis | Railway (single instance) | Not a bottleneck |

```
Friends / beta testing  (~50 users):   ✅ Fine right now
Portfolio demo          (~500 users):  ⚠️ Add rate limiting + avatar fix
Real public launch      (1000+ users): 🚧 Full plan below required
```

---

## 1 — Scalability

### 1a — Rate Limiting *(do first, highest ROI)*

No rate limiting exists anywhere today. A bot or abusive user can:
- Burn through TMDB's 40 req/10s quota by hammering `/api/movies/search`
- Brute-force group invite codes via `/api/groups/join`
- Spam the watchlist/review endpoints

**Plan:**
- Add Redis counter per IP: `rate:{endpoint}:{ip}` with TTL window
- Limits: search 20 req/min, join-group 10 req/min, reviews 30 req/min
- Return `429 Too Many Requests` with `Retry-After` header
- Implement as a Spring `OncePerRequestFilter` (reuse Redis already in stack)

```java
// Pseudocode — RateLimitFilter.java
String key = "rate:search:" + clientIp;
Long count = redisTemplate.opsForValue().increment(key);
if (count == 1) redisTemplate.expire(key, 1, TimeUnit.MINUTES);
if (count > 20) throw new RateLimitExceededException();
```

### 1b — Database Connection Pool Tuning

HikariCP defaults (10 max connections). Fine for light load, queues under concurrent bursts.

**Plan:**
```yaml
# application.yml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
```

### 1c — Horizontal Scaling (Railway)

Single instance today. Railway supports multiple replicas on paid plans.

**Plan:**
- Upgrade Railway to Pro plan when needed ($20/mo)
- Add `RAILWAY_REPLICAS=2` env var to enable dual instances
- Ensure all session state is in Redis (already stateless JWT — ✅ no changes needed)
- Add Railway health check endpoint (already have `/api/health` — ✅)

### 1d — Pagination on Search Results

Search currently returns page 1 from TMDB only (up to 20 results). No infinite scroll.

**Plan:**
- Pass `page` param through to TMDB: `GET /api/movies/search?q={q}&page={n}`
- Frontend: React Query `useInfiniteQuery` + IntersectionObserver for infinite scroll
- Already partially designed in ARCHITECTURE.md

### 1e — Database Read Replica (long term)

For read-heavy workloads (search, trending, leaderboard queries), a read replica offloads the primary.

**Plan:**
- Railway Postgres supports read replicas on Pro plan
- Route all SELECT queries to replica via Spring's `AbstractRoutingDataSource`
- Write queries (watchlist, reviews, groups) stay on primary

---

## 2 — Security Hardening

### 2a — Rate Limiting (same as 1a — dual benefit)
Already covered above. Both a scalability and security fix.

### 2b — Group Membership Verification Audit

Risk: An authenticated user who is **not a member** of a group could access group data by guessing a numeric group ID.

**Audit checklist — verify each endpoint in GroupService:**
- [ ] `GET /api/groups/{groupId}` — returns 403 if not a member
- [ ] `GET /api/groups/{groupId}/watchlist` — returns 403 if not a member
- [ ] `PATCH /api/groups/{groupId}/watchlist/{itemId}/watched` — returns 403 if not a member
- [ ] `GET /api/groups/{groupId}/leaderboard` — returns 403 if not a member
- [ ] `GET /api/groups/{groupId}/suggestions` — returns 403 if not a member
- [ ] `POST /api/groups/{groupId}/suggestions/{id}/vote` — returns 403 if not a member

**Fix pattern:**
```java
// In GroupService — add to every method
private void assertMembership(Long groupId, Long userId) {
    if (!memberRepository.existsByGroupIdAndUserId(groupId, userId)) {
        throw new AccessDeniedException("Not a member of this group");
    }
}
```

### 2c — Avatar Upload Validation

Currently stores raw bytes with no server-side checks. Risks:
- Oversized files bloating the DB (50MB BYTEA kills performance)
- Non-image uploads (malicious file types)

**Plan:**
```java
// UserController.java — avatar upload endpoint
if (file.getSize() > 2 * 1024 * 1024) throw new ValidationException("Max 2MB");
String contentType = file.getContentType();
if (!List.of("image/jpeg", "image/png", "image/webp").contains(contentType)) {
    throw new ValidationException("Only JPEG, PNG, WebP allowed");
}
```

### 2d — Firebase Credentials Fallback Risk

`SecurityConfig` has this pattern:
```java
if (firebaseAuthFilter != null) {
    // auth enforced
} else {
    // ALL routes open — no auth at all
}
```

If `FIREBASE_CREDENTIALS_PATH` env var is missing or wrong in Railway, `firebaseAuthFilter` is null and every endpoint becomes public — including admin routes.

**Plan:**
- Add a startup check that fails fast if Firebase credentials are missing in production
- Or: default the else-branch to `denyAll()` instead of `permitAll()`

```java
} else {
    // Fail safe: deny everything if Firebase not configured in production
    String profile = env.getActiveProfiles()[0];
    if ("local".equals(profile)) {
        http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
    } else {
        http.authorizeHttpRequests(auth -> auth.anyRequest().denyAll());
    }
}
```

### 2e — Group Invite Code Security *(parked from Phase 2.5)*

Current: 6-char alphanumeric, no expiry, no rate limit.

**Plan (pick one or both):**
- Rate limit join endpoint: 10 attempts/min per IP (covered by 2a)
- Add "Regenerate Code" button: admin can invalidate and get a new code

### 2f — Security Headers

No HTTP security headers set today. Should add:

```java
// SecurityConfig.java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
    .frameOptions(frame -> frame.deny())
    .xssProtection(xss -> xss.disable()) // modern browsers use CSP instead
    .contentTypeOptions(Customizer.withDefaults())
);
```

### 2g — Audit Logging

No audit trail for sensitive actions (admin OTT seeding, role changes, group admin actions).

**Plan:**
- Add `audit_logs` table: `user_id, action, target_type, target_id, ip_address, created_at`
- Log: admin availability seeding, role changes, group creation/deletion

---

## 3 — API Sustainability

### 3a — TMDB API *(No action needed)*

| Detail | Status |
|---|---|
| Cost | Free |
| Rate limit | 40 req/10s |
| Official API | ✅ Yes — api.themoviedb.org |
| Terms | Attribution required (TMDb badge shown ✅) |
| Risk | None for portfolio/public use |

**No changes needed.** TMDB free tier is sufficient even at 1000+ users due to Redis caching (24h TTL on search + movie detail).

### 3b — JustWatch Unofficial API *(Medium risk — plan migration)*

| Detail | Status |
|---|---|
| Cost | Free (unofficial) |
| Official API | ❌ No — internal API being scraped |
| SLA | None |
| Risk | Could be blocked or changed without notice |
| Current mitigation | 6h Redis cache + graceful empty fallback |

**Migration path — TMDB Watch Providers (free, official):**

TMDB has an official `/movie/{id}/watch/providers` endpoint that is:
- Free (same API key we already have)
- Officially licensed (TMDB licenses JustWatch data)
- Stable with versioned API
- Returns same data: platform name, logo, deep link, per country

```
GET https://api.themoviedb.org/3/movie/{tmdb_id}/watch/providers
→ results.IN.flatrate[].provider_name, logo_path, provider_id
```

**Plan:**
- Replace `OTTAvailabilityService` JustWatch calls with TMDB Watch Providers endpoint
- Map TMDB `provider_id` to our `ott_platforms` table (different IDs — new mapping needed)
- New Flyway migration to add `tmdb_provider_id` column to `ott_platforms`
- Keep JustWatch as fallback during transition

This is the cleanest fix: one less external dependency, fully official, same data source.

---

## 4 — Monitoring & Observability

Nothing in place today. If the backend crashes at 2am, you find out when a user complains.

### 4a — Error Tracking: Sentry *(free tier, 30 min to add)*

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.sentry</groupId>
    <artifactId>sentry-spring-boot-starter-jakarta</artifactId>
    <version>7.x.x</version>
</dependency>
```

```yaml
# application.yml
sentry:
  dsn: ${SENTRY_DSN}
  traces-sample-rate: 0.1
```

Gives you: stack traces, error grouping, alerts to email/Slack, performance tracing.

### 4b — Uptime Monitoring: UptimeRobot *(free)*

- Add a monitor for `https://ott-finder-production.up.railway.app/api/health`
- Checks every 5 minutes, emails you if down
- Free for up to 50 monitors

### 4c — Structured Logging

Currently using default Spring Boot logging (unstructured text). Hard to query in Railway's log viewer.

**Plan:**
```xml
<!-- Add logstash-logback-encoder -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.x</version>
</dependency>
```

Outputs JSON logs → Railway can filter/search by `userId`, `endpoint`, `statusCode`.

### 4d — Performance Baseline

No p95 latency tracking today. Can't tell if a deploy made things slower.

**Plan:**
- Sentry Performance (included with 4a) captures p95 per endpoint
- Or: Spring Boot Actuator + Micrometer → export to Grafana Cloud (free tier)

---

## 5 — Infrastructure Upgrades (when traffic demands it)

| Upgrade | Trigger | Cost |
|---|---|---|
| Railway Pro (multi-instance) | >500 concurrent users | ~$20/mo |
| PostgreSQL read replica | >300 req/sec on DB | ~$15/mo |
| Redis cluster | >10k req/min | ~$20/mo |
| Cloudflare CDN in front of Railway | DDoS protection, global edge | Free tier |
| Move avatar storage to object storage (S3/Cloudflare R2) | DB size growing due to BYTEAs | ~$0–5/mo |

---

## Implementation Priority Order

When you're ready for this phase, do it in this order:

```
1. Rate limiting (2a / 1a)          — security + stability, 1 day
2. Group membership audit (2b)      — security, 2 hours
3. Avatar upload validation (2c)    — security, 1 hour
4. Firebase fail-safe (2d)          — security, 30 min
5. Sentry + UptimeRobot (4a / 4b)  — observability, 1 hour
6. TMDB Watch Providers migration   — API sustainability, 1 day
7. Connection pool tuning (1b)      — performance, 30 min
8. Security headers (2f)            — security, 1 hour
9. Pagination (1d)                  — UX + performance, 1 day
10. Horizontal scaling (1c)         — when traffic demands it
```

---

## What Stays Out of Scope

| Item | Reason |
|---|---|
| Custom auth (replace Firebase) | Firebase handles it well, not worth the risk |
| Kubernetes / Docker Swarm | Overkill for this scale |
| Microservices split | Monolith is correct at this stage |
| GDPR compliance tooling | Needed if targeting EU users seriously |
| Bug bounty program | Phase 5+ |
