/**
 * DSS Universe — Identity Compatibility Diagnostic
 * File: scripts/audit-auth-rest-metadata.cjs
 * Purpose: Characterizes built REST controller validation over loopback HTTP.
 * Architecture: Actual compiled controller/Nest pipe; presentation is a boundary double.
 * Important: No AppModule, database, credentials, sessions or mail are started.
 * This pins the pre-correction failure, not successful authentication acceptance.
 */
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");

async function main() {
  const apiRequire = createRequire(
    resolve(__dirname, "../apps/api/package.json"),
  );
  apiRequire("reflect-metadata");
  const { Module, ValidationPipe } = apiRequire("@nestjs/common");
  const { NestFactory } = apiRequire("@nestjs/core");
  const presentationPath = resolve(
    __dirname,
    "../apps/api/dist/src/composition/identity/application/authentication-presentation.service.js",
  );
  const controllerPath = resolve(
    __dirname,
    "../apps/api/dist/src/composition/identity/presentation/authentication.controller.js",
  );
  // Only the downstream service is doubled; decorator metadata is loaded as built.
  class AuthenticationPresentationService {}
  const previous = require.cache[presentationPath];
  require.cache[presentationPath] = {
    id: presentationPath,
    filename: presentationPath,
    loaded: true,
    exports: { AuthenticationPresentationService },
  };
  let app;
  try {
    const { AuthenticationController } = require(controllerPath);
    const calls = [];
    const presentation = Object.fromEntries(
      ["register", "login", "refresh"].map((method) => [
        method,
        async () => {
          calls.push(method);
          return { synthetic: true };
        },
      ]),
    );
    class DiagnosticModule {}
    Module({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationPresentationService, useValue: presentation },
      ],
    })(DiagnosticModule);
    app = await NestFactory.create(DiagnosticModule, { logger: false });
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const samples = {
      register: {
        email: "synthetic@dss.test",
        username: "synthetic",
        displayName: "Synthetic Pilot",
        password: "synthetic-password-123",
      },
      login: {
        email: "synthetic@dss.test",
        password: "synthetic-password-123",
      },
      refresh: { refreshToken: "synthetic-not-a-real-token" },
    };
    for (const [method, body] of Object.entries(samples)) {
      const metadata = Reflect.getMetadata(
        "design:paramtypes",
        AuthenticationController.prototype,
        method,
      );
      const response = await fetch(`${base}/api/auth/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      const result = await response.json();
      assert.equal(metadata[0], Function);
      assert.equal(response.status, 400);
      assert.deepEqual(result.message, [
        "an unknown value was passed to the validate function",
      ]);
      console.log(
        JSON.stringify({
          method,
          bodyMetatype: metadata[0].name,
          status: response.status,
        }),
      );
    }
    assert.deepEqual(calls, []);
    console.log(
      "Confirmed: three built-controller requests fail before presentation.",
    );
  } finally {
    await app?.close();
    delete require.cache[controllerPath];
    if (previous) require.cache[presentationPath] = previous;
    else delete require.cache[presentationPath];
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Diagnostic failed");
  process.exitCode = 1;
});
