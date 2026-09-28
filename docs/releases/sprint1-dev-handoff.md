# Sprint 1 — DEV → QA handoff

**Version record 2026-09-28:** The owner authorized the local commit containing the Sprint 1 implementation, review corrections and this handoff, without push. That commit identifies the delivered source build (`git log -1 --format=%H` immediately after committing). References below to uncommitted changes or pending commit authorization describe the earlier preparation stage. No QA acceptance is implied.

**Update 2026-09-28:** Both technical-review findings are corrected and verified by 7 focused DEV checks; typecheck, 4 unit tests and Docker builds also passed. See `sprint1-technical-review.md` for commands, data and limitations. DEV is running; the separate review stack is stopped and the QA database was not changed. The 30 integration and 12 browser results below remain the 2026-09-25 record. A commit identifying the corrected build is pending authorization.

Date: 2026-09-25. Build: **sprint1-0.1.0** (package version 0.1.0). Local working tree, uncommitted. Personal laboratory, synthetic data only. This is an implementation handoff, not QA/regression/UAT approval or story acceptance.

## Implemented scope and sources

The full current descriptions, Business Rules and Acceptance Criteria of these six issues were read through the connected Atlassian MCP before implementation. All six are implemented for DEV verification; none is marked accepted or Done by this work.

| Jira | Scope delivered |
|---|---|
| [XSP1-62 / US-01](https://qalabjeinjer.atlassian.net/browse/XSP1-62) | Field validation, literal confirmations, trimming/normalization, unique DNI/email, generated customer UUID, pending account and local verification request |
| [XSP1-63 / US-02](https://qalabjeinjer.atlassian.net/browse/XSP1-63) | Hashed single-use token, 30-minute expiry, activation plus session and catalog redirect, resend invalidation, Mailpit capture |
| [XSP1-64 / US-03](https://qalabjeinjer.atlassian.net/browse/XSP1-64) | ACTIVE-only login, normalized email, password verification, persisted HttpOnly session, pending-account feedback |
| [XSP1-65 / US-04](https://qalabjeinjer.atlassian.net/browse/XSP1-65) | Server-side session destruction, old-session denial, public catalog redirect |
| [XSP1-66 / US-07](https://qalabjeinjer.atlassian.net/browse/XSP1-66) | Public active-only catalog, current price/availability, zero-stock visibility, real retrieval error state |
| [XSP1-67 / US-08](https://qalabjeinjer.atlassian.net/browse/XSP1-67) | Public active detail with description, unknown/inactive identifiers return 404 |

The owner explicitly approved **public catalog and detail** after identifying an access ambiguity. This is recorded in ADR-002 and PROJECT_STATE, not presented as an original Jira requirement. The older Sprint 0 “do not implement yet” state was superseded by the owner's Sprint 1 implementation authorization. No material architectural conflict or other unresolved functional requirement was identified. Jira descriptions, criteria and workflow statuses were not changed.

No cart, orders, payments, returns, support, Salesforce, AI, administration, profile editing, recovery, email changes, OAuth, Redis, external mail provider or public deployment is included.

## Architecture and major files

| Files/module | Responsibility |
|---|---|
| `apps/api/src/identity.ts`, `validation.ts` | Registration, verification, resend, login/logout, field validation and transaction boundaries |
| `apps/api/src/session.ts` | PostgreSQL session store, cookie configuration, protected session introspection |
| `apps/api/src/catalog.ts` | Public active product reads |
| `apps/api/src/server.ts`, `errors.ts`, `config.ts`, `db.ts` | HTTP setup, correlation IDs, sanitized structured errors/logging, Origin/JSON checks, rate limiting, DB/configuration |
| `apps/api/src/migrate.ts`, `seed.ts` | Ordered migration ledger with advisory lock, idempotent synthetic products |
| `apps/web/src/main.tsx`, `api.ts`, `styles.css` | React Router pages, session navigation, fetch client, forms and real loading/error/empty/not-found states |
| `apps/*/Dockerfile`, `apps/web/nginx.conf`, `compose.yaml` | Four-service local runtime, same-origin web/API proxy, loopback host bindings |
| `database/migrations/001_sprint1.sql` | Customer, verification-token, session and product tables with integrity constraints |
| `scripts/init-env.mjs`, `.env.example` | Random local secrets and separate DEV/QA/UAT configuration |
| `apps/api/src/validation.test.ts`, `tests/dev-*.mjs` | DEV unit, real-stack integration and browser verification |

Approved packages are used with `pg`, `zod`, `argon2`, `express-session`, `helmet`, `cors` and frontend `fetch`. Supporting packages are `connect-pg-simple` (PostgreSQL session adapter), `nodemailer` (Mailpit SMTP transport), and `express-rate-limit` (local identity throttling). These add no infrastructure or functional scope. Playwright and Prettier are development dependencies. `package-lock.json` fixes the resolved npm dependency graph.

## HTTP contract

All paths below are under `/api/v1`. JSON responses use camelCase for actions and DB column names for the returned customer. Prices are decimal strings plus a currency code; availability is boolean. Product identifiers and customer identifiers are UUIDs.

| Method/path | Access and request | Result |
|---|---|---|
| GET `/products` | Public | 200 `{products:[{id,name,description,price,currency,available}]}` |
| GET `/products/:id` | Public | 200 `{product:{...}}`; 404 unknown, malformed or inactive ID |
| POST `/auth/register` | Public; `firstName,lastName,dni,email,emailConfirmation,password,passwordConfirmation` | 201 `{customerId,status:"PENDING_VERIFICATION",message}`; 400 field validation, 409 duplicate email/DNI, 503 mail capture unavailable |
| POST `/auth/verification/resend` | Public; `{email}` | 200 generic message; pending customer receives fresh token, previous unused tokens invalidated |
| POST `/auth/verification/confirm` | Public; `{token}` | 200 `{message,redirectTo:"/catalog"}` plus session cookie; 400 invalid/expired/used token |
| POST `/auth/login` | Public; `{email,password}` | 200 redirect plus session cookie; 400 invalid fields, 401 credentials, 403 verification required |
| GET `/auth/session` | ACTIVE authenticated customer | 200 `{customer:{customer_id,first_name,last_name,email}}`; otherwise 401 |
| POST `/auth/logout` | Current session if present; `{}` | 200 redirect; destroys session, clears cookie; idempotent for visitors |
| GET `/health/live` | Public | 200 `{status:"ok",build:"sprint1-0.1.0"}` |
| GET `/health/ready` | Public | 200 `{status:"ready"}` if migration ledger query succeeds; otherwise 503 |

All mutations require `Origin` equal to `PUBLIC_ORIGIN` and `Content-Type: application/json`. Postman/curl must supply those headers. Foreign/missing Origin returns 403; wrong content type returns 415. Identity requests have a local 60/minute/IP limit (429). Oversized JSON is 413. Errors have `{error:{code,message,fields?,correlationId}}` and an `X-Correlation-ID` header. No stack or SQL details are returned.

`<compose-project-name>.sid` is HttpOnly, SameSite=Lax, Path=/, eight-hour lifetime. DEV HTTP sets Secure=false; production/HTTPS requires Secure=true and a properly trusted HTTPS proxy. Session IDs regenerate on login/activation. The protected session endpoint demonstrates logout invalidation even though catalog remains public. Passwords are Argon2id hashes. Verification tokens are 256-bit random values stored as SHA-256 hashes; raw values exist only transiently and in Mailpit messages. The fragment link avoids transmitting tokens in a web-server request URL, and the frontend removes the fragment before submission.

UI routes: `/` redirects to `/catalog`; `/catalog`, `/catalog/:id`, `/register`, `/login`, `/verify`; unknown routes show page-not-found. Verification automatically submits the fragment token and redirects to the catalog after the session is saved. Registration errors preserve non-sensitive fields and clear both password fields. No checkout controls are included.

## Persistence and synthetic fixtures

The API startup runs `npm run migrate -w apps/api`, then `npm run seed -w apps/api`, then starts Express. No tables were created manually. Migration `001_sprint1.sql` creates `customers`, `email_verification_tokens`, `sessions`, `products`; the runner creates `schema_migrations`. Email/DNI uniqueness and status/stock/price constraints are enforced by PostgreSQL. Repeated startup skips recorded migrations and existing seed IDs.

| Product ID | Product | Price | Stock / state |
|---|---|---|---|
| `10000000-0000-4000-8000-000000000001` | Orbit Desk Lamp | USD 49.90 | 12 / active |
| `10000000-0000-4000-8000-000000000002` | Slate Notebook | USD 12.50 | 0 / active, unavailable |
| `10000000-0000-4000-8000-000000000003` | Archive Stand | USD 25.00 | 4 / inactive, hidden |

No customer is seeded. DEV checks created these synthetic ACTIVE customers in the DEV volume only:

- `dev-9353231@example.test`, DNI `9353231`, password `SyntheticPass!`.
- `ui-9256433@example.test`, DNI `9256433`, password `SyntheticPass!`.

These are disposable laboratory credentials, not secrets for real accounts. QA starts without these users; register new synthetic customers. Test scripts choose fresh numeric identifiers on each run. Do not use personal information.

## Environment variables and local URLs

| Variable | Purpose / generated DEV value |
|---|---|
| `COMPOSE_PROJECT_NAME` | Stack/volume namespace, `northstar-dev` |
| `WEB_PORT` | Loopback web port, `8080` |
| `MAILPIT_PORT` | Loopback inbox port, `8025` |
| `POSTGRES_PASSWORD` | Random local DB secret; use hex to avoid URL encoding issues |
| `SESSION_SECRET` | Random session signing secret, at least 32 characters |
| `SESSION_COOKIE_NAME` | Required by API; Compose derives `<project-name>.sid`, distinct per environment |
| `PUBLIC_ORIGIN` | Exact browser origin, `http://localhost:8080` |
| `COOKIE_SECURE` | `false` for local HTTP; `true` for HTTPS |
| `DATABASE_URL` | Constructed by Compose for internal `postgres:5432/northstar` |
| `MAILPIT_HOST` | Internal fixed `mailpit`, SMTP port 1025; no relay |
| `PORT` | API internal port, default `3000` |

DEV app: http://localhost:8080/catalog. Mailpit: http://localhost:8025. Liveness/readiness: http://localhost:8080/api/v1/health/live and http://localhost:8080/api/v1/health/ready. PostgreSQL, API and SMTP have no host-published ports. Mailpit messages are ephemeral across container recreation; application state survives in the named PostgreSQL volume.

## DEV checks actually executed

| Command/action | Actual result |
|---|---|
| Read brief/state/ADR and full six Jira issues; `git status --short` | Initial tree clean, documentation-only repository |
| `node --version`; `npm --version`; `docker version --format '{{.Server.Version}}'` | Node 22.19.0; npm 10.9.3; Docker 28.3.2. Initial Docker attempt denied by sandbox; elevated retry succeeded |
| `npm install` | Installed initial workspace dependencies; reported one high-severity Nodemailer vulnerability |
| `npm audit --json` | First request blocked; authorized retry identified Nodemailer advisories |
| `npm install nodemailer@10.0.10 -w apps/api` | Initial non-elevated fetch denied; authorized retry succeeded |
| `npm install --save-dev prettier @playwright/test` | Succeeded after authorized installation |
| `npx prettier --write "apps/**/*.{ts,tsx,css,json}" "tests/*.mjs" package.json compose.yaml` | Source/configuration formatted; later new DB/browser files also formatted |
| `npm test` | 4 tests passed, 0 failed |
| `npm run typecheck` | API and web passed |
| `npm run build` | API and web passed; initial empty CSS import warning fixed. Remaining React Router `use client` notices are non-fatal |
| `docker compose up --build -d`; later API rebuild | All four services started; migration and seed executed. Rebuild included corrected Nodemailer and DB connection error handling |
| `node tests/dev-integration.mjs` | 30 DEV checks passed against actual PostgreSQL/Mailpit; covers uniqueness, hashing, expiry/resend/reuse, verification session, login/logout, public catalog, restart persistence and Origin rejection |
| `node tests/dev-browser.mjs` | 12 DEV browser checks passed using installed headless Chrome, including real PostgreSQL outage/recovery and mobile overflow check; no uncaught page errors |
| `docker compose ps`; read-only SQL ledger/customer queries | DEV API/PostgreSQL/Mailpit healthy, web running; migration recorded, two synthetic ACTIVE users persisted |
| `npm audit --audit-level=low` | Final audit reported 0 vulnerabilities |
| `git diff --check`; `git check-ignore .env` | No whitespace errors; `.env` ignored |
| Visual review of three PNGs | Desktop, mobile and DB-outage error captures opened and inspected |
| `node scripts/init-env.mjs qa`; `docker compose --env-file .env.qa -p northstar-qa up --build -d` | Generated ignored QA configuration; first Docker command denied by sandbox, authorized retry built and started the isolated stack |
| QA read-only SQL `SELECT count(*) FROM customers; SELECT count(*) FROM products; SELECT name FROM schema_migrations;` | 0 customers, 3 products, `001_sprint1.sql`; confirms clean QA persistence, not QA acceptance |
| Host PowerShell `Invoke-RestMethod` probe of QA readiness and DEV liveness | Command did not return and was interrupted; no success is attributed to this probe. Successful health checks are evidenced by the real-stack scripts and Docker health status above |
| `docker compose --env-file .env.qa -p northstar-qa stop` | QA services stopped successfully, volume retained |

Evidence: `evidence/dev-sprint1/catalog-desktop.png`, `catalog-mobile.png`, `catalog-error.png`. These are DEV screenshots, not Jira acceptance evidence. No lint command is configured or claimed. No QA suite, regression campaign, UAT, security penetration test, load test or release acceptance was executed.

## Reproducible clean QA environment

From this working tree, Docker Desktop running:

```powershell
# Generates fresh random secrets; refuses to overwrite an existing .env.qa.
node scripts/init-env.mjs qa
docker compose --env-file .env.qa -p northstar-qa up --build -d
docker compose --env-file .env.qa -p northstar-qa ps
Invoke-RestMethod http://localhost:8081/api/v1/health/ready
```

QA app: http://localhost:8081/catalog. QA Mailpit: http://localhost:8026. QA health routes use port 8081. `northstar-qa_postgres-data` is separate from `northstar-dev_postgres-data`; no DEV customer is copied. The initialization helper and separate-stack startup were also exercised during handoff preparation: API became healthy and SQL confirmed 0 customers, 3 products and the recorded migration. The QA stack was then stopped to conserve local resources, retaining its clean volume. DEV remains running. On this workstation `.env.qa` already exists: skip the helper and preserve its secrets, then run the Compose startup command.

For a **new clean run when an existing QA volume contains data**, use a fresh namespace, e.g. `-p northstar-qa-run2`, with the same `.env.qa` after stopping the previous QA stack to free ports. This creates a new PostgreSQL volume without deleting the previous environment:

```powershell
docker compose --env-file .env.qa -p northstar-qa down
docker compose --env-file .env.qa -p northstar-qa-run2 up --build -d
```

Register synthetic users through the UI, obtain their verification messages from the QA Mailpit inbox, and execute QA's independently designed cases. For expiry fixtures, use a documented SQL fixture change against the QA database rather than waiting or adding test-only API behavior. Do not run `tests/dev-*.mjs` against QA: those scripts intentionally control the default DEV stack for restart/outage checks.

Non-destructive shutdown: `docker compose --env-file .env.qa -p northstar-qa down`. Do not use `down -v` unless intentionally discarding that environment's data. For later UAT, `node scripts/init-env.mjs uat` generates ports 8082/8027 and its own namespace.

## Known limitations and deviations

- No known unresolved story requirement or material architectural deviation. Public access is the explicit subsequent owner decision, not an edit of Jira history.
- Local HTTP is not production security. No public deployment or production readiness claim. Local rate limiting is in-memory and resets on restart; no Redis is introduced.
- SMTP capture and database commit are not atomic. A rare commit failure after capture can leave an unusable message; retry registration/resend. A session persistence failure after activation returns an explicit sign-in recovery message. See ADR-002.
- Health readiness checks the database/migration ledger, not end-to-end SMTP delivery. Registration/resend report Mailpit failures explicitly.
- Node dependencies are locked. Docker base-image tags can receive upstream updates; archive image digests with a future accepted build if bit-for-bit image reproduction is required.
- Decorative product tiles are CSS artwork, not product photographs. All names, prices and availability come from PostgreSQL; there is no frontend fallback product dataset.
- Basic local DEV coverage is not exhaustive concurrency, accessibility, cross-browser, performance, security or failure-injection coverage. Those belong to later QA/risk review.
- Application UI is English. Main startup documentation is available in English and Spanish; this technical handoff is English.

## Git and changed files

No commit, push, merge, PR or remote deployment was performed. `PROJECT_STATE.md` is modified; implementation files are new/untracked. The final file list is recorded in `evidence/dev-sprint1/files-changed.txt`. `.env` and `.env.qa` are ignored and must remain uncommitted. Existing PROJECT_BRIEF and ADR-001 are preserved.
