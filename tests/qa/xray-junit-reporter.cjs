const fs = require("node:fs/promises");
const path = require("node:path");

const testKeys = {
  "CAT-01": "XSP1-74",
  "CAT-02": "XSP1-75",
  "CAT-03": "XSP1-76",
  "CAT-04": "XSP1-77",
  "DET-01": "XSP1-78",
  "DET-02": "XSP1-79",
  "DET-03": "XSP1-80",
  "DET-04": "XSP1-81",
  "IDN-01": "XSP1-83",
  "IDN-02": "XSP1-84",
  "IDN-03": "XSP1-85",
  "IDN-04": "XSP1-86",
};

const expectedStepCounts = {
  "CAT-01": 3,
  "CAT-02": 2,
  "CAT-03": 2,
  "CAT-04": 4,
  "DET-01": 2,
  "DET-02": 2,
  "DET-03": 2,
  "DET-04": 2,
  "IDN-01": 3,
  "IDN-02": 3,
  "IDN-03": 3,
  "IDN-04": 2,
};

const xml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );

async function toEvidence(attachment, prefix = "") {
  let body = attachment.body;
  if (!body && attachment.path) body = await fs.readFile(attachment.path);
  if (!body) return undefined;
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return {
    name: attachment.name,
    item: {
      filename: `${prefix}${path.basename(attachment.name)}`,
      contentType: attachment.contentType || "text/plain",
      data: buffer.toString("base64"),
    },
    xmlItem: {
      name: `${prefix}${path.basename(attachment.name)}${attachment.contentType === "image/png" ? ".png" : attachment.contentType === "application/json" ? ".json" : ".txt"}`,
      data: buffer.toString("base64"),
    },
  };
}

function collectTestSteps(steps, result = []) {
  for (const step of steps || []) {
    if (step.category === "test.step") result.push(step);
    collectTestSteps(step.steps, result);
  }
  return result;
}

function xrayStatus(status) {
  if (status === "passed") return "PASSED";
  if (["failed", "timedOut", "interrupted"].includes(status)) return "FAILED";
  return "TODO";
}

class XrayJunitReporter {
  constructor(options = {}) {
    this.junitPath = options.outputFile || "test-results/qa/xray-junit.xml";
    this.xrayJsonPath =
      options.xrayJsonFile || "test-results/qa/xray-execution.json";
    this.results = [];
  }

  async onTestEnd(test, result) {
    const title = test.title;
    const caseId = title.match(/\b(CAT-\d{2}|DET-\d{2}|IDN-\d{2})\b/)?.[1];
    if (!caseId || !testKeys[caseId]) return;

    const attachments = [];
    const attachmentRecords = new Map();
    let context = {};
    for (const attachment of result.attachments || []) {
      const record = await toEvidence(attachment, `${caseId}-`);
      if (!record) continue;
      attachments.push(record.xmlItem);
      attachmentRecords.set(attachment.name, record);
      if (attachment.name === "execution-context") {
        try {
          context = JSON.parse(
            Buffer.from(record.item.data, "base64").toString("utf8"),
          );
        } catch {
          /* keep empty context */
        }
      }
    }

    const playwrightSteps = collectTestSteps(result.steps);
    if (playwrightSteps.length > expectedStepCounts[caseId]) {
      throw new Error(
        `${caseId} has ${playwrightSteps.length} Playwright test.step blocks, but Xray has ${expectedStepCounts[caseId]} manual steps. Align them before importing.`,
      );
    }

    const xraySteps = [];
    const stepAttachmentNames = new Set();
    for (const step of playwrightSteps) {
      const stepEvidence = [];
      for (const attachment of step.attachments || []) {
        const record =
          attachmentRecords.get(attachment.name) ||
          (await toEvidence(attachment, `${caseId}-`));
        if (!record) continue;
        stepEvidence.push(record.item);
        stepAttachmentNames.add(attachment.name);
      }
      const status =
        result.status === "skipped" ? "TODO" : step.error ? "FAILED" : "PASSED";
      xraySteps.push({
        status,
        actualResult:
          status === "PASSED"
            ? `Playwright passed: ${step.title}`
            : status === "FAILED"
              ? `Playwright failed: ${step.error?.message || step.title}`
              : `Not executed: ${step.title}`,
        ...(stepEvidence.length ? { evidence: stepEvidence } : {}),
      });
    }

    while (xraySteps.length < expectedStepCounts[caseId]) {
      xraySteps.push({
        status: "TODO",
        actualResult:
          "Not executed because the Playwright test did not reach this step.",
      });
    }

    const globalEvidence = [];
    for (const attachment of result.attachments || []) {
      if (stepAttachmentNames.has(attachment.name)) continue;
      const record = attachmentRecords.get(attachment.name);
      if (record) globalEvidence.push(record.item);
    }
    const error = result.error?.message || result.error?.stack || "";
    const comment = `Playwright QA run | environment=${context.environment || "QA"} | origin=${context.origin || "http://localhost:8081"} | build=${context.reportedBuild?.build || "unknown"} | test=${caseId}`;

    this.results.push({
      caseId,
      testKey: testKeys[caseId],
      title,
      status: result.status,
      duration: Math.max(0, result.duration / 1000),
      error,
      context,
      attachments,
      globalEvidence,
      steps: xraySteps,
      comment,
      startedAt: result.startTime?.toISOString?.() || new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    });
  }

