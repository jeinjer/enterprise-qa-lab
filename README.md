# Northstar Commerce — Enterprise QA Lab

Personal learning laboratory with synthetic data. Sprint 1 build `sprint1-0.1.0` implements registration, local email verification, sessions, public catalog and public product details. No orders, payments, integrations or public deployment are implemented.

## Repository map

| Path                  | Responsibility                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/api`            | Express API; feature routes under `src/modules`, shared configuration and database infrastructure at `src` |
| `apps/web`            | React application; routes in `App.tsx`, feature pages/components under `src/features`                      |
| `database/migrations` | Versioned PostgreSQL schema changes                                                                        |
| `tests/dev`           | DEV stack integration, browser, and focused regression checks                                              |
| `tests/qa`            | Playwright acceptance/regression scenarios and Xray reporter                                               |
| `scripts/xray`        | Xray import, verification, and local credential wrapper                                                    |
| `docs`                | Architecture decisions, QA design, handoffs, and release records                                           |

Keep a feature's UI or API behavior with that feature. Put shared infrastructure in the app-level layer; avoid cross-feature imports when a small shared contract is enough.

## Local startup

Requires Docker Desktop / Docker Compose and Node.js 22 for the configuration helper. PostgreSQL runs inside Docker.

```powershell
node scripts/init-env.mjs dev
docker compose up --build -d
docker compose ps
```

If `.env` already exists, keep it; the helper intentionally refuses to overwrite it. Alternatively copy `.env.example` to `.env` and replace both secret placeholders with random values (hex avoids database URL escaping issues).

- App: http://localhost:8080/catalog
- Local Mailpit inbox: http://localhost:8025
- Liveness: http://localhost:8080/api/v1/health/live
- Readiness: http://localhost:8080/api/v1/health/ready

Register with **synthetic information**, open the captured Mailpit message, and follow its verification link. No preconfigured customer account is seeded. Catalog is public. Successful verification signs in automatically. Logout returns to the public catalog.

```powershell
npm ci
npm run typecheck
npm run build
npm test
npm run test:dev:integration
npm run test:dev:browser
npm run test:dev:review
npm run test:qa
```

Integration checks create synthetic accounts and restart the API. Browser checks require local Google Chrome, capture screenshots and temporarily stop/restart DEV PostgreSQL. Run them against the disposable DEV stack only, without other active work. They are DEV checks, not QA acceptance or regression sign-off.

`test:qa` targets the separately configured local QA stack. The suite includes a controlled PostgreSQL outage check; use only the disposable QA environment and avoid running other tests against it at the same time.

Shutdown without deleting data: `docker compose down`. On startup, the API applies tracked SQL migrations and idempotent product inserts. Secrets and local environment files are ignored by Git.

See [DEV → QA handoff](docs/releases/sprint1-dev-handoff.md) for API contracts, environment variables, limitations, exact results and a clean, isolated QA setup. [ADR-002](docs/adr/ADR-002-sprint1-access-and-sessions.md) records the owner's public-catalog decision. [Estado del proyecto](PROJECT_STATE.md) records the current implementation status.
