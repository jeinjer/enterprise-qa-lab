import {
  test,
  expect,
  type APIRequestContext,
  type TestInfo,
} from "@playwright/test";
import { execFileSync } from "node:child_process";

async function attachExecutionContext(
  request: APIRequestContext,
  testInfo: TestInfo,
) {
  const response = await request.get("/api/v1/health/live");
  expect(response.status(), "QA liveness endpoint must be reachable").toBe(200);
  const build = await response.json();
  await testInfo.attach("execution-context", {
    body: JSON.stringify(
      {
        environment: "QA",
        origin: "http://localhost:8081",
        reportedBuild: build,
        date: new Date().toISOString(),
        note: "Build label does not identify the exact deployed commit.",
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
}

// Preconditions: QA seeded; active fixtures exist and Archive Stand is inactive.
// Xray case: CAT-01 (XSP1-74). This automates the case first executed manually.
test("CAT-01 — anonymous catalog shows active products and their attributes", async ({
  request,
  page,
}, testInfo) => {
  const lampId = "10000000-0000-4000-8000-000000000001";
  const notebookId = "10000000-0000-4000-8000-000000000002";

  await attachExecutionContext(request, testInfo);

  let products: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
    currency: string;
    available: boolean;
  }> = [];
  await test.step("Request the public catalog API without authentication", async () => {
    const response = await request.get("/api/v1/products");
    await testInfo.attach("catalog-api-response", {
      body: await response.body(),
      contentType: "application/json",
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.products)).toBe(true);
    products = body.products;
    expect(products.map((product) => product.id)).toEqual(
      expect.arrayContaining([lampId, notebookId]),
    );
  });

  await test.step("Compare active product attributes with the QA seed", async () => {
    expect(products.find((product) => product.id === lampId)).toMatchObject({
      id: lampId,
      name: "Orbit Desk Lamp",
      description: "Adjustable desk lamp for a focused workspace.",
      price: "49.90",
      currency: "USD",
      available: true,
    });
    expect(products.find((product) => product.id === notebookId)).toMatchObject({
      id: notebookId,
      name: "Slate Notebook",
      description: "A durable notebook for everyday ideas.",
      price: "12.50",
      currency: "USD",
      available: false,
    });
  });

  await test.step("Open the public catalog and verify product attributes and availability", async () => {
    await page.goto("/catalog");
    const lamp = page.getByRole("link").filter({
      has: page.getByRole("heading", { name: "Orbit Desk Lamp", exact: true }),
    });
    const notebook = page.getByRole("link").filter({
      has: page.getByRole("heading", { name: "Slate Notebook", exact: true }),
    });
    await expect(lamp).toBeVisible();
    await expect(lamp).toContainText("$49.90");
    await expect(lamp.getByText("In stock", { exact: true })).toBeVisible();
    await expect(notebook).toBeVisible();
    await expect(notebook).toContainText("$12.50");
    await expect(
      notebook.getByText("Unavailable · Out of stock", { exact: true }),
    ).toBeVisible();
    await testInfo.attach("catalog-active-products", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

// Preconditions: QA seeded; Slate Notebook active=true, stock=0, USD 12.50.
// Xray case: CAT-02 (XSP1-75).
test("CAT-02 — active zero-stock product remains visible as unavailable", async ({
  request,
  page,
}, testInfo) => {
  const notebookId = "10000000-0000-4000-8000-000000000002";

  await attachExecutionContext(request, testInfo);

  await test.step("Anonymous API includes the notebook with available=false", async () => {
    const response = await request.get("/api/v1/products");
    await testInfo.attach("catalog-api-response", {
      body: await response.body(),
      contentType: "application/json",
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.products)).toBe(true);
    const notebook = body.products.find(
      (product: { id: string }) => product.id === notebookId,
    );
    expect(notebook).toMatchObject({
      id: notebookId,
      name: "Slate Notebook",
      price: "12.50",
      currency: "USD",
      available: false,
    });
  });

  await test.step("Anonymous catalog displays the notebook price and out-of-stock label", async () => {
    await page.goto("/catalog");
    const card = page.getByRole("link").filter({
      has: page.getByRole("heading", { name: "Slate Notebook", exact: true }),
    });
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("href", `/catalog/${notebookId}`);
    await expect(card).toContainText("$12.50");
    await expect(
      card.getByText("Unavailable · Out of stock", { exact: true }),
    ).toBeVisible();
    await expect(card.getByText("In stock", { exact: true })).toHaveCount(0);
    await testInfo.attach("catalog-zero-stock", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

// Preconditions: QA seeded; Archive Stand exists with active=false.
// Xray case: CAT-03. The API assertion ensures the UI is not merely hiding a returned product.
test("CAT-03 — inactive product is excluded from the API and catalog", async ({
  request,
  page,
}, testInfo) => {
  const inactiveProductId = "10000000-0000-4000-8000-000000000003";

  await attachExecutionContext(request, testInfo);

  await test.step("Anonymous catalog API excludes Archive Stand", async () => {
    const response = await request.get("/api/v1/products");
    await testInfo.attach("catalog-api-response", {
      body: await response.body(),
      contentType: "application/json",
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.products)).toBe(true);
    expect(
      body.products.some(
        (product: { id: string }) => product.id === inactiveProductId,
      ),
    ).toBe(false);
    expect(
      body.products.some(
        (product: { name: string }) => product.name === "Archive Stand",
      ),
    ).toBe(false);
    expect(
      body.products.some(
        (product: { name: string }) => product.name === "Orbit Desk Lamp",
      ),
    ).toBe(true);
    expect(
      body.products.some(
        (product: { name: string }) => product.name === "Slate Notebook",
      ),
    ).toBe(true);
  });

  await test.step("Catalog UI excludes Archive Stand while keeping active products", async () => {
    await page.goto("/catalog");
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Slate Notebook", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Archive Stand", exact: true }),
    ).toHaveCount(0);
    await testInfo.attach("catalog-active-products", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

// Preconditions: QA seeded; Orbit Desk Lamp is active with stock=12.
// Xray case: DET-01. The API request and browser page use fresh anonymous contexts.
test("DET-01 — active in-stock product detail is public and complete", async ({
  request,
  page,
}, testInfo) => {
  const lampId = "10000000-0000-4000-8000-000000000001";

  await attachExecutionContext(request, testInfo);

  await test.step("Anonymous detail API returns the lamp attributes", async () => {
    const response = await request.get(`/api/v1/products/${lampId}`);
    await testInfo.attach("product-detail-api-response", {
      body: await response.body(),
      contentType: "application/json",
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.product).toMatchObject({
      id: lampId,
      name: "Orbit Desk Lamp",
      description: "Adjustable desk lamp for a focused workspace.",
      price: "49.90",
      currency: "USD",
      available: true,
    });
  });

  await test.step("Direct public detail page displays all lamp attributes", async () => {
    await page.goto(`/catalog/${lampId}`);
    await expect(page).toHaveURL(new RegExp(`/catalog/${lampId}$`));
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("$49.90", { exact: true })).toBeVisible();
    await expect(page.getByText("In stock", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Adjustable desk lamp for a focused workspace.", {
        exact: true,
      }),
    ).toBeVisible();
    await testInfo.attach("product-detail-public", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

// Xray case: DET-02. The API and page are accessed without an authenticated browser session.
test("DET-02 — active zero-stock product detail is public and unavailable", async ({
  request,
  page,
}, testInfo) => {
  const notebookId = "10000000-0000-4000-8000-000000000002";

  await attachExecutionContext(request, testInfo);

  await test.step("Anonymous detail API returns the active notebook as unavailable", async () => {
    const response = await request.get(`/api/v1/products/${notebookId}`);
    await testInfo.attach("product-detail-api-response", {
      body: await response.body(),
      contentType: "application/json",
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.product).toMatchObject({
      id: notebookId,
      name: "Slate Notebook",
      description: "A durable notebook for everyday ideas.",
      price: "12.50",
      currency: "USD",
      available: false,
    });
  });

  await test.step("Direct public detail page shows notebook data and unavailable state", async () => {
    await page.goto(`/catalog/${notebookId}`);
    await expect(
      page.getByRole("heading", { name: "Slate Notebook", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("$12.50", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Unavailable · Out of stock", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("A durable notebook for everyday ideas.", { exact: true }),
    ).toBeVisible();
    await testInfo.attach("product-detail-unavailable", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

// Xray case: DET-03. Inactive products are intentionally indistinguishable from unknown IDs.
test("DET-03 — inactive product detail returns not found", async ({
  request,
  page,
}, testInfo) => {
  const inactiveProductId = "10000000-0000-4000-8000-000000000003";

  await attachExecutionContext(request, testInfo);

  await test.step("Anonymous detail API rejects the inactive product", async () => {
    const response = await request.get(`/api/v1/products/${inactiveProductId}`);
    await testInfo.attach("inactive-product-api-response", {
      body: await response.body(),
      contentType: "application/json",
    });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    expect(body.error.correlationId).toEqual(expect.any(String));
    expect(body.product).toBeUndefined();
  });

  await test.step("Direct detail URL shows product not found, without product data", async () => {
    await page.goto(`/catalog/${inactiveProductId}`);
    await expect(
      page.getByRole("heading", { name: "Product not found", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Archive Stand", exact: true }),
    ).toHaveCount(0);
    await testInfo.attach("inactive-product-not-found", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

// Xray case: DET-04. This UUID is intentionally distinct from the seeded inactive product.
test("DET-04 — unknown product detail returns not found", async ({
  request,
  page,
}, testInfo) => {
  const unknownProductId = "10000000-0000-4000-8000-999999999999";

  await attachExecutionContext(request, testInfo);

  await test.step("Anonymous detail API returns structured not-found for an unknown ID", async () => {
    const response = await request.get(`/api/v1/products/${unknownProductId}`);
    await testInfo.attach("unknown-product-api-response", {
      body: await response.body(),
      contentType: "application/json",
    });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    expect(body.error.correlationId).toEqual(expect.any(String));
    expect(body.product).toBeUndefined();
  });

  await test.step("Direct unknown detail URL shows not found and no product", async () => {
    await page.goto(`/catalog/${unknownProductId}`);
    await expect(
      page.getByRole("heading", { name: "Product not found", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Slate Notebook", exact: true }),
    ).toHaveCount(0);
    await testInfo.attach("unknown-product-not-found", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});

// This test interrupts only the dedicated QA PostgreSQL container and always starts it again.
// Run only when intentionally executing the failure-injection case.
test("CAT-04 — catalog shows a safe error during database outage and recovers", async ({
  request,
  page,
}, testInfo) => {
  test.skip(
    process.env.RUN_QA_FAILURE_TESTS !== "true",
    "Set RUN_QA_FAILURE_TESTS=true to allow this QA-only database outage test.",
  );
  test.setTimeout(120000);
  let postgresStopped = false;
  const compose = (...args: string[]) =>
    execFileSync(
      "docker",
      ["compose", "--env-file", ".env.qa", "-p", "northstar-qa", ...args],
      { stdio: "pipe" },
    );

  await test.step("Confirm catalog works before controlled outage", async () => {
    await attachExecutionContext(request, testInfo);
    const response = await request.get("/api/v1/products");
    expect(response.status()).toBe(200);
    await page.goto("/catalog");
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp", exact: true }),
    ).toBeVisible();
  });

  try {
    await test.step("Stop only the QA PostgreSQL service", async () => {
      postgresStopped = true;
      compose("stop", "postgres");
      await expect(async () => {
        const response = await request.get("/api/v1/products");
        expect(response.status()).toBe(500);
      }).toPass({ timeout: 30000 });
    });

    await test.step("API returns a safe error and UI shows failure, not fake empty results", async () => {
      const response = await request.get("/api/v1/products");
      expect(response.status()).toBe(500);
      const body = await response.json();
      await testInfo.attach("catalog-outage-api-error", {
        body: JSON.stringify(body, null, 2),
        contentType: "application/json",
      });
      expect(body.error).toMatchObject({ code: "INTERNAL_ERROR" });
      expect(body.error.correlationId).toEqual(expect.any(String));
      expect(JSON.stringify(body)).not.toMatch(/postgres|sql|stack|exception/i);

      await page.reload();
      await expect(page.getByRole("alert")).toContainText(
        "The request could not be completed. Please try again.",
      );
      await expect(page.getByRole("alert")).toContainText("Reference:");
      await expect(
        page.getByText("No products are currently available.", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Orbit Desk Lamp", exact: true }),
      ).toHaveCount(0);
      await testInfo.attach("catalog-database-outage", {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  } finally {
    if (postgresStopped) compose("start", "postgres");
  }

  await test.step("Wait for QA readiness and confirm catalog recovers", async () => {
    await expect(async () => {
      const response = await request.get("/api/v1/health/ready");
      expect(response.status()).toBe(200);
    }).toPass({ timeout: 60000 });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Slate Notebook", exact: true }),
    ).toBeVisible();
    await testInfo.attach("catalog-restored", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
