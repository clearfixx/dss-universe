/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Architecture Tooling
 * 📄 File: scripts/architecture/analyze-boundaries.test.mjs
 *
 * 🎯 Purpose:
 * Verifies forbidden and allowed dependency fixtures and inventory drift.
 *
 * 🧠 Responsibilities:
 * • exercises AST dependency extraction without production filesystem mutations;
 * • checks deterministic cycle reporting and stable baseline comparison.
 *
 * 🏗️ Architecture:
 * Node test fixtures consume the pure analyzer; no application behavior is changed.
 *
 * ⚠️ Important:
 * Passing fixtures validate these rules, not complete application isolation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { test } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeBoundaries, compareBaseline } from "./analyze-boundaries.mjs";
import { findDependencyCycles } from "./find-dependency-cycles.mjs";

const path = "apps/api/src/modules/auth/application/login.ts";
const analyze = (source, file = path) =>
  analyzeBoundaries([{ path: file, source }]);
const rules = (source, file) =>
  analyze(source, file).map((finding) => finding.rule);

for (const specifier of [
  "@api/modules/users/domain/repository",
  "../../users/domain/repository",
]) {
  test(`foreign private dependency: ${specifier}`, () => {
    ok(
      rules(`import type { Repository } from '${specifier}';`).includes(
        "foreign-private-import",
      ),
    );
  });
}
test("Windows source paths normalize to the same identity", () => {
  deepEqual(
    analyze("import '@api/modules/users/private';", path.replaceAll("/", "\\")),
    analyze("import '@api/modules/users/private';"),
  );
});
for (const source of [
  "import type { User } from '@prisma/client';",
  "export type { User } from '@prisma/client';",
  "type User = import('@prisma/client').User;",
  "import Prisma = require('@prisma/client');",
  "const prisma = require('@prisma/client');",
  "const prisma = import('@prisma/client');",
  "import { PrismaService } from '@api/core/database/prisma.service';",
]) {
  test(`persistence is detected: ${source}`, () => {
    ok(rules(source).includes("persistence-outside-infrastructure"));
    equal(compareBaseline(analyze(source), []).added.length > 0, true);
  });
}
test("database-like folder names do not produce persistence false positives", () => {
  deepEqual(rules("import { Value } from '@api/core/database-tools';"), []);
});
test("renaming a foreign service does not hide its original symbol", () => {
  ok(
    rules(
      "import { UsersService as Lookup } from '@api/modules/users';",
    ).includes("foreign-concrete-service"),
  );
});
test("re-exported foreign mapper remains concrete coupling", () => {
  ok(
    rules(
      "export { UserMapper as Mapper } from '@api/modules/users';",
    ).includes("foreign-concrete-service"),
  );
});
test("domain cannot depend on an outer layer", () => {
  ok(
    rules(
      "import { X } from '../application/use-case';",
      "apps/api/src/modules/auth/domain/value.ts",
    ).includes("domain-outer-layer"),
  );
});
test("core cannot depend on a feature", () => {
  ok(
    rules(
      "import { UsersModule } from '@api/modules/users';",
      "apps/api/src/core/example.ts",
    ).includes("core-feature-import"),
  );
});
for (const source of [
  "export * from './owned';",
  "export * as Owned from './owned';",
]) {
  test(`wildcard exports are visible: ${source}`, () => {
    ok(rules(source).includes("wildcard-export"));
  });
}
test("namespace imports are visible", () => {
  ok(rules("import * as Owned from './owned';").includes("namespace-import"));
});
test("root concrete exports are visible even when renamed", () => {
  ok(
    rules(
      "export { UsersService as Lookup } from './application/service';",
      "apps/api/src/modules/users/index.ts",
    ).includes("concrete-public-export"),
  );
});
test("owned ports, infrastructure persistence and composition wiring are allowed", () => {
  deepEqual(
    analyzeBoundaries([
      {
        path,
        source:
          "import type { CredentialsPort } from '../domain/credentials.port';",
      },
      {
        path: "apps/api/src/modules/auth/infrastructure/repository.ts",
        source: "import type { User } from '@prisma/client';",
      },
      {
        path: "apps/api/src/modules/auth/auth.module.ts",
        source: "import { UsersModule } from '../users/users.module';",
      },
      {
        path: "apps/api/src/modules/auth/index.ts",
        source: "export { AuthModule } from './auth.module';",
      },
    ]),
    [],
  );
});
test("composition exception is not permission to inject foreign concrete services", () => {
  ok(
    rules(
      "import { UsersService } from '../users';",
      "apps/api/src/modules/auth/auth.module.ts",
    ).includes("foreign-concrete-service"),
  );
});
test("comments and strings are not dependencies", () => {
  deepEqual(
    rules(
      "// import { X } from '@prisma/client';\nconst text = \"export * from './x';\";",
    ),
    [],
  );
});
test("test and declaration files are outside the production inventory", () => {
  for (const file of ["login.spec.ts", "login.test.ts", "login.d.ts"]) {
    deepEqual(
      rules("import '@prisma/client';", `apps/api/src/modules/auth/${file}`),
      [],
    );
  }
});
test("unparsed and nonliteral dependencies are visible rather than skipped", () => {
  ok(rules("import { broken").includes("parse-error"));
  ok(
    rules("import(path); require(path);").includes("unresolved-dynamic-import"),
  );
});
test("cycles are strongly connected groups, not invented path order", () => {
  const files = [
    {
      path: "apps/api/src/modules/a/index.ts",
      source: "import '@api/modules/b';",
    },
    {
      path: "apps/api/src/modules/b/index.ts",
      source: "import type { C } from '@api/modules/c';",
    },
    {
      path: "apps/api/src/modules/c/index.ts",
      source: "export { A } from '@api/modules/a';",
    },
  ];
  deepEqual(
    analyzeBoundaries(files).map(({ rule, detail }) => ({ rule, detail })),
    [{ rule: "module-cycle", detail: "strongly connected group: a, b, c" }],
  );
  deepEqual(analyzeBoundaries(files.toReversed()), analyzeBoundaries(files));
});
test("Tarjan handles acyclic graphs, separate groups and self-loops", () => {
  deepEqual(findDependencyCycles(new Map([["a", new Set(["b"])]])), []);
  deepEqual(
    findDependencyCycles(
      new Map([
        ["a", new Set(["b"])],
        ["b", new Set(["a"])],
        ["c", new Set(["c"])],
      ]),
    ),
    [["a", "b"], ["c"]],
  );
});
test("baseline identities ignore line offsets and deduplicate repeated edges", () => {
  const source = "import '@prisma/client';";
  const baseline = analyze(source);
  deepEqual(analyze(`\n// comment\n${source}\n${source}`), baseline);
  deepEqual(compareBaseline(baseline, baseline), { added: [], removed: [] });
  deepEqual(compareBaseline([], baseline), { added: [], removed: baseline });
  deepEqual(compareBaseline(baseline, []), { added: baseline, removed: [] });
});
test("CLI rejects unsupported arguments", () => {
  const cli = fileURLToPath(
    new URL("./report-boundaries.mjs", import.meta.url),
  );
  const result = spawnSync(process.execPath, [cli, "--accept-all"], {
    encoding: "utf8",
  });
  equal(result.status, 1);
  ok(result.stderr.includes("Unknown argument"));
});
