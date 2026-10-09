# Sprint 1 — QA rollback procedure

**Scope:** local QA Compose stack `northstar-qa` only. This procedure restores application availability while preserving synthetic QA data.

## App rollback / recovery

1. Stop the affected QA app service if it is unhealthy: `docker compose --env-file .env.qa -p northstar-qa stop web api`.
2. Restore the last known-good Sprint 1 source/build in the repository (record its commit before a release change).
3. Rebuild and start only the application services: `docker compose --env-file .env.qa -p northstar-qa up --build -d api web`.
4. Verify `http://localhost:8081/api/v1/health/ready` returns `{"status":"ready"}`, then open `/catalog`, register/verify/login with synthetic data, and log out.
5. If readiness fails, stop `web` and `api`, preserve the database volume, and investigate migration compatibility before retrying. Do not run `docker compose down -v` or remove the `northstar-qa` volume.

## Database limitation

The current Sprint 1 QA stack has a persistent named PostgreSQL volume but no automated backup/restore artifact or tagged pre-migration database snapshot. The only migration in this scope is `001_sprint1.sql`. App rollback is therefore documented; destructive database rollback is **not** claimed or tested. Before a future non-backward-compatible migration, create and verify a QA database backup and define its restore command. No production data or environment is involved.

## Verification record

On 2026-10-08, CAT-04 exercised a controlled PostgreSQL outage, safe error response, restoration, and recovery successfully. QA readiness returned `ready`. This confirms service recovery, not a rollback rehearsal against a previous release or database backup.
