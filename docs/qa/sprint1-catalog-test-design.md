# Sprint 1 — Catalog and product detail test design

Status: Eight Xray cases XSP1-74…81 are linked to XSP1-66/67. CAT-01 was first executed manually for learning, then automated alongside the other seven. Latest QA run: 8/8 passed and reporter output contains 19/19 PASSED step results; the final report was reimported to XSP1-82. Xray shows all eight runs and their 19 steps as PASSED. CAT/DET identifiers are local design references, not Jira keys.

On Windows, `npm run xray:import:qa` prompts for Xray credentials once and stores them encrypted with DPAPI for the current user in ignored file `.xray-credentials.dpapi`. Use `-ResetCredentials` with the PowerShell wrapper to rotate them. CI can call the Node importer with credentials supplied by its secret store.

Sources: XSP1-66 / US-07 and XSP1-67 / US-08, read through Jira at preparation time. Public access comes from the owner's explicit Sprint 1 decision (ADR-002), not an original Jira acceptance criterion. API status codes and payload fields come from the approved implementation contract. Target source build: 74cb5df; verify the running build before execution.

## Shared setup

- QA only: http://localhost:8081. Docker project: northstar-qa, configuration .env.qa.
- The QA stack is running and seeded. Use a fresh unauthenticated browser context; in Postman select No Auth and clear cookies for localhost when checking anonymous access (No Auth alone does not remove session cookies).
- Read-only fixture check in QA PostgreSQL: `SELECT id,name,description,price,currency,stock,active FROM products ORDER BY name;`.
- Orbit Desk Lamp: 10000000-0000-4000-8000-000000000001; active; stock 12; USD 49.90; description "Adjustable desk lamp for a focused workspace.".
- Slate Notebook: 10000000-0000-4000-8000-000000000002; active; stock 0; USD 12.50; description "A durable notebook for everyday ideas.".
- Archive Stand: 10000000-0000-4000-8000-000000000003; inactive; stock 4.
- Confirm unknown ID 10000000-0000-4000-8000-999999999999 has no DB row. If fixtures differ, establish the preconditions before testing rather than marking a product defect from a fixture mismatch.
- Save build, environment, date, actual result and evidence separately in the eventual execution. All tests below are intended as Manual step-based Xray Tests; they can later support automation.

## CAT-01 — Browse public catalog with active product attributes

Requirement: XSP1-66 AC-01 / BR-01, BR-02; public-access decision ADR-002.
Preconditions: shared setup; both active fixtures and inactive fixture exist.

| Step | Action / data | Expected result |
|---|---|---|
| 1 | In Postman select GET; URL http://localhost:8081/api/v1/products. Send without authentication or session cookies. | HTTP 200. Response has a products array containing the two active fixture IDs. |
| 2 | Compare names, prices, currency and availability against SQL fixture values. | Lamp: Orbit Desk Lamp, 49.90, USD, available=true. Notebook: Slate Notebook, 12.50, USD, available=false. |
| 3 | Open http://localhost:8081/catalog in the unauthenticated browser. | Catalog loads without login; both active products display name, current price and availability consistent with the API. |

## CAT-02 — Keep active zero-stock product visible as unavailable

Requirement: XSP1-66 AC-02 / BR-03.
Preconditions: shared setup; notebook is active with stock=0.

| Step | Action / data | Expected result |
|---|---|---|
| 1 | GET http://localhost:8081/api/v1/products without a session. Locate notebook by ID. | HTTP 200; notebook remains in products and available=false. |
| 2 | Open /catalog and locate Slate Notebook. | Product is visible with price USD 12.50 and clearly indicates unavailable/out of stock; it is not presented as in stock. |

## CAT-03 — Exclude inactive products from catalog API and UI

Requirement: XSP1-66 AC-03 / BR-01.
Preconditions: shared setup; SQL confirms Archive Stand exists and active=false.

| Step | Action / data | Expected result |
|---|---|---|
| 1 | GET http://localhost:8081/api/v1/products. Inspect every returned product ID. | HTTP 200; Archive Stand ID is absent; active fixtures remain present. |
| 2 | Open /catalog. Inspect the displayed catalog. | Archive Stand does not appear; this matches the server response rather than merely hiding an API result in the UI. |

## CAT-04 — Show an error when catalog retrieval fails

Requirement: XSP1-66 AC-04 / BR-04.
Preconditions: shared setup; no other testing is using QA. This case intentionally interrupts QA PostgreSQL only. Keep terminal available for restoration even if an assertion fails. Do not delete containers or volumes.

