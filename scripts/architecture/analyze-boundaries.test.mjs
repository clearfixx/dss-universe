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
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { analyzeBoundaries, compareBaseline } from "./analyze-boundaries.mjs";
import { findDependencyCycles } from "./find-dependency-cycles.mjs";

const path = "apps/api/src/modules/auth/application/login.ts";
const requireApi = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const {
  createSourceFile,
  ScriptTarget,
  isExportDeclaration,
  isNamedExports,
  forEachChild,
  isPropertyAccessExpression,
  isElementAccessExpression,
  isPropertyAssignment,
} = requireApi("typescript");

function directPrismaSurface(
  source,
  client = "this.prisma",
  trackEscape = true,
) {
  const tree = createSourceFile(
    "repository.ts",
    source,
    ScriptTarget.Latest,
    true,
  );
  const surface = new Set();
  function visit(node) {
    if (
      (isPropertyAccessExpression(node) || isElementAccessExpression(node)) &&
      node.expression.getText(tree) === client
    ) {
      surface.add(
        isPropertyAccessExpression(node)
          ? node.name.text
          : node.argumentExpression.getText(tree),
      );
    }
    if (
      trackEscape &&
      isPropertyAccessExpression(node) &&
      node.getText(tree) === "this.prisma" &&
      node.parent.expression !== node
    )
      surface.add("<escaped client>");
    forEachChild(node, visit);
  }
  visit(tree);
  return [...surface].sort();
}

test("bounded owned-storage characterization sees direct, computed and escaped Prisma access", () => {
  deepEqual(
    directPrismaSurface(
      "this.prisma.user.findUnique({}); this.prisma[model].count(); const alias = this.prisma;",
    ),
    ["<escaped client>", "model", "user"],
  );
});
for (const [file, expected] of [
  [
    "modules/content-access/infrastructure/repositories/prisma-content-gates.repository.ts",
    ["contentGate"],
  ],
  [
    "modules/users/infrastructure/repositories/prisma-user-wall.repository.ts",
    ["$transaction", "userWallPost"],
  ],
  [
    "modules/activity/infrastructure/repositories/prisma-activity.repository.ts",
    ["$transaction", "activityEntry", "activityFeedState"],
  ],
]) {
  test(
    "migrated repository keeps only owned direct Prisma delegates: " + file,
    () => {
      const source = readFileSync(
        new URL("../../apps/api/src/" + file, import.meta.url),
        "utf8",
      );
      deepEqual(directPrismaSurface(source), expected);
    },
  );
}

for (const [file, expected, forbiddenRelations] of [
  [
    "modules/news/infrastructure/repositories/prisma-news-delivery.repository.ts",
    ["newsArticle"],
    ["author", "actor", "interactionTarget", "reactionTarget", "user"],
  ],
  [
    "modules/users/infrastructure/repositories/prisma-public-profile.reader.ts",
    ["user"],
    [],
  ],
  [
    "modules/interactions/infrastructure/repositories/prisma-interaction-delivery.reader.ts",
    ["comment", "interactionShare", "interactionTarget", "reaction"],
    ["author", "actor", "user"],
  ],
]) {
  test(
    "snapshot adapter reads only owned delegates and relations: " + file,
    () => {
      const source = readFileSync(
        new URL("../../apps/api/src/" + file, import.meta.url),
        "utf8",
      );
      deepEqual(directPrismaSurface(source), []);
      deepEqual(directPrismaSurface(source, "transaction", false), expected);
      const tree = createSourceFile(file, source, ScriptTarget.Latest, true);
      const relationNames = [];
      function visit(node) {
        if (
          isPropertyAssignment(node) &&
          forbiddenRelations.includes(node.name.getText(tree))
        )
          relationNames.push(node.name.getText(tree));
        forEachChild(node, visit);
      }
      visit(tree);
      deepEqual(relationNames, []);
    },
  );
}
test("News read composition coordinates adapters without moving owner SQL into root", () => {
  const source = readFileSync(
    new URL(
      "../../apps/api/src/composition/news-delivery/infrastructure/prisma-news-delivery.read-unit.ts",
      import.meta.url,
    ),
    "utf8",
  );
  deepEqual(directPrismaSurface(source), ["$transaction", "<escaped client>"]);
  deepEqual(directPrismaSurface(source, "transaction", false), []);
});

