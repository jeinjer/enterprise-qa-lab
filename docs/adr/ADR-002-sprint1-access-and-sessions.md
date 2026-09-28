# ADR-002 — Sprint 1 public catalog and local identity

Status: accepted access decision by the owner, 2026-09-25. Remaining technical details below are implementation choices within the approved Sprint 1 architecture.

## Explicit access decision

The owner clarified after reading XSP1-66 and XSP1-67 that catalog and product detail are **public**. Visitors and authenticated customers can access `GET /api/v1/products`, `GET /api/v1/products/:id`, `/catalog` and `/catalog/:id`.

Logout destroys the current authenticated server-side session and redirects to the public catalog. It does not restrict catalog browsing. Successful email verification creates an authenticated session and redirects to the catalog. Active-only visibility, unavailable zero-stock products and not-found behavior remain governed by Jira.

This decision resolves a permission ambiguity; it was not originally specified in the Jira Acceptance Criteria. Jira has not been edited. Customer-specific operations in later scope will require authentication. Sprint 1 includes `GET /api/v1/auth/session` as the protected session introspection endpoint, used by the UI and DEV checks of logout invalidation.

## Implementation decisions

Technical correction 2026-09-28: session cookie names derive from the Compose project name (`northstar-dev.sid`, `northstar-qa.sid`, etc.) via required API configuration `SESSION_COOKIE_NAME`. Different localhost ports do not isolate cookies. Logout clears only the current environment's cookie; old `northstar.sid` cookies are ignored and clients must sign in again.

- PostgreSQL sessions via `express-session` and `connect-pg-simple`, with migration-managed tables, an eight-hour absolute cookie lifetime, HttpOnly, SameSite=Lax, session ID regeneration at authentication, and server-side destruction on logout. Local HTTP uses Secure=false; HTTPS/production requires Secure=true and a trusted HTTPS proxy configuration.
- Mutating requests require the exact configured Origin and JSON content type. Read-only requests do not change identity. The web proxy and API share an origin. API is not published to the host.
- Verification tokens use 32 random bytes, SHA-256 persistence, a 30-minute lifetime, and serialized customer locking for resend/confirmation. Email links use a URL fragment, removed by the frontend before submission. Logs contain no bodies, cookies, URL parameters, passwords or tokens.
- Mailpit is the only configured SMTP host. `nodemailer` is a transport library, not an external provider. No relay is configured. Sending occurs before the registration/resend DB transaction commits, with rollback on delivery failure. SMTP and PostgreSQL cannot commit atomically: a rare DB commit failure after capture can leave an unusable email. A subsequent registration/resend is the recovery; no outbox or additional infrastructure is introduced in this sprint.
- `express-rate-limit` supplies basic per-process identity throttling (60 requests/minute/IP); it resets on API restart. This is local DEV protection, not a distributed abuse-control system.
- Seed product prices use USD as synthetic fixture metadata; no pricing conversion, ordering or payment behavior is implemented.
- Migration execution uses a PostgreSQL advisory lock and a migration ledger. Product seed inserts are idempotent and do not overwrite QA fixture changes on restart.
- If account activation commits but session persistence fails, the API returns an explicit error asking the now-ACTIVE customer to sign in. Normal success requires saved session persistence.

Scope: XSP1-62, XSP1-63, XSP1-64, XSP1-65, XSP1-66, XSP1-67 only. This ADR does not expand scope or claim QA acceptance.
