import { readFile, readdir } from "node:fs/promises";
import { pool } from "./db.js";
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(731001)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of (await readdir("/app/database/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      (
        await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [
          name,
        ])
      ).rowCount
    )
      continue;
    await client.query(
      await readFile(`/app/database/migrations/${name}`, "utf8"),
    );
    await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [
      name,
    ]);
    console.log(JSON.stringify({ event: "migration_applied", name }));
  }
  await client.query("COMMIT");
} catch {
  await client.query("ROLLBACK");
  console.error("Migration failed");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