for (const [moduleName, expected] of [
  [
    "activity",
    [
      "ActivityModule",
      "ACTIVITY_VIEWER_CONTEXT",
      "ActivityViewerContextReader",
      "ActivityViewerContext",
      "ACTOR_ACTIVITY_READER",
      "ActorActivityReader",
      "ActorActivitySummary",
    ],
  ],
  [
    "editor",
    [
      "EditorModule",
      "EDITOR_SEARCH_BATCH_PROJECTOR",
      "EditorSearchBatchProjector",
      "EDITOR_GATE_DECISION_SCOPES",
      "EditorGateDecisionScope",
      "EditorGateDecisionScopes",
      "EDITOR_SEARCH_PROJECTOR",
      "EditorSearchProjector",
      "EDITOR_VIEWER_DOCUMENT_PROJECTOR",
      "EditorViewerDocumentProjector",
      "EDITOR_DOCUMENT_NORMALIZER",
      "EditorDocumentNormalizer",
      "ValidatedEditorDocument",
      "EDITOR_GATE_DECISIONS",
      "EditorGateDecisions",
      "EditorGateDecision",
      "EditorGateRequirement",
    ],
  ],
  [
    "content-access",
    [
      "ContentAccessModule",
      "CONTENT_GATE_DECISION_SCOPES",
      "ContentGateDecisionScope",
      "ContentGateDecisionScopes",
      "CONTENT_GATE_DECISIONS",
      "ContentGateDecisions",
      "ContentGateDecision",
      "ContentGateRequirementKind",
      "CONTENT_AUDIENCE_READER",
      "ContentAudienceReader",
      "GATE_ACCOUNT_EVIDENCE",
      "GateAccountEvidenceReader",
      "GateAccountEvidence",
      "GATE_COMMENT_COUNT",
      "GateCommentCountReader",
      "GATE_REPUTATION_TOTAL",
      "GateReputationTotalReader",
    ],
  ],
  [
    "reputation",
    [
      "ReputationModule",
      "REPUTATION_TOTAL_READER",
      "ReputationTotalReader",
      "REPUTATION_ACCOUNT_READER",
      "ReputationAccountReader",
      "ReputationAccountEvidence",
      "REPUTATION_BLOCK_READER",
      "ReputationBlockReader",
      "REPUTATION_PROFILE_EXISTENCE",
      "ReputationProfileExistence",
    ],
  ],
  [
    "media",
    [
      "MediaModule",
      "MEDIA_PUBLIC_ATTACHMENT_READER",
      "MediaPublicAttachmentReader",
      "MediaPublicAttachment",
      "MediaPublicAttachmentQuery",
      "MEDIA_IMAGE_ELIGIBILITY",
      "MediaImageEligibility",
      "MEDIA_PROFILE_ASSET_COMMANDS",
      "MediaProfileAssetCommands",
      "PROFILE_ASSET_TRANSACTION",
      "ProfileAssetTransaction",
      "ProfileAssetAssignment",
      "ProfileAssetSlot",
      "MEDIA_PUBLICATION_EVIDENCE",
      "MediaPublicationEvidenceReader",
      "MediaPublicationEvidence",
    ],
  ],
  [
    "users",
    [
      "UsersModule",
      "USER_ACTIVITY_CONTEXT_READER",
      "UserActivityContextReader",
      "UserActivityContext",
      "WALL_IMAGE_ELIGIBILITY",
      "WallImageEligibility",
      "PROFILE_EXISTENCE_READER",
      "ProfileExistenceReader",
      "VIEWER_PROFILE_READER",
      "ViewerProfileReader",
      "ViewerProfile",
      "PROFILE_DISPLAY_READER",
      "ProfileDisplayReader",
      "USER_ERRORS",
      "PROFILE_GROUP_DISPLAY",
      "ProfileGroupDisplayReader",
      "ProfileGroupDisplay",
      "USER_BLOCK_DECISIONS",
      "UserBlockDecisionReader",
      "PROFILE_WALL_INTERACTION_KIND",
      "PROFILE_WALL_TRANSACTION",
      "ProfileWallTransaction",
      "ProfileWallWriteResult",
      "CreateUserWallPost",
      "PROFILE_WALL_INTERACTION_DECISIONS",
      "ProfileWallInteractionDecisions",
      "ProfileWallInteractionRequest",
      "ProfileWallInteractionDecision",
      "PROFILE_ACTIVITY_READER",
      "ProfileActivityReader",
      "ProfileActivityItem",
    ],
  ],
  [
    "community-points",
    [
      "CommunityPointsModule",
      "COMMUNITY_POINTS_BALANCE_READER",
      "CommunityPointsBalanceReader",
      "POINTS_RECIPIENT_EXISTENCE",
      "PointsRecipientExistence",
    ],
  ],
  [
    "levels",
    [
      "LevelsModule",
      "LEVEL_RECIPIENT_EXISTENCE",
      "LevelRecipientExistence",
      "LEVEL_POINTS_BALANCE_READER",
      "LevelPointsBalanceReader",
    ],
  ],
  [
    "achievements",
    [
      "AchievementsModule",
      "ACHIEVEMENT_RECIPIENT_EXISTENCE",
      "AchievementRecipientExistence",
    ],
  ],
  [
    "iam",
    [
      "IamModule",
      "REGISTRATION_ROLE_NAME",
      "IAM_ACCESS_MEMBERSHIPS",
      "IamAccessMembershipReader",
      "GROUP_MANAGEMENT_AUTHORITY",
      "GroupManagementAuthority",
      "IAM_PUBLIC_GROUP_DISPLAY",
      "IamPublicGroupDisplayReader",
      "PublicAccessGroup",
    ],
  ],
  [
    "auth",
    [
      "AuthModule",
      "ACCESS_TOKEN_ISSUER",
      "AccessTokenIssuer",
      "TokenSubject",
      "AUTHENTICATION_FLOWS",
      "AuthenticationFlows",
      "AuthenticationResult",
      "LoginCredentials",
      "CredentialSubjectStore",
      "AuthClient",
      "AUTH_ERRORS",
      "AUTH_SUBJECT_ELIGIBILITY",
      "AuthSubjectEligibility",
      "AUTH_ACCOUNT_EVIDENCE",
      "AuthAccountEvidenceReader",
      "AuthAccountEvidence",
    ],
  ],
]) {
  test(`${moduleName} publishes only the approved named integration contracts`, () => {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/modules/${moduleName}/index.ts`,
        import.meta.url,
      ),
      "utf8",
    );
    const ast = createSourceFile("index.ts", source, ScriptTarget.Latest, true);
    const names = [];
    for (const statement of ast.statements) {
      if (!isExportDeclaration(statement)) continue;
      ok(
        statement.exportClause && isNamedExports(statement.exportClause),
        "wildcard and namespace exports are forbidden",
      );
      names.push(
        ...statement.exportClause.elements.map((element) => element.name.text),
      );
    }
    deepEqual(names.sort(), [...expected].sort());
  });
}
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

for (const file of [
  "apps/api/src/modules/news/application/service.ts",
  "apps/api/src/modules/news/infrastructure/repository.ts",
  "apps/api/src/modules/interactions/application/service.ts",
  "apps/api/src/composition/unsafe/application/service.ts",
  "apps/api/src/composition/unsafe/application/unsafe.module.ts",
]) {
  test(`technical persistence entry is forbidden in ${file}`, () => {
    ok(
      analyzeBoundaries([
        {
          path: file,
          source:
            "import { PrismaInteractionTargetWriter } from '@api/modules/interactions/infrastructure';",
        },
      ]).some(({ rule }) => rule === "infrastructure-entry-business-import"),
    );
  });
}
for (const file of [
  "apps/api/src/composition/content-targets/infrastructure/unit.ts",
  "apps/api/src/composition/content-targets/content-target-composition.module.ts",
  "apps/api/src/modules/interactions/infrastructure/repository.ts",
]) {
  test(`technical persistence entry is allowed only for owned/root infrastructure: ${file}`, () => {
    deepEqual(
      analyzeBoundaries([
        {
          path: file,
          source:
            "import { PrismaInteractionTargetWriter } from '@api/modules/interactions/infrastructure';",
        },
      ]),
      [],
    );
  });
}
