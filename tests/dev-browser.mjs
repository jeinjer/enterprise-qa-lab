import { chromium, expect } from "@playwright/test";
import { randomInt } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
const origin = process.env.TEST_ORIGIN ?? "http://localhost:8080";
const mailpit = process.env.TEST_MAILPIT ?? "http://localhost:8025";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let checks = 0;
const passed = (label) =>
  console.log(`DEV browser check ${++checks}: ${label}`);
try {
  await page.goto(`${origin}/catalog`);
  await expect(
    page.getByRole("heading", { name: "Orbit Desk Lamp" }),
  ).toBeVisible();
  await expect(page.getByText("Unavailable · Out of stock")).toBeVisible();
  passed("visitor catalog and zero-stock state");
  await mkdir("evidence/dev-sprint1", { recursive: true });
  await page.screenshot({
    path: "evidence/dev-sprint1/catalog-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Orbit Desk Lamp" }) })
    .click();
  await expect(
    page.getByText("Adjustable desk lamp for a focused workspace."),
  ).toBeVisible();
  passed("public product navigation");
  await page.goto(`${origin}/catalog/10000000-0000-4000-8000-000000000003`);
  await expect(
    page.getByRole("heading", { name: "Product not found" }),
  ).toBeVisible();
  passed("inactive direct URL not found");
  await page.goto(`${origin}/register`);
  const suffix = randomInt(1000000, 9999999).toString();
  const email = `ui-${suffix}@example.test`;
  const values = {
    firstName: "Browser",
    lastName: "Customer",
    dni: suffix,
    email,
    emailConfirmation: "mismatch@example.test",
    password: "SyntheticPass!",
    passwordConfirmation: "SyntheticPass!",
  };
  for (const [id, value] of Object.entries(values))
    await page.locator(`#${id}`).fill(value);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("Emails must match exactly")).toBeVisible();
  await expect(page.locator("#password")).toHaveValue("");
  await expect(page.locator("#passwordConfirmation")).toHaveValue("");
  await expect(page.locator("#firstName")).toHaveValue("Browser");
  passed(
    "registration field errors preserve non-sensitive fields and clear passwords",
  );
  await page.locator("#emailConfirmation").fill(email);
  await page.locator("#password").fill("SyntheticPass!");
  await page.locator("#passwordConfirmation").fill("SyntheticPass!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  passed("registration pending confirmation UI");
  const messages = await (await fetch(`${mailpit}/api/v1/messages`)).json();
  const item = messages.messages.find((m) =>
    m.To.some((t) => t.Address === email),
  );
  const message = await (
    await fetch(`${mailpit}/api/v1/message/${item.ID}`)
  ).json();
  const url = message.Text.match(/http[^\s]+#token=[a-f0-9]+/)[0];
  await page.goto(url);
  await expect(page).toHaveURL(`${origin}/catalog`);
  await expect(page.getByText("Hello, Browser")).toBeVisible();
  passed("Mailpit link activates, authenticates and redirects");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Orbit Desk Lamp" }),
  ).toBeVisible();
  passed("logout leaves public catalog accessible");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("SyntheticPass!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/catalog`);
  await expect(page.getByText("Hello, Browser")).toBeVisible();
  passed("ACTIVE UI login");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "evidence/dev-sprint1/catalog-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  passed("mobile layout has no horizontal overflow");
  // Actual database outage: no mocked API or fabricated production behavior.
  execFileSync("docker", ["compose", "stop", "postgres"], { stdio: "pipe" });
  try {
    await page.reload();
    await expect(page.getByRole("alert").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: "evidence/dev-sprint1/catalog-error.png",
      fullPage: true,
    });
    passed("real database outage shows error without catalog products");
  } finally {
    execFileSync("docker", ["compose", "start", "postgres"], { stdio: "pipe" });
  }
  await expect(async () => {
    const r = await fetch(`${origin}/api/v1/health/ready`);
    expect(r.status).toBe(200);
  }).toPass({ timeout: 30000 });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Orbit Desk Lamp" }),
  ).toBeVisible();
  passed("catalog recovers after database restart");
  expect(errors).toEqual([]);
  passed("no uncaught browser errors");
  console.log(
    `DEV browser complete: ${checks} checks; synthetic customer ${email}; no QA acceptance claimed.`,
  );
} finally {
  await browser.close();
}
