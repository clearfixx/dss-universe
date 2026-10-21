/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Dependency Security Verification
 * 📄 File: scripts/check-dependency-security.test.mjs
 * 🎯 Purpose: Pins the owner exception without allowing other high/critical findings.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAudit } from "./check-dependency-security.mjs";

const braces = {
  github_advisory_id: "GHSA-vfj7-8cjw-p6xm",
  module_name: "braces",
  severity: "high",
  findings: [{ version: "3.0.3" }],
};
function report(advisories) {
  return {
    advisories: Object.fromEntries(
      advisories.map((value, index) => [index, value]),
    ),
    metadata: {
      vulnerabilities: {
        high: advisories.filter((value) => value.severity === "high").length,
        critical: advisories.filter((value) => value.severity === "critical")
          .length,
      },
    },
  };
}
test("only verified exact braces advisory is excepted", () => {
  assert.equal(evaluateAudit(report([braces]), true).exceptions.length, 1);
  assert.equal(evaluateAudit(report([braces]), false).blocking.length, 1);
});
for (const change of [
  { github_advisory_id: "GHSA-another" },
  { module_name: "other" },
  { severity: "critical" },
  { findings: [{ version: "3.0.2" }] },
  { findings: [] },
  { findings: [{ version: "3.0.3" }, { version: "3.0.2" }] },
])
  test(`rejects changed advisory ${JSON.stringify(change)}`, () => {
    assert.equal(
      evaluateAudit(report([{ ...braces, ...change }]), true).blocking.length,
      1,
    );
  });
test("other high finding blocks even with braces exception", () => {
  const result = evaluateAudit(
    report([braces, { ...braces, module_name: "vite" }]),
    true,
  );
  assert.equal(result.exceptions.length, 1);
  assert.equal(result.blocking.length, 1);
});
test("empty audit succeeds but missing evidence and inconsistent totals fail", () => {
  assert.equal(evaluateAudit(report([]), true).blocking.length, 0);
  for (const invalid of [
    null,
    {},
    { error: "registry" },
    {
      ...report([braces]),
      metadata: { vulnerabilities: { high: 0, critical: 0 } },
    },
  ])
    assert.throws(() => evaluateAudit(invalid, true));
});
