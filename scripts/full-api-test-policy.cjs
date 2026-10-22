/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Full API Verification
 * 📄 File: scripts/full-api-test-policy.cjs
 * 🎯 Purpose: Defines the explicit disposable-service test profile and rejects incomplete results.
 * ⚠️ Important: Never logs connection strings or weakens test assertions.
 * ===============================================================
 */
const optIns = [
  "RUN_IAM_DB_TESTS",
  "RUN_AUTH_DB_TESTS",
  "RUN_RECOVERY_DB_TESTS",
  "RUN_AUTH_REDIS_TESTS",
];

function createFullTestEnvironment(env) {
  let database;
  try {
    database = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new Error("Full tests require an explicit disposable DATABASE_URL.");
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) ||
    database.pathname !== "/dss_test" ||
    database.username !== "dss_test"
  ) {
    throw new Error(
      "Full tests require the loopback disposable dss_test database.",
    );
  }
  const redisPort = env.TEST_REDIS_PORT ?? env.REDIS_PORT ?? "6380";
  if (
    !/^\d+$/.test(redisPort) ||
    Number(redisPort) < 1 ||
    Number(redisPort) > 65535
  ) {
    throw new Error("Full tests require a valid TEST_REDIS_PORT.");
  }
  return {
    ...env,
    NODE_ENV: "test",
    TEST_REDIS_PORT: redisPort,
    DSS_REQUIRE_FULL_API_TESTS: "1",
    ...Object.fromEntries(optIns.map((key) => [key, "1"])),
  };
}

function assertFullApiTestResults(results, env) {
  if (env.DSS_REQUIRE_FULL_API_TESTS !== "1") return results;
  for (const key of optIns) {
    if (env[key] !== "1")
      throw new Error(`Full API profile lost required opt-in: ${key}`);
  }
  const zeroFields = [
    "numFailedTests",
    "numFailedTestSuites",
    "numRuntimeErrorTestSuites",
    "numPendingTests",
    "numPendingTestSuites",
    "numTodoTests",
  ];
  if (
    results.success !== true ||
    !Number.isInteger(results.numTotalTests) ||
    results.numTotalTests <= 0 ||
    !Number.isInteger(results.numTotalTestSuites) ||
    results.numTotalTestSuites <= 0 ||
    results.numPassedTestSuites !== results.numTotalTestSuites ||
    results.numPassedTests !== results.numTotalTests ||
    zeroFields.some((key) => results[key] !== 0)
  ) {
    throw new Error(
      "Full API tests require successful non-empty results with no failures or skipped/todo tests.",
    );
  }
  return results;
}

function processFullApiTestResults(results) {
  return assertFullApiTestResults(results, process.env);
}

module.exports = processFullApiTestResults;
module.exports.createFullTestEnvironment = createFullTestEnvironment;
module.exports.assertFullApiTestResults = assertFullApiTestResults;
