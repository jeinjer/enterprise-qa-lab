import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

const server = app.listen(config.PORT, () =>
  console.log(JSON.stringify({ event: "started", build: "sprint1-0.1.0" })),
);

process.on("SIGTERM", () => server.close(() => void pool.end()));
