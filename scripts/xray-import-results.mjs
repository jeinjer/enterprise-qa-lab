import { readFile } from "node:fs/promises";

const required = ["XRAY_CLIENT_ID", "XRAY_CLIENT_SECRET", "XRAY_EXECUTION_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const reportPath =
  process.env.XRAY_JSON_REPORT || "test-results/qa/xray-execution.json";
const payload = JSON.parse(await readFile(reportPath, "utf8"));
if (!Array.isArray(payload.tests) || payload.tests.length === 0) {
  throw new Error(`Xray JSON report has no tests: ${reportPath}`);
}
if (payload.tests.some((test) => !test.testKey || !test.status)) {
  throw new Error("Every Xray test result must include testKey and status.");
}
payload.testExecutionKey = process.env.XRAY_EXECUTION_KEY;

const baseUrl = "https://xray.cloud.getxray.app/api/v2";
const authResponse = await fetch(`${baseUrl}/authenticate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    client_id: process.env.XRAY_CLIENT_ID,
    client_secret: process.env.XRAY_CLIENT_SECRET,
  }),
});
if (!authResponse.ok)
  throw new Error(
    `Xray authentication failed with HTTP ${authResponse.status}.`,
  );
const token = await authResponse.json();
if (typeof token !== "string" || !token)
  throw new Error("Xray authentication returned an unexpected response.");

const importResponse = await fetch(`${baseUrl}/import/execution`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
const result = await importResponse.text();
if (!importResponse.ok)
  throw new Error(
    `Xray import failed with HTTP ${importResponse.status}: ${result}`,
  );
console.log(
  `Imported ${payload.tests.length} Xray test results, including step results, into ${process.env.XRAY_EXECUTION_KEY}: ${result}`,
);
