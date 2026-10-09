import { mkdir, writeFile } from "node:fs/promises";

const clientId = process.env.XRAY_CLIENT_ID;
const clientSecret = process.env.XRAY_CLIENT_SECRET;
if (!clientId || !clientSecret)
  throw new Error("Xray API credentials are required for verification.");
const executionKey = process.env.XRAY_EXECUTION_KEY || "XSP1-82";
const baseUrl = "https://xray.cloud.getxray.app/api/v2";
const auth = await fetch(`${baseUrl}/authenticate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
});
if (!auth.ok)
  throw new Error(`Xray authentication failed with HTTP ${auth.status}.`);
const token = await auth.json();
const query = `query { getTestExecutions(jql: "key = ${executionKey}", limit: 1) { total results { issueId jira(fields: ["key"]) testRuns(limit: 100) { total results { status { name } steps { status { name } } test { issueId jira(fields: ["key"]) } } } } } }`;
const response = await fetch(`${baseUrl}/graphql`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});
const body = await response.json();
if (!response.ok || body.errors?.length)
  throw new Error(
    `Xray execution verification failed: ${JSON.stringify(body)}`,
  );
const execution = body.data?.getTestExecutions?.results?.[0];
if (!execution)
  throw new Error(`Could not find Xray execution ${executionKey}.`);
const runs = execution.testRuns.results;
const steps = runs.flatMap((run) => run.steps || []);
const counts = (items) =>
  items.reduce((result, item) => {
    const status = item.status?.name || "UNKNOWN";
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
const report = {
  executionKey,
  issueId: execution.issueId,
  testRunTotal: execution.testRuns.total,
  testRunStatuses: counts(runs),
  stepTotal: steps.length,
  stepStatuses: counts(steps),
  testKeys: runs
    .map((run) => run.test?.jira?.key)
    .filter(Boolean)
    .sort(),
};
await mkdir("test-results/qa", { recursive: true });
await writeFile(
  "test-results/qa/xray-execution-verification.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (
  report.testRunTotal !== 12 ||
  report.testRunStatuses.PASSED !== 12 ||
  report.stepTotal !== 30 ||
  report.stepStatuses.PASSED !== 30
) {
  throw new Error(
    "Xray execution does not yet show 12 passing tests and 30 passing steps.",
  );
}
