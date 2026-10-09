# Sprint 1 — Technical review, 2026-09-28

Scope: local uncommitted Sprint 1 source review before build identification and QA. Initial findings were confirmed by inspection; the owner then authorized the corrections and focused DEV verification below. No Jira operation, commit or QA execution was performed.

## Initial findings — corrected in the working tree

### TR-01 — P2: Browser session cookies collide between environments

`apps/api/src/session.ts:20` hardcodes `northstar.sid`, with Path=/ and no separate environment host. Generated DEV, QA and UAT configurations all use localhost with different ports. Cookies are not partitioned by port. Signing into QA overwrites the DEV cookie in the same browser profile; their separate signing secrets/databases then make that cookie invalid in DEV. Logout in either environment clears the shared cookie too. This interferes with the approved local environment separation even when environments are used sequentially.

Recommended correction: use distinct configured session-cookie names per environment, consistently for session middleware and cookie clearing. Verify DEV and QA authentication and logout independently in one browser context. Databases are already separate; this finding concerns browser session isolation, not cross-environment access to customer records.

### TR-02 — P2: Initial session errors remain after successful recovery

`apps/web/src/main.tsx:49-60` stores initial `/auth/session` failures in the App-level error state. A later successful `refresh()` updates the customer but never clears that error. If the first request fails temporarily and the customer subsequently signs in successfully without a full page reload, the catalog still displays the original error alongside authenticated navigation.

Recommended correction: clear the App-level session error after successful session refresh (including an expected unauthenticated response) and keep session error handling consistent. Verify a temporary initial failure followed by successful login without reloading the application.

## Review boundaries and next step

Identity routes, validation, session configuration, HTTP middleware/errors, frontend routes/state/fetch handling, migration SQL/runner, Compose, environment generation and nginx configuration were inspected. `git status --short` still reports modified PROJECT_STATE and new untracked implementation files. `docker compose ps` returned no running DEV services on this date; the 2026-09-25 handoff's running-state statement is historical.

The initial review did not execute runtime checks. Subsequent focused verification is recorded below. This review is not exhaustive and does not replace QA or security testing.

## Corrections and DEV verification — 2026-09-28

- TR-01: API configuration now requires a validated `SESSION_COOKIE_NAME`. Compose supplies `<project-name>.sid`, including `-p` overrides. Creation and logout use the same name. Existing environment files need no secret changes. Old `northstar.sid` cookies are ignored, so existing clients must sign in again.
- TR-02: successful session refresh and expected AUTH_REQUIRED responses clear the App-level error. Other failures retain the existing error handling.
- `docker compose up --build -d`: API/web compiled and DEV started healthy. Existing non-fatal React Router `use client` notices remain.
- `docker compose --env-file .env.qa -p northstar-review up --build -d`: passed. The review stack used ports 8081/8026 with a separate `northstar-review_postgres-data` volume. It did not use or change the QA database.
- `npm run typecheck`: API/web passed. `npm test`: 4/4 passed.
- `npm run test:dev:review`: **7/7 passed** in headless Chrome. Two real authenticated sessions coexist in one browser context, distinct cookies are present, and logout in either stack preserves the other session. Test-only network interception supplied an initial session 503; subsequent login/session calls reached the real API and the error disappeared without reloading. Logout's expected 401 refresh left no error.
- Synthetic users: DEV `review-9145517@example.test`, DNI `9145517`; isolated review `review-2964398@example.test`, DNI `2964398`. Test credential: `SyntheticPass!`. No QA fixtures were created.
- `docker compose --env-file .env.qa -p northstar-review stop`: passed, review stack stopped with volume retained. DEV remains running.

To reproduce: run DEV, stop QA to free ports 8081/8026, start the separate review stack using the command above, then run `npm run test:dev:review`. Requires local Google Chrome and installed npm dependencies. The script creates fresh synthetic users and injects the initial 503 only in the test, never in production code. Stop the review stack afterward using the command above.

The earlier 30 integration and 12 browser checks were not rerun in full. These focused checks are DEV verification, not QA acceptance. Next: authorize a local commit identifying the corrected build, then conduct QA separately.
