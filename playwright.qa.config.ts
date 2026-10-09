import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/qa",
  workers: 1,
  retries: 0,
  outputDir: "test-results/qa",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/qa", open: "never" }],
    [
      "./tests/qa/xray-junit-reporter.cjs",
      { outputFile: "test-results/qa/xray-junit.xml" },
    ],
  ],
  use: {
    baseURL: "http://localhost:8081",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
