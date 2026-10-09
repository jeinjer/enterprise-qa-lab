// Focused DEV checks for TR-01/TR-02. Requires DEV and a separate review stack.
// The review stack uses .env.qa ports but -p northstar-review, never the QA volume.
import { chromium, expect } from "@playwright/test";
import { randomInt } from "node:crypto";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext();
const origins = ["http://localhost:8080", "http://localhost:8081"];
const inboxes = ["http://localhost:8025", "http://localhost:8026"];
let checks = 0;
const passed = (message) => console.log(`DEV review ${++checks}: ${message}`);
async function post(origin, path, data) {
  return context.request.post(`${origin}/api/v1/auth/${path}`, {
    data,
    headers: { Origin: origin },
  });
}
async function session(origin) {
  return context.request.get(`${origin}/api/v1/auth/session`);
}
const users = [];
try {
  for (let i = 0; i < 2; i++) {
    const suffix = randomInt(1000000, 9999999).toString();
    const email = `review-${suffix}@example.test`;
    const password = "SyntheticPass!";
    const response = await post(origins[i], "register", {
      firstName: "Review",
      lastName: "Customer",
      dni: suffix,
      email,
      emailConfirmation: email,
      password,
      passwordConfirmation: password,
    });
    expect(response.status()).toBe(201);
    const { customerId } = await response.json();
    const messages = await (
      await fetch(`${inboxes[i]}/api/v1/messages`)
    ).json();
    const item = messages.messages.find((m) =>
      m.To.some((t) => t.Address === email),
    );
    expect(item).toBeTruthy();
    const mail = await (
      await fetch(`${inboxes[i]}/api/v1/message/${item.ID}`)
    ).json();
    const token = mail.Text.match(/#token=([a-f0-9]{64})/)[1];
    expect(
      (await post(origins[i], "verification/confirm", { token })).status(),
    ).toBe(200);
    users.push({ email, password, customerId });
  }
  for (let i = 0; i < 2; i++)
    expect(
      (await (await session(origins[i])).json()).customer.customer_id,
    ).toBe(users[i].customerId);
  passed("both real authenticated sessions coexist in one browser context");
  const names = (await context.cookies()).map((c) => c.name);
  expect(names).toContain("northstar-dev.sid");
  expect(names).toContain("northstar-review.sid");
  passed("Compose project override produces distinct cookie names");
  expect((await post(origins[1], "logout", {})).status()).toBe(200);
  expect((await session(origins[1])).status()).toBe(401);
  expect((await session(origins[0])).status()).toBe(200);
  passed("review logout denies its session while preserving DEV session");
  expect((await post(origins[1], "login", users[1])).status()).toBe(200);
  expect((await post(origins[0], "logout", {})).status()).toBe(200);
  expect((await session(origins[0])).status()).toBe(401);
  expect((await session(origins[1])).status()).toBe(200);
  passed("DEV logout preserves the other environment session");

  const page = await context.newPage();
  let first = true;
  await page.route("**/api/v1/auth/session", async (route) => {
    if (first) {
      first = false;
      // Test-only network fault injection; subsequent requests use the real API.
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "TEMPORARY_FAILURE",
            message: "Temporary session connection failure",
            correlationId: "dev-review-injection",
          },
        }),
      });
    } else await route.continue();
  });
  await page.goto(`${origins[0]}/login`);
  await expect(page.getByRole("alert")).toContainText(
    "Temporary session connection failure",
  );
  passed("initial injected session error is displayed");
  await page.locator("#email").fill(users[0].email);
  await page.locator("#password").fill(users[0].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${origins[0]}/catalog`);
  await expect(page.getByText("Hello, Review")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  passed("successful real login clears initial error without reloading");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect((await session(origins[0])).status()).toBe(401);
  passed("expected unauthenticated refresh after logout leaves no error");
  await post(origins[1], "logout", {});
  console.log(
    `DEV review complete: ${checks} checks. No QA acceptance claimed.`,
  );
  console.log(
    `Synthetic users: DEV ${users[0].email}; isolated review ${users[1].email}.`,
  );
} finally {
  await context.close();
  await browser.close();
}
