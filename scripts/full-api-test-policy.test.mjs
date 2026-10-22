/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Full API Verification Tests
 * 📄 File: scripts/full-api-test-policy.test.mjs
 * 🎯 Purpose: Pins explicit env hashing scope and fail-closed full-profile results.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import policy from "./full-api-test-policy.cjs";

const { createFullTestEnvironment, assertFullApiTestResults } = policy;
const profile = createFullTestEnvironment({
  DATABASE_URL:
    "postgresql://dss_test:synthetic-secret@127.0.0.1:5434/dss_test",
  REDIS_PORT: "6380",
});
const passed = {
  success: true,
  numTotalTests: 3,
  numPassedTests: 3,
  numTotalTestSuites: 1,
  numPassedTestSuites: 1,
  numFailedTests: 0,
  numFailedTestSuites: 0,
  numRuntimeErrorTestSuites: 0,
  numPendingTests: 0,
  numPendingTestSuites: 0,
  numTodoTests: 0,
};

test("full profile enables all opt-ins and preserves an explicit disposable endpoint", () => {
  assert.equal(profile.NODE_ENV, "test");
  assert.equal(profile.TEST_REDIS_PORT, "6380");
  assert.equal(profile.DSS_REQUIRE_FULL_API_TESTS, "1");
  for (const key of [
    "RUN_IAM_DB_TESTS",
    "RUN_AUTH_DB_TESTS",
    "RUN_RECOVERY_DB_TESTS",
    "RUN_AUTH_REDIS_TESTS",
  ])
    assert.equal(profile[key], "1");
});
for (const DATABASE_URL of [
  undefined,
  "invalid",
  "https://example.com",
  "postgresql://dss_test:secret@remote/dss_test",
  "postgresql://dss:secret@127.0.0.1/dss",
  "postgresql://dss_test:secret@127.0.0.1/production",
]) {
  test(`rejects non-disposable endpoint case ${String(DATABASE_URL).slice(0, 12)}`, () => {
    assert.throws(
      () => createFullTestEnvironment({ DATABASE_URL }),
      (error) => !error.message.includes("secret"),
    );
  });
}
test("rejects invalid Redis ports", () => {
  for (const TEST_REDIS_PORT of ["invalid", "0", "65536", "1.5"])
    assert.throws(() =>
      createFullTestEnvironment({ ...profile, TEST_REDIS_PORT }),
    );
});
test("normal partial developer results are not forced into full-profile policy", () => {
  assert.equal(assertFullApiTestResults({ success: false }, {}).success, false);
});
test("valid full results are returned unmodified", () => {
  assert.equal(assertFullApiTestResults(passed, profile), passed);
});
for (const key of [
  "RUN_IAM_DB_TESTS",
  "RUN_AUTH_DB_TESTS",
  "RUN_RECOVERY_DB_TESTS",
  "RUN_AUTH_REDIS_TESTS",
]) {
  test(`lost ${key} fails even when the selected tests pass`, () => {
    assert.throws(
      () => assertFullApiTestResults(passed, { ...profile, [key]: undefined }),
      /lost required opt-in/,
    );
  });
}
for (const patch of [
  { success: false },
  { numPendingTests: 1 },
  { numPendingTestSuites: 1 },
  { numTodoTests: 1 },
  { numFailedTests: 1 },
  { numFailedTestSuites: 1 },
  { numRuntimeErrorTestSuites: 1 },
  { numPassedTests: 2 },
  { numTotalTests: 0, numPassedTests: 0 },
  { numPendingTests: undefined },
  { numTotalTestSuites: 0, numPassedTestSuites: 0 },
  { numPassedTestSuites: 0 },
]) {
  test(`rejects incomplete or inconsistent result ${JSON.stringify(patch)}`, () => {
    assert.throws(
      () => assertFullApiTestResults({ ...passed, ...patch }, profile),
      /require successful non-empty/,
    );
  });
}
test("API test env is hashed explicitly and never globally exposed", () => {
  const config = JSON.parse(
    readFileSync(new URL("../turbo.json", import.meta.url), "utf8"),
  );
  for (const task of ["test", "test:unit", "test:cov"]) {
    const env = config.tasks[`@dss/api#${task}`].env;
    assert.deepEqual(
      config.tasks[`@dss/api#${task}`].dependsOn,
      config.tasks[task].dependsOn,
    );
    assert.deepEqual(
      config.tasks[`@dss/api#${task}`].outputs,
      config.tasks[task].outputs,
    );
    assert.equal(new Set(env).size, env.length);
    for (const key of [
      "DATABASE_URL",
      "TEST_REDIS_PORT",
      "RUN_IAM_DB_TESTS",
      "RUN_AUTH_DB_TESTS",
      "RUN_RECOVERY_DB_TESTS",
      "RUN_AUTH_REDIS_TESTS",
      "DSS_REQUIRE_FULL_API_TESTS",
    ])
      assert.ok(env.includes(key));
    assert.equal(config.tasks[task].env, undefined);
  }
  assert.equal(config.globalEnv, undefined);
  assert.equal(config.globalPassThroughEnv, undefined);
});
