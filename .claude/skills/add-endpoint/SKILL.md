---
name: add-endpoint
description: Step-by-step workflow for adding a new REST endpoint to the OTT Finder backend
---

Follow this checklist exactly when adding a new endpoint to the Spring Boot backend:

1. **DTO first** — create a Java Record in `backend/src/main/java/com/ottfinder/dto/`
   - Request DTOs go in `dto/request/`, Response DTOs in `dto/response/`
   - Add Bean Validation annotations (`@NotNull`, `@NotBlank`) on request DTOs

2. **Repository** — add a `@Query` method to the relevant repository in `repository/` if custom SQL is needed

3. **Service method** — add the business logic to the appropriate service in `service/`
   - Check Redis cache first if the operation is read-heavy
   - Use `apiCallExecutor` for any TMDB/JustWatch calls
   - Handle external API failure gracefully (catch exception, log, return empty/partial)

4. **Controller method** — add the endpoint to the appropriate controller in `controller/`
   - Always return `ResponseEntity<ApiResponse<T>>`
   - Add `@Valid` to any `@RequestBody`
   - Use `@PreAuthorize` or check SecurityContext for protected routes

5. **Tests** — add unit test in `test/java/com/ottfinder/service/` and controller test in `test/.../controller/`

6. **Update ARCHITECTURE.md** — add the new endpoint to the REST API Endpoints section
