# Sprint 1 — QA exit report

**Date:** 2026-10-08

**Build/environment:** `sprint1-0.1.0`, local QA (`http://localhost:8081`)

**Xray execution:** [XSP1-82](https://qalabjeinjer.atlassian.net/browse/XSP1-82)

## Result

- Xray: **12/12 test runs passed; 30/30 steps passed**, verified after importing the latest run.
- Latest full Playwright run: **12/12 passed**, including CAT-04's controlled database outage and recovery.
- Unit tests: **4/4 passed**; typecheck and production build passed.
- Scope: catalog, product detail, and identity checks (CAT, DET, IDN). Results and traceability are synchronized with Xray.

## Risks and remaining sign-off

Jira search found three unresolved Medium-priority issues, XSP1-26, XSP1-27 and XSP1-28. They are not linked to Sprint 1 stories XSP1-62…67 and describe sample-store/exploratory defects; no in-scope defect was found in that query. No Blocker/Critical-priority defect appeared in the results.

A source/config review found the local baseline controls (Helmet, exact-origin CORS, JSON/Origin checks on mutations, identity rate limit, HttpOnly/SameSite session cookie, optional Secure cookie, Argon2id password hashes, hashed verification tokens, and ignored local secrets). This was not a penetration test. Current `npm audit` found one high advisory in transitive `source-map-js@1.2.1`; `npm audit fix` updated it to `1.2.2`. A fresh audit then reported **0 vulnerabilities**.

The rollback procedure is documented in `sprint1-rollback.md`; it has not been rehearsed against a previous tagged release or database backup. Given the local lab scope, the documented application recovery procedure satisfies the rollback criterion; destructive database rollback is explicitly out of scope.

Owner UAT on the local synthetic-data flow was accepted in chat. The owner observed that registration accepts spaces in passwords; this matches XSP1-62 BR-11 (“Password values are not trimmed”). BR-05 still requires 8–64 characters, an uppercase letter and a non-whitespace special character, and BR-06 requires an exact confirmation match. The existing unit test checks preservation of `" Password! "`. This is expected; no defect was filed and no Jira acceptance criterion was changed.

**Sprint 1 Go/No-Go: GO for the local lab scope.** Jira stories XSP1-62…67 were transitioned to **Finalizada** after the passing QA evidence and owner UAT. This is not a production deployment or production release decision.

Evidence details and reproduction commands are recorded in `PROJECT_STATE.md` and the QA test design under `docs/qa/`.
