/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Compatibility Diagnostic
 * 📄 File: scripts/audit-auth-rest-metadata.cjs
 * 🎯 Purpose: Verifies built REST DTO validation over loopback HTTP.
 * 🧠 Responsibilities: checks concrete metadata, valid dispatch and invalid-input rejection.
 * 🏗️ Architecture: Actual compiled controller/Nest pipe; downstream presentation is doubled.
 * ⚠️ Important: No AppModule, database, credentials, sessions or mail are started.
 * This proves validation/dispatch, not successful real authentication.
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
        async (input) => {
          calls.push({ method, input });
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
    const expectedNames = {
      register: "RegisterDto",
      login: "LoginDto",
      refresh: "RefreshTokenDto",
    };
    async function send(method, body) {
      const response = await fetch(`${base}/api/auth/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      return { status: response.status, body: await response.json() };
    }
    for (const [method, body] of Object.entries(samples)) {
      const metadata = Reflect.getMetadata(
        "design:paramtypes",
        AuthenticationController.prototype,
        method,
      );
      assert.equal(metadata[0].name, expectedNames[method]);
      const response = await send(method, { ...body, unexpected: "discard" });
      assert.equal(response.status, 201);
      assert.deepEqual(response.body, { synthetic: true });
      assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).input)), body);
      assert.equal(Object.hasOwn(calls.at(-1).input, "unexpected"), false);
      console.log(
        JSON.stringify({
          method,
          bodyMetatype: metadata[0].name,
          status: response.status,
        }),
      );
    }
    const { displayName: _omitted, ...withoutName } = samples.register;
    assert.equal((await send("register", withoutName)).status, 201);
    assert.deepEqual(
      JSON.parse(JSON.stringify(calls.at(-1).input)),
      withoutName,
    );
    assert.equal((await send("refresh", { refreshToken: "" })).status, 201);
    const accepted = calls.length;
    const invalid = [
      ...[null, "", "   ", 42].map((displayName) => [
        "register",
        { ...samples.register, displayName },
      ]),
      ["register", { ...samples.register, email: "invalid" }],
      ["register", { ...samples.register, username: "" }],
      ["register", { ...samples.register, password: "short" }],
      ["login", { ...samples.login, twoFactorCode: "invalid" }],
      ["login", { ...samples.login, password: 42 }],
      ["refresh", {}],
      ["refresh", { refreshToken: 42 }],
    ];
    for (const [method, body] of invalid) {
      assert.equal((await send(method, body)).status, 400);
      assert.equal(calls.length, accepted);
    }
    console.log(
      JSON.stringify({
        validDispatches: accepted,
        invalidRejectedBeforePresentation: invalid.length,
      }),
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
