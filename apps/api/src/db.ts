import pg from "pg";
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
pool.on("error", () =>
  console.error(JSON.stringify({ event: "database_connection_error" })),
);
