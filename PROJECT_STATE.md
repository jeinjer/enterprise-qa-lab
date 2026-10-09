# Northstar Commerce — Project state

**Updated:** 2026-10-08 · **Current milestone:** Sprint 1 closed · **Release decision:** GO for the local QA lab only

## Current status

Sprint 1 is complete. The six in-scope Jira stories XSP1-62 through XSP1-67 are finalized. Playwright passed 12/12, Xray XSP1-82 was verified at 12/12 tests and 30/30 steps passed, API unit tests passed 4/4, typecheck and production build passed, and the dependency audit reported zero vulnerabilities. The owner accepted the simulated UAT. No production deployment occurred.

The test evidence, scope, known limitations, and release decision are recorded in the [Sprint 1 QA exit report](docs/releases/sprint1-qa-exit-report.md). Recovery guidance is in the [rollback guide](docs/releases/sprint1-rollback.md).

## Sprint 1 scope

- Registration, email verification, login, logout, and customer session.
- Public product catalog and product details.
- Active/inactive and in-stock/out-of-stock catalog behavior.
- Automated QA in Playwright with result and step synchronization to Xray.

The application uses React and TypeScript, an Express and TypeScript API, PostgreSQL, and Docker Compose. Salesforce, orders, payments, returns, and support are outside the implemented Sprint 1 scope.

## Access-control decision

The catalog and product detail are public: `GET /api/v1/products`, `GET /api/v1/products/:id`, `/catalog`, and `/catalog/:id` require no authentication. Logout invalidates the server session but leaves public catalog browsing available. Successful email verification creates an authenticated session. Existing Jira rules for active, inactive, unknown, and zero-stock products remain unchanged.

This was an explicit owner decision made during Sprint 1 and is documented in [ADR-002](docs/adr/ADR-002-sprint1-access-and-sessions.md); it is not attributed retroactively to Jira acceptance criteria.

## Working agreements and next work

Use synthetic data only. Keep local secrets in ignored environment files or the user-scoped DPAPI store. QA checks live in `tests/qa`; DEV stack checks live in `tests/dev`. Xray helpers live in `scripts/xray`.

Sprint 1 is closed. No later sprint is in progress; the next learning module and its scope remain to be selected with the owner. The detailed historical status log is preserved in [the archived snapshot](docs/project/history/project-state-2026-10-08.md).