| Step | Action / data | Expected result |
|---|---|---|
| 1 | Open /catalog and confirm normal fixture products load. | Baseline catalog is available before the induced fault. |
| 2 | From the repository terminal run `docker compose --env-file .env.qa -p northstar-qa stop postgres`. | Only QA PostgreSQL is stopped. |
| 3 | Reload /catalog to trigger a fresh request; inspect the page and the GET /api/v1/products response using Postman or browser network tools. | Retrieval fails (non-2xx); UI shows a real error. No fabricated product cards and no misleading successful empty-catalog state. API error contains correlationId and does not expose SQL or stack details. |
| 4 | Always restore using `docker compose --env-file .env.qa -p northstar-qa start postgres`; wait for /api/v1/health/ready to return 200, then reload /catalog. | QA is restored and the seeded active products load again. |

Cleanup: restoration in step 4 is mandatory even if steps 2/3 fail. Failure-injection commands are instructions for the future execution, not commands run when creating this test.

## DET-01 — View active product detail with stock

Requirement: XSP1-67 AC-01 / BR-01, BR-02; public-access decision ADR-002.
Preconditions: shared setup; lamp active, stock=12.

| Step | Action / data | Expected result |
|---|---|---|
| 1 | GET http://localhost:8081/api/v1/products/10000000-0000-4000-8000-000000000001 without authentication/cookies. | HTTP 200; product ID matches lamp. Name, description, price=49.90, currency=USD and available=true match fixture data. |
| 2 | Open /catalog and follow the lamp detail link. | /catalog/10000000-0000-4000-8000-000000000001 displays the lamp name, description, current price and in-stock availability without requiring login. |

## DET-02 — View active product detail without stock

Requirement: XSP1-67 AC-01 / BR-01, BR-02; availability interpreted consistently with XSP1-66 BR-03.
Preconditions: shared setup; notebook active, stock=0.

| Step | Action / data | Expected result |
|---|---|---|
| 1 | GET http://localhost:8081/api/v1/products/10000000-0000-4000-8000-000000000002. | HTTP 200, not 404. Slate Notebook name/description, price=12.50, currency=USD and available=false match fixture data. |
| 2 | Open http://localhost:8081/catalog/10000000-0000-4000-8000-000000000002. | Detail is visible with name, description, current price and clear unavailable/out-of-stock status. |

## DET-03 — Deny public detail of an inactive product

Requirement: XSP1-67 AC-03 / BR-03. The implementation contract chooses 404 for inactive detail.
Preconditions: shared setup; SQL confirms Archive Stand exists and active=false.

| Step | Action / data | Expected result |
|---|---|---|
| 1 | GET http://localhost:8081/api/v1/products/10000000-0000-4000-8000-000000000003. | HTTP 404; error.code=PRODUCT_NOT_FOUND and nonempty correlationId; no product detail payload. |
| 2 | Open http://localhost:8081/catalog/10000000-0000-4000-8000-000000000003 directly. | UI shows product-not-found state, not an available/purchasable Archive Stand detail. |

## DET-04 — Return not-found for an unknown product identifier

Requirement: XSP1-67 AC-02 / BR-03.
Preconditions: shared setup; read-only SQL confirms unknown UUID has no row (distinct from an inactive row).

| Step | Action / data | Expected result |
|---|---|---|
| 1 | GET http://localhost:8081/api/v1/products/10000000-0000-4000-8000-999999999999. | HTTP 404; error.code=PRODUCT_NOT_FOUND and nonempty correlationId; no fabricated/default product. |
| 2 | Open http://localhost:8081/catalog/10000000-0000-4000-8000-999999999999 directly. | UI shows product-not-found state and no product detail. |

## Xray import progress

CAT-01 is XSP1-74 and was recorded manually in execution XSP1-82. The seven imported Manual Tests are CAT-02 XSP1-75, CAT-03 XSP1-76, CAT-04 XSP1-77, DET-01 XSP1-78, DET-02 XSP1-79, DET-03 XSP1-80 and DET-04 XSP1-81. Each was linked to its Jira requirement during the Xray Test Case Importer operation.

## Execution record — CAT-02

2026-10-08, environment QA (`http://localhost:8081`), reported build `sprint1-0.1.0`: **PASS**. Playwright confirmed the notebook was returned by the anonymous catalog API with id `10000000-0000-4000-8000-000000000002`, name Slate Notebook, price 12.50 USD and `available=false`; it was visible in `/catalog` with `$12.50` and “Unavailable · Out of stock”, not “In stock”. Automated attachments include environment/build context, API response and catalog screenshot under `test-results/qa/`. This result is not yet imported into Xray execution XSP1-82.


