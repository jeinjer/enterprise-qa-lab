import { Router } from "express";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import argon2 from "argon2";
import nodemailer from "nodemailer";
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { config } from "./config.js";
import { ApiError } from "./errors.js";
import { registration, login, emailInput } from "./validation.js";
import { authenticate, cookieOptions, requireCustomer } from "./session.js";
export const identity = Router();
const mail = nodemailer.createTransport({
  host: config.MAILPIT_HOST,
  port: 1025,
  secure: false,
  connectionTimeout: 5000,
  socketTimeout: 5000,
});
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
// Keep the raw token only in memory and the local captured email, never in application logs or DB.
async function issueToken(client: PoolClient, id: string, email: string) {
  const token = randomBytes(32).toString("hex");
  await client.query(
    "UPDATE email_verification_tokens SET invalidated_at=now() WHERE customer_id=$1 AND used_at IS NULL AND invalidated_at IS NULL",
    [id],
  );
  await client.query(
    "INSERT INTO email_verification_tokens(token_hash,customer_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
    [digest(token), id],
  );
  try {
    await mail.sendMail({
      from: "Northstar Commerce <no-reply@northstar.test>",
      to: email,
      subject: "Verify your Northstar account",
      text: `Verify your email within 30 minutes: ${config.PUBLIC_ORIGIN}/verify#token=${token}\nThis is a synthetic local laboratory message.`,
    });
  } catch {
    throw new ApiError(
      503,
      "MAIL_UNAVAILABLE",
      "Local mail capture is unavailable. Please try again.",
    );
  }
}
identity.post("/register", async (req, res) => {
  const data = registration.parse(req.body);
  const passwordHash = await argon2.hash(data.password, {
    type: argon2.argon2id,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = randomUUID();
    await client.query(
      "INSERT INTO customers(customer_id,first_name,last_name,dni,email,password_hash,status) VALUES($1,$2,$3,$4,$5,$6,'PENDING_VERIFICATION')",
      [id, data.firstName, data.lastName, data.dni, data.email, passwordHash],
    );
    await issueToken(client, id, data.email);
    await client.query("COMMIT");
    res
      .status(201)
      .json({
        customerId: id,
        status: "PENDING_VERIFICATION",
        message: "Check Mailpit for your verification message.",
      });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (
      err.code === "23505" &&
      ["customers_email_key", "customers_dni_key"].includes(err.constraint)
    ) {
      const field = err.constraint === "customers_email_key" ? "email" : "dni";
      throw new ApiError(
        409,
        "DUPLICATE_CUSTOMER",
        `This ${field} is already registered.`,
        { [field]: [`This ${field} is already registered.`] },
      );
    }
    throw err;
  } finally {
    client.release();
  }
});
identity.post("/verification/resend", async (req, res) => {
  const { email } = z.object({ email: emailInput }).parse(req.body);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      "SELECT customer_id,status FROM customers WHERE email=$1 FOR UPDATE",
      [email],
    );
    if (found.rows[0]?.status === "PENDING_VERIFICATION")
      await issueToken(client, found.rows[0].customer_id, email);
    await client.query("COMMIT");
    res.json({
      message:
        "If this email belongs to a pending account, a new message has been captured in Mailpit.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
identity.post("/verification/confirm", async (req, res) => {
  const { token } = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(req.body);
  const client = await pool.connect();
  let id: string;
  try {
    await client.query("BEGIN");
    // Lock customer before token, matching resend's lock order and serializing both flows.
    const customer = await client.query(
      "SELECT c.customer_id,c.status FROM customers c JOIN email_verification_tokens t USING(customer_id) WHERE t.token_hash=$1 FOR UPDATE OF c",
      [digest(token)],
    );
    id = customer.rows[0]?.customer_id;
    if (!id || customer.rows[0].status !== "PENDING_VERIFICATION")
      throw new ApiError(
        400,
        "INVALID_VERIFICATION",
        "This verification link is invalid, expired or already used. Request a new one.",
      );
    const tokenResult = await client.query(
      "UPDATE email_verification_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND invalidated_at IS NULL AND expires_at>clock_timestamp() RETURNING customer_id",
      [digest(token)],
    );
    if (!tokenResult.rowCount)
      throw new ApiError(
        400,
        "INVALID_VERIFICATION",
        "This verification link is invalid, expired or already used. Request a new one.",
      );
    await client.query(
      "UPDATE customers SET status='ACTIVE' WHERE customer_id=$1",
      [id],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  try {
    await authenticate(req, id);
  } catch {
    throw new ApiError(
      503,
      "SESSION_UNAVAILABLE",
      "Your email was verified, but the session could not be started. Please sign in.",
    );
  }
  res.json({ message: "Email verified.", redirectTo: "/catalog" });
});
// A dummy hash keeps unknown-email attempts on the password verification path.
const dummyHash = await argon2.hash(randomBytes(32).toString("hex"));
identity.post("/login", async (req, res) => {
  const data = login.parse(req.body);
  const result = await pool.query(
    "SELECT customer_id,password_hash,status FROM customers WHERE email=$1",
    [data.email],
  );
  const customer = result.rows[0];
  const valid = await argon2.verify(
    customer?.password_hash ?? dummyHash,
    data.password,
  );
  if (!customer || !valid)
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  if (customer.status !== "ACTIVE")
    throw new ApiError(
      403,
      "VERIFICATION_REQUIRED",
      "Verify your email before signing in.",
    );
  await authenticate(req, customer.customer_id);
  res.json({ redirectTo: "/catalog" });
});
identity.get("/session", requireCustomer, (_req, res) =>
  res.json({ customer: res.locals.customer }),
);
identity.post("/logout", async (req, res) => {
  await new Promise<void>((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(err) : resolve())),
  );
  res
    .clearCookie(config.SESSION_COOKIE_NAME, cookieOptions)
    .json({ redirectTo: "/catalog" });
});