  async onEnd() {
    const passed = this.results.filter(
      (result) => result.status === "passed",
    ).length;
    const failed = this.results.filter((result) =>
      ["failed", "timedOut", "interrupted"].includes(result.status),
    ).length;
    const skipped = this.results.length - passed - failed;

    const junitCases = this.results
      .map((result) => {
        const props = [
          `<property name="test_key" value="${xml(result.testKey)}"/>`,
          `<property name="testrun_comment" value="${xml(result.comment)}"/>`,
          `<property name="testrun_evidence">${result.attachments.map((attachment) => `<item name="${xml(attachment.name)}">${attachment.data}</item>`).join("")}</property>`,
        ];
        const failure = ["failed", "timedOut", "interrupted"].includes(
          result.status,
        )
          ? `<failure message="${xml(result.error || result.status)}" type="${xml(result.status)}">${xml(result.error || result.status)}</failure>`
          : result.status === "skipped"
            ? "<skipped/>"
            : "";
        return `<testcase classname="NorthstarCommerce.QA" name="${xml(result.title)}" time="${result.duration.toFixed(3)}" started-at="${xml(result.startedAt)}" finished-at="${xml(result.finishedAt)}"><properties>${props.join("")}</properties>${failure}</testcase>`;
      })
      .join("");
    const junitSuite = `<testsuite name="Northstar Commerce Sprint 1 QA" tests="${this.results.length}" failures="${failed}" errors="0" skipped="${skipped}" time="${this.results.reduce((sum, result) => sum + result.duration, 0).toFixed(3)}">${junitCases}</testsuite>`;

    const xrayReport = {
      tests: this.results.map((result) => ({
        testKey: result.testKey,
        start: result.startedAt,
        finish: result.finishedAt,
        comment: result.comment,
        status: xrayStatus(result.status),
        steps: result.steps,
        ...(result.globalEvidence.length
          ? { evidence: result.globalEvidence }
          : {}),
      })),
    };

    await fs.mkdir(path.dirname(this.junitPath), { recursive: true });
    await fs.writeFile(
      this.junitPath,
      `<?xml version="1.0" encoding="UTF-8"?><testsuites tests="${this.results.length}" failures="${failed}" errors="0" skipped="${skipped}">${junitSuite}</testsuites>\n`,
    );
    await fs.writeFile(
      this.xrayJsonPath,
      `${JSON.stringify(xrayReport, null, 2)}\n`,
    );
    console.log(
      `Xray reports: ${this.junitPath} and ${this.xrayJsonPath} (${passed} passed, ${failed} failed, ${skipped} skipped)`,
    );
  }
}

module.exports = XrayJunitReporter;