2026-10-08: CAT-03 también pasó en QA con Playwright (1/1). La respuesta API excluyó Archive Stand por ID/nombre y mantuvo ambos productos activos; el catálogo mostró los activos y no mostró Archive Stand. Captura y respuesta de API guardadas automáticamente en `test-results/qa/`. El último run conjunto CAT-02/CAT-03 pasó 2/2. Resultados aún no importados a Xray XSP1-82.

2026-10-08: DET-01 passed in QA. Anonymous detail API and direct public UI showed Orbit Desk Lamp, description, USD 49.90 and in-stock state. API response and screenshot were captured automatically under `test-results/qa/`. Combined run for CAT-02, CAT-03 and DET-01 passed 3/3. Results remain local and have not been imported to Xray XSP1-82.

2026-10-08 accelerated full suite: CAT-01 was added to Playwright and mapped to XSP1-74, including its three Xray manual steps. Full QA suite passed 8/8; generated Xray JSON maps eight cases and 19 steps, all PASSED. CAT-04's controlled PostgreSQL outage and recovery passed with elevated Docker access. The reporter ignores transient nested assertion retry errors when calculating a parent `test.step` status. The final report was reimported: Xray CAT-01 shows all three steps PASSED, and CAT-02 all two steps PASSED; execution summary remains 8/8 PASSED.


## Automated execution — 2026-10-08

Playwright QA suite result: **7/7 PASS**, including CAT-04 database outage, safe error response, UI error state and recovery. Environment QA at localhost:8081 reported build sprint1-0.1.0. JUnit XML at `test-results/qa/xray-junit.xml` maps each case with Xray `test_key`, includes the run comment and embeds API/browser evidence for all seven cases. This local report has not yet been imported into Test Execution XSP1-82. Import uses the official Xray Cloud JUnit endpoint through `scripts/import-xray-results.ps1`; it prompts locally for the API Client ID and Client Secret and does not write them to disk.

Importación Xray completada el 2026-10-08: después de los errores al actualizar `customfield_10043`, el importador quedó enviando solo el Test Execution key y el XML, sin `testEnvironments` ni `revision`. Xray muestra en XSP1-82 **PASSED: 8 (100%) — TESTS TOTALES: 8**. Los siete resultados Playwright quedaron registrados junto al CAT-01 aprobado manualmente; ambiente QA/build continúan en el comentario de cada test run.

Sincronización de pasos — 2026-10-08: la revisión del run CAT-02 mostró que JUnit había actualizado el resultado general, pero dejó los pasos Manual en TODO. Xray JSON permite importar el estado y resultado actual de cada paso Manual. `tests/qa/xray-junit-reporter.cjs` ahora conserva JUnit y también produce `test-results/qa/xray-execution.json`, con cada `test.step` de Playwright alineado por orden con los pasos Xray y evidencia en el run. La suite QA pasó 7/7 y el JSON generado contiene 16 pasos PASSED; queda reimportarlo en XSP1-82 para actualizar Xray.

## Identity QA — XSP1-62…65

Four Playwright tests were added in `tests/qa/identity.spec.ts`:

| Case | Jira story | Automated coverage |
|---|---|---|
| IDN-01 | XSP1-62 | Email confirmation mismatch, pending registration, captured verification mail, duplicate email and DNI |
| IDN-02 | XSP1-63 | Resend invalidates the prior token; new token activates the account, creates a session and cannot be reused |
| IDN-03 | XSP1-64 | Wrong password, unknown email, pending-account denial and active login with normalized email |
| IDN-04 | XSP1-65 | Logout invalidates the server session; public catalog and product detail remain accessible |

QA run: **4/4 passed** on `http://localhost:8081`, reported build `sprint1-0.1.0`. Test data uses unique synthetic customers and captured messages in Mailpit (`http://localhost:8026`). The four Xray Test cases were imported and linked to their stories: IDN-01 XSP1-83, IDN-02 XSP1-84, IDN-03 XSP1-85 and IDN-04 XSP1-86. The mapping is in `docs/qa/imports/sprint1-identity-xray-keys.json` and the bulk import refuses to create duplicates.

Latest Playwright report: 11/11 passed, 26/26 steps PASSED. Xray execution XSP1-82 was read back from the API and verified at **12/12 PASSED, 30/30 steps PASSED**, retaining CAT-04's earlier passed result. The latest run omitted CAT-04 because Docker access was denied in that shell; QA readiness remained HTTP 200.

To rerun identity plus non-failure catalog/detail checks: `npm run test:qa -- --grep "IDN|CAT-0[1-3]|DET"`. To import the generated run into XSP1-82: `npm run xray:import:qa`. To verify test and step counts against Xray: `npm run xray:verify:qa`. Xray credentials are reused from the local DPAPI store.
