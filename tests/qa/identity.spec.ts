import {
  test,
  expect,
  type APIRequestContext,
  type TestInfo,
} from "@playwright/test";
import { randomInt } from "node:crypto";

const origin = "http://localhost:8081";
const mailpit = "http://localhost:8026";
const password = "SyntheticPass!";

function post(request: APIRequestContext, path: string, data: unknown) {
  return request.post(path, { data, headers: { Origin: origin } });
}

function customer() {
  const suffix = `${Date.now()}${randomInt(1000, 9999)}`;
  return {
    firstName: "QA",
    lastName: "Customer",
    dni: suffix.slice(-8),
    email: `qa-${suffix}@example.test`,
    emailConfirmation: `qa-${suffix}@example.test`,
    password,
    passwordConfirmation: password,
  };
}

async function attachContext(request: APIRequestContext, info: TestInfo) {
  const response = await request.get("/api/v1/health/live");
  expect(response.status()).toBe(200);
  await info.attach("execution-context", {
    body: JSON.stringify(
      {
        environment: "QA",
        origin,
        reportedBuild: await response.json(),
        date: new Date().toISOString(),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
}

async function capturedToken(
  email: string,
  excludedToken = "",
): Promise<string> {
  let token = "";
  await expect
    .poll(
      async () => {
        const listResponse = await fetch(`${mailpit}/api/v1/messages`);
        if (!listResponse.ok) return "";
        const list = await listResponse.json();
        const items =
          list.messages?.filter((message: any) =>
            message.To?.some((recipient: any) => recipient.Address === email),
          ) || [];
        for (const item of items) {
          const message = await (
            await fetch(`${mailpit}/api/v1/message/${item.ID}`)
          ).json();
          token = message.Text?.match(/#token=([a-f0-9]{64})/)?.[1] || "";
          if (token && token !== excludedToken) return token;
        }
        return "";
      },
      { timeout: 10000 },
    )
    .not.toBe("");
  return token;
}

async function register(request: APIRequestContext, person = customer()) {
  const response = await post(request, "/api/v1/auth/register", person);
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.status).toBe("PENDING_VERIFICATION");
  expect(body.customerId).toEqual(expect.any(String));
  return { person, customerId: body.customerId as string };
}

async function activate(request: APIRequestContext, email: string) {
  const token = await capturedToken(email);
  const response = await post(request, "/api/v1/auth/verification/confirm", {
    token,
  });
  expect(response.status()).toBe(200);
  return token;
}

test("IDN-01 — registration rejects mismatches and creates a pending customer", async ({
  request,
  page,
}, testInfo) => {
  const person = customer();
  await attachContext(request, testInfo);

  await test.step("Reject mismatched email confirmation and clear passwords", async () => {
    await page.goto("/register");
    for (const [field, value] of Object.entries({
      ...person,
      emailConfirmation: "different@example.test",
    }))
      await page.locator(`#${field}`).fill(value);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.getByText("Emails must match exactly")).toBeVisible();
    await expect(page.locator("#password")).toHaveValue("");
    await expect(page.locator("#passwordConfirmation")).toHaveValue("");
    await expect(page.locator("#firstName")).toHaveValue(person.firstName);
  });

  await test.step("Submit valid data and capture its verification email", async () => {
    await page.locator("#emailConfirmation").fill(person.email);
    await page.locator("#password").fill(password);
    await page.locator("#passwordConfirmation").fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    const token = await capturedToken(person.email);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  await test.step("Reject duplicate email and DNI", async () => {
    const duplicateEmail = await post(request, "/api/v1/auth/register", {
      ...person,
      dni: `${randomInt(1000000, 9999999)}`,
    });
    expect(duplicateEmail.status()).toBe(409);
    expect((await duplicateEmail.json()).error.fields.email).toBeTruthy();
    const other = customer();
    const duplicateDni = await post(request, "/api/v1/auth/register", {
      ...other,
      dni: person.dni,
    });
    expect(duplicateDni.status()).toBe(409);
    expect((await duplicateDni.json()).error.fields.dni).toBeTruthy();
  });
});

test("IDN-02 — resend invalidates the old link; verification activates and signs in", async ({
  request,
  page,
}, testInfo) => {
  await attachContext(request, testInfo);
  const { person } = await register(request);
  const oldToken = await capturedToken(person.email);
  let newToken = "";

  await test.step("Resend creates a new email and invalidates the prior token", async () => {
    const resend = await post(request, "/api/v1/auth/verification/resend", {
      email: person.email,
    });
    expect(resend.status()).toBe(200);
    newToken = await capturedToken(person.email, oldToken);
    expect(newToken).not.toBe(oldToken);
    const oldConfirmation = await post(
      request,
      "/api/v1/auth/verification/confirm",
      { token: oldToken },
    );
    expect(oldConfirmation.status()).toBe(400);
    await testInfo.attach("invalidated-verification-response", {
      body: await oldConfirmation.body(),
      contentType: "application/json",
    });
  });

  await test.step("Verify from the captured new link and redirect to public catalog", async () => {
    await page.goto(`${origin}/verify#token=${newToken}`);
    await expect(page).toHaveURL(`${origin}/catalog`);
    await expect(page.getByText("Hello, QA")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp" }),
    ).toBeVisible();
  });

  await test.step("Confirm activation created a session and the token is single-use", async () => {
    const session = await page.request.get("/api/v1/auth/session");
    expect(session.status()).toBe(200);
    expect((await session.json()).customer.email).toBe(person.email);
    const reuse = await post(
      page.request,
      "/api/v1/auth/verification/confirm",
      {
        token: newToken,
      },
    );
    expect(reuse.status()).toBe(400);
  });
});

test("IDN-03 — login permits active customers and rejects invalid or pending accounts", async ({
  request,
  page,
}, testInfo) => {
  await attachContext(request, testInfo);
  const active = await register(request);
  await activate(request, active.person.email);
  const pending = await register(request);

  await page.goto("/login");
  await test.step("Reject incorrect password and unknown email without creating a session", async () => {
    await page.locator("#email").fill(active.person.email);
    await page.locator("#password").fill("WrongPassword!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("Email or password is incorrect."),
    ).toBeVisible();
    await expect(page.locator("#password")).toHaveValue("");
    await page.locator("#email").fill(customer().email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("Email or password is incorrect."),
    ).toBeVisible();
  });

  await test.step("Require verification for a pending customer", async () => {
    await page.locator("#email").fill(pending.person.email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("Verify your email before signing in."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Need a new verification link?" }),
    ).toBeVisible();
    await expect(page.locator("#password")).toHaveValue("");
  });

  await test.step("Sign in with active credentials and normalized email", async () => {
    await page.locator("#email").fill(` ${active.person.email.toUpperCase()} `);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/catalog`);
    await expect(page.getByText("Hello, QA")).toBeVisible();
  });
});

test("IDN-04 — logout invalidates the session and leaves catalog public", async ({
  request,
  page,
}, testInfo) => {
  await attachContext(request, testInfo);
  const active = await register(request);
  await activate(request, active.person.email);

  await test.step("Sign out and reject the former authenticated session", async () => {
    await page.goto("/login");
    await page.locator("#email").fill(active.person.email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/catalog`);
    await expect(page.getByText("Hello, QA")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
    const session = await page.request.get("/api/v1/auth/session");
    expect(session.status()).toBe(401);
  });

  await test.step("Continue browsing the public catalog after logout", async () => {
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp" }),
    ).toBeVisible();
    const catalog = await page.request.get("/api/v1/products");
    expect(catalog.status()).toBe(200);
    await page.goto("/catalog/10000000-0000-4000-8000-000000000001");
    await expect(
      page.getByRole("heading", { name: "Orbit Desk Lamp" }),
    ).toBeVisible();
  });
});
