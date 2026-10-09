// DEV technical verification against the real local Compose stack, not QA acceptance.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomInt, createHash } from "node:crypto";
const origin = process.env.TEST_ORIGIN ?? "http://localhost:8080";
const mailpit = process.env.TEST_MAILPIT ?? "http://localhost:8025";
let checks = 0;
function check(value, label) {
  assert.ok(value, label);
  checks++;
  console.log(`DEV check ${checks}: ${label}`);
}
async function call(path, body, cookie) {
  const r = await fetch(`${origin}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
    headers: r.headers,
  };
}
function sql(query) {
  return execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "northstar",
      "-d",
      "northstar",
      "-At",
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();
}
async function tokenFor(email) {
  const list = await (await fetch(`${mailpit}/api/v1/messages`)).json();
  const item = list.messages.find((m) => m.To.some((t) => t.Address === email));
  assert.ok(item, "captured message exists");
  const message = await (
    await fetch(`${mailpit}/api/v1/message/${item.ID}`)
  ).json();
  const match = message.Text.match(/#token=([a-f0-9]{64})/);
  assert.ok(match, "captured token exists");
  return match[1];
}
const suffix = randomInt(1000000, 9999999).toString();
const email = `dev-${suffix}@example.test`;
const person = {
  firstName: "Test",
  lastName: "Customer",
  dni: suffix,
  email,
  emailConfirmation: email,
  password: "SyntheticPass!",
  passwordConfirmation: "SyntheticPass!",
};
check((await call("/health/ready")).status === 200, "readiness");
const catalog = await call("/products");
check(
  catalog.status === 200 && catalog.data.products.length === 2,
  "public catalog exposes only active seeds",
);
check(
  catalog.data.products.some((p) => !p.available),
  "zero-stock product visible as unavailable",
);
check(
  (await call("/products/10000000-0000-4000-8000-000000000003")).status === 404,
  "inactive detail hidden",
);
check(
  (await call("/products/10000000-0000-4000-8000-999999999999")).status === 404,
  "unknown detail not found",
);
check(
  (await call("/products/10000000-0000-4000-8000-000000000001")).data.product
    .description.length > 0,
  "public active detail",
);
const invalid = await call("/auth/register", {
  ...person,
  emailConfirmation: "different@example.test",
});
check(
  invalid.status === 400 &&
    Boolean(invalid.data.error.fields.emailConfirmation) &&
    Boolean(invalid.data.error.correlationId),
  "field errors and correlation ID",
);
check(
  sql(`SELECT count(*) FROM customers WHERE email='${email}'`) === "0",
  "invalid registration creates no customer",
);
const registered = await call("/auth/register", person);
check(
  registered.status === 201 && !registered.cookie,
  "pending registration without authenticated session",
);
const id = registered.data.customerId;
check(
  sql(`SELECT status FROM customers WHERE customer_id='${id}'`) ===
    "PENDING_VERIFICATION",
  "pending status persisted",
);
check(
  sql(
    `SELECT password_hash LIKE '$argon2id$%' FROM customers WHERE customer_id='${id}'`,
  ) === "t",
  "Argon2id persisted",
);
const duplicate = await call("/auth/register", {
  ...person,
  dni: "9" + suffix,
  email: email.toUpperCase(),
  emailConfirmation: email.toUpperCase(),
});
check(
  duplicate.status === 409 && Boolean(duplicate.data.error.fields.email),
  "normalized email uniqueness",
);
const duplicateDni = await call("/auth/register", {
  ...person,
  email: `other-${email}`,
  emailConfirmation: `other-${email}`,
});
check(
  duplicateDni.status === 409 && Boolean(duplicateDni.data.error.fields.dni),
  "DNI uniqueness",
);
const pending = await call("/auth/login", { email, password: person.password });
check(pending.status === 403 && !pending.cookie, "pending login denied");
const token = await tokenFor(email);
check(
  sql(
    `SELECT count(*) FROM email_verification_tokens WHERE token_hash='${createHash("sha256").update(token).digest("hex")}'`,
  ) === "1",
  "token persisted as SHA-256 hash",
);
check(
  (await call("/auth/verification/resend", { email })).status === 200,
  "resend captured",
);
check(
  (await call("/auth/verification/confirm", { token })).status === 400,
  "resend invalidates old token",
);
let fresh = await tokenFor(email);
sql(
  `UPDATE email_verification_tokens SET expires_at=now()-interval '1 second' WHERE customer_id='${id}'`,
);
const expired = await call("/auth/verification/confirm", { token: fresh });
check(
  expired.status === 400 && !expired.cookie,
  "expired token rejected without session",
);
await call("/auth/verification/resend", { email });
fresh = await tokenFor(email);
const verified = await call("/auth/verification/confirm", { token: fresh });
check(
  verified.status === 200 &&
    Boolean(verified.cookie) &&
    verified.headers.get("set-cookie").includes("HttpOnly"),
  "verification authenticates with HttpOnly cookie",
);
check(
  (await call("/auth/session", undefined, verified.cookie)).data.customer
    .customer_id === id,
  "authenticated session resolves customer",
);
check(
  sql(`SELECT status FROM customers WHERE customer_id='${id}'`) === "ACTIVE",
  "activation persisted",
);
const reuse = await call("/auth/verification/confirm", { token: fresh });
check(reuse.status === 400 && !reuse.cookie, "single-use token");
check(
  (await call("/auth/logout", {}, verified.cookie)).status === 200,
  "logout succeeds",
);
check(
  (await call("/auth/session", undefined, verified.cookie)).status === 401,
  "previous session denied after logout",
);
check(
  (await call("/products", undefined, verified.cookie)).status === 200,
  "catalog remains public after logout",
);
check(
  (await call("/auth/login", { email, password: "Incorrect!" })).status === 401,
  "incorrect password denied",
);
check(
  (
    await call("/auth/login", {
      email: `missing-${email}`,
      password: person.password,
    })
  ).status === 401,
  "unknown email denied",
);
const loggedIn = await call("/auth/login", {
  email: email.toUpperCase(),
  password: person.password,
});
check(
  loggedIn.status === 200 && Boolean(loggedIn.cookie),
  "ACTIVE login normalizes email",
);
execFileSync("docker", ["compose", "restart", "api"], { stdio: "pipe" });
for (let i = 0; i < 30; i++) {
  try {
    if ((await call("/health/ready")).status === 200) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
check(
  (await call("/auth/session", undefined, loggedIn.cookie)).status === 200,
  "session survives API restart",
);
const csrf = await fetch(`${origin}/api/v1/auth/logout`, {
  method: "POST",
  headers: {
    Origin: "http://untrusted.test",
    "Content-Type": "application/json",
    Cookie: loggedIn.cookie,
  },
  body: "{}",
});
check(csrf.status === 403, "cross-origin mutation rejected");
await call("/auth/logout", {}, loggedIn.cookie);
console.log(
  `DEV integration complete: ${checks} checks; synthetic customer ${email}; no QA acceptance claimed.`,
);
