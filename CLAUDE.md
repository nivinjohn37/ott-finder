# OTT Finder — Claude Project Instructions

See @ARCHITECTURE.md for the complete system design, DB schema, API contracts, and 3-day build plan.

## Stack at a Glance
- **Backend:** Java 21, Spring Boot 3.2.x, PostgreSQL 15, Redis 7, Flyway, Firebase Auth
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Query v5, Axios
- **External APIs:** TMDB (movie metadata), JustWatch unofficial (OTT availability)

## Non-Obvious Rules

### Java / Spring Boot
- DTOs are Java Records — never use Lombok on them
- Entities use Lombok `@Data` + `@Builder` — JPA proxies need mutability
- Constructor injection only — never `@Autowired` on fields
- External API calls (TMDB, JustWatch) always use the `apiCallExecutor` thread pool
- Every external call must have a 5-second timeout and fail gracefully (return empty, not 500)
- Redis cache keys are defined in ARCHITECTURE.md — do not invent new key patterns

### React / TypeScript
- Named exports only — no default exports
- Server state lives in React Query — never fetch in `useEffect`
- All TypeScript interfaces live in `src/types/index.ts` — import from there
- Tailwind only — no CSS modules, no inline styles, no styled-components

### API Contract
- Every response uses the `ApiResponse<T>` envelope (success, data, error, timestamp)
- Error codes are defined in ARCHITECTURE.md — use the exact codes listed there
- Public endpoints: `/api/health`, `/api/movies/search`, `/api/movies/{id}`
- All `/api/watchlist/**` routes require Firebase JWT

### Database
- Flyway migrations are numbered V1–V7 — never skip or rename existing ones
- `available_until` is nullable — NULL means unknown expiry, not permanent availability
- Never write raw SQL in services — use JPA repositories or `@Query` with JPQL

## Build & Run Commands

```bash
# Local services
docker-compose up -d

# Backend
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local

# Frontend
cd frontend && npm run dev

# Backend tests
cd backend && mvn test

# Frontend lint + build check
cd frontend && npm run lint && npm run build
```

## Verification Checklist
Before marking any feature complete:
- [ ] Backend: `mvn test` passes
- [ ] Frontend: `npm run lint` passes
- [ ] API response matches `ApiResponse<T>` envelope
- [ ] Error scenarios return correct error codes
- [ ] External API failure does NOT throw 500 (returns graceful fallback)
