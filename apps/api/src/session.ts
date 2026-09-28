import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db.js";
import { config } from "./config.js";
import { ApiError } from "./errors.js";
declare module "express-session" {
  interface SessionData {
    customerId: string;
  }
}
const Store = connectPgSimple(session);
export const cookieOptions = {
  httpOnly: true,
  secure: config.COOKIE_SECURE === "true",
  sameSite: "lax" as const,
  path: "/",
};
export const sessions = session({
  name: config.SESSION_COOKIE_NAME,
  secret: config.SESSION_SECRET,
  store: new Store({
    pool,
    tableName: "sessions",
    createTableIfMissing: false,
    errorLog: () =>
      console.error(JSON.stringify({ event: "session_store_error" })),
  }),
  resave: false,
  saveUninitialized: false,
  cookie: { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 },
});
export async function authenticate(req: Request, id: string) {
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(err) : resolve())),
  );
  req.session.customerId = id;
  await new Promise<void>((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve())),
  );
}
export async function requireCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.session.customerId)
    throw new ApiError(401, "AUTH_REQUIRED", "Please sign in.");
  const result = await pool.query(
    "SELECT customer_id,first_name,last_name,email FROM customers WHERE customer_id=$1 AND status=$2",
    [req.session.customerId, "ACTIVE"],
  );
  if (!result.rowCount)
    throw new ApiError(401, "AUTH_REQUIRED", "Please sign in.");
  res.locals.customer = result.rows[0];
  next();
}
