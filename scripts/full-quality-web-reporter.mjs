/**
 * DSS Universe — Full Quality Web report
 * File: scripts/full-quality-web-reporter.mjs
 * Purpose: Reject empty, skipped, flaky or incomplete browser smoke runs.
 */
import { writeFileSync } from "node:fs";

export default class FullQualityWebReporter {
  tests = [];

  onBegin(_config, suite) {
    this.tests = suite.allTests();
  }

  onEnd(result) {
    const complete =
      result.status === "passed" &&
      this.tests.length > 0 &&
      this.tests.every(
        (test) =>
          test.expectedStatus === "passed" &&
          test.results.length === 1 &&
          test.results[0].status === "passed",
      );
    if (process.env.DSS_QUALITY_WEB_REPORT) {
      writeFileSync(
        process.env.DSS_QUALITY_WEB_REPORT,
        JSON.stringify({
          status: complete ? "passed" : "failed",
          tests: this.tests.length,
        }),
      );
    }
    if (!complete) {
      console.error(
        "Full Web smoke requires non-empty results without skips, expected failures or retries.",
      );
      return { status: "failed" };
    }
  }
}
