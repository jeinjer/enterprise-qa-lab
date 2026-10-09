import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const required = ["XRAY_CLIENT_ID", "XRAY_CLIENT_SECRET"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const inputPath = "docs/qa/imports/sprint1-identity-xray.json";
const keyMapPath = "docs/qa/imports/sprint1-identity-xray-keys.json";
try {
  await access(keyMapPath);
  throw new Error(
    `Identity Tests already have Xray keys in ${keyMapPath}; refusing to create duplicates.`,
  );
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes("already have Xray keys")
  )
    throw error;
}
const tests = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(tests) || tests.length !== 4) {
  throw new Error(`Expected four identity test definitions in ${inputPath}.`);
}
for (const [index, test] of tests.entries()) {
  if (
    test.testtype !== "Manual" ||
    typeof test.fields?.summary !== "string" ||
    typeof test.fields?.description !== "string" ||
    !Array.isArray(test.steps) ||
    test.steps.length === 0
  ) {
    throw new Error(`Identity test definition ${index + 1} is incomplete.`);
  }
}

const baseUrl = "https://xray.cloud.getxray.app/api";
const authResponse = await fetch(`${baseUrl}/v2/authenticate`, {
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

const importResponse = await fetch(`${baseUrl}/v1/import/test/bulk`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(tests),
});
const importText = await importResponse.text();
if (!importResponse.ok)
  throw new Error(
    `Xray test import failed with HTTP ${importResponse.status}: ${importText}`,
  );

let job;
try {
  job = JSON.parse(importText);
} catch {
  throw new Error(
    `Xray returned an unreadable import job response: ${importText}`,
  );
}
const jobId =
  (typeof job === "string" ? job : undefined) ??
  job.jobId ??
  job.id ??
  job.job?.id;
if (!jobId)
  throw new Error(`Xray did not return an import job ID: ${importText}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let status;
for (let attempt = 0; attempt < 30; attempt++) {
  const response = await fetch(
    `${baseUrl}/v1/import/test/bulk/${encodeURIComponent(jobId)}/status`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const text = await response.text();
  if (!response.ok)
    throw new Error(
      `Xray import status failed with HTTP ${response.status}: ${text}`,
    );
  try {
    status = JSON.parse(text);
  } catch {
    throw new Error(`Xray returned an unreadable import status: ${text}`);
  }
  const state = String(status.status ?? status.state ?? "").toUpperCase();
  if (
    [
      "COMPLETED",
      "COMPLETE",
      "SUCCESS",
      "SUCCEEDED",
      "SUCCESSFUL",
      "DONE",
    ].includes(state)
  )
    break;
  if (["FAILED", "ERROR", "ABORTED"].includes(state))
    throw new Error(`Xray test import job failed: ${JSON.stringify(status)}`);
  if (attempt === 29)
    throw new Error(
      `Xray import job did not finish in time: ${JSON.stringify(status)}`,
    );
  await sleep(2000);
}

const resultPath = "test-results/qa/xray-identity-import-result.json";
await mkdir("test-results/qa", { recursive: true });
await writeFile(
  resultPath,
  `${JSON.stringify({ jobId, import: job, status }, null, 2)}\n`,
);
console.log(`Xray identity test import completed. Details: ${resultPath}`);
console.log(JSON.stringify(status, null, 2));
