---
name: add-migration
description: Workflow for adding a new Flyway DB migration to the OTT Finder backend
---

Follow this checklist when adding a database migration:

1. **Check the last migration version** — look in `backend/src/main/resources/db/migration/` and find the highest V number

2. **Create the migration file** — name it `V{n+1}__{description}.sql` (double underscore)
   - Use snake_case for the description (e.g. `V8__add_user_preferences.sql`)
   - Never modify existing migration files — always create a new one

3. **Migration SQL rules:**
   - Always `IF NOT EXISTS` for `CREATE TABLE` and `CREATE INDEX`
   - Always `IF EXISTS` for `DROP`
   - Foreign keys should `ON DELETE CASCADE` or `ON DELETE SET NULL` — explicitly choose
   - Add indexes in the same migration as the table or column they reference

4. **Update the entity** if the migration adds a column to an existing table

5. **Test locally** — run `docker-compose up -d` then `mvn spring-boot:run` and confirm Flyway applies the migration without errors
