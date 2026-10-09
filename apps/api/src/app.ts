import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { pool } from "./db.js";
import { sessions } from "./modules/identity/session.js";
import { identity } from "./modules/identity/routes.js";
import { catalog } from "./modules/catalog/routes.js";
import { ApiError, errorHandler } from "./errors.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const correlationId = randomUUID();
  res.locals.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  const started = Date.now();
  res.on("finish", () =>
    console.log(
      JSON.stringify({
        event: "http",
        correlationId,
        method: req.method,
        status: res.statusCode,
        durationMs: Date.now() - started,
      }),
    ),
  );
  next();
});
app.use(helmet());
app.use(cors({ origin: config.PUBLIC_ORIGIN, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
// Browser mutations must originate from the configured frontend and use JSON.
// This also prevents cross-site form submissions; GET never mutates identity.
app.use((req, _res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    if (req.get("Origin") !== config.PUBLIC_ORIGIN)
      throw new ApiError(
        403,
        "ORIGIN_REJECTED",
        "Request origin is not allowed.",
      );
    if (!req.is("application/json"))
      throw new ApiError(415, "JSON_REQUIRED", "Use application/json.");
  }
  next();
});
app.get("/api/v1/health/live", (_req, res) =>
  res.json({ status: "ok", build: "sprint1-0.1.0" }),
);
app.get("/api/v1/health/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1 FROM schema_migrations LIMIT 1");
    res.json({ status: "ready" });
  } catch {
    throw new ApiError(
      503,
      "NOT_READY",
      "Database is unavailable or not migrated.",
    );
  }
});
app.use("/api/v1/products", catalog);
app.use(
  "/api/v1/auth",
  sessions,
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(
        new ApiError(
          429,
          "RATE_LIMITED",
          "Too many requests. Try again shortly.",
        ),
      ),
  }),
  identity,
);
app.use((_req, _res) => {
  throw new ApiError(404, "NOT_FOUND", "Resource not found.");
});
app.use(errorHandler);

export { app };
