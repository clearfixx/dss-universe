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
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
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
  isImportDeclaration,
  isImportTypeNode,
  isLiteralTypeNode,
  isStringLiteralLike,
  isCallExpression,
  isIdentifier,
  isVariableStatement,
  SyntaxKind,
} = requireApi("typescript");

test("Media has no unused domain aggregation entry", () => {
  equal(
    existsSync(
      new URL(
        "../../apps/api/src/modules/media/domain/index.ts",
        import.meta.url,
      ),
    ),
    false,
  );
});

test("Media retains all seventeen former aggregation targets", () => {
  for (const target of [
    "entities/media.entity",
    "enums/media-kind.enum",
    "enums/media-status.enum",
    "enums/media-storage-provider.enum",
    "enums/media-upload-status.enum",
    "enums/media-visibility.enum",
    "repositories/media.repository.interface",
    "types/create-media.input",
    "types/media-dimensions.type",
    "types/media-reference.type",
    "types/media-upload-session.type",
    "types/media-upload-policy.type",
    "types/media-variant.type",
    "types/media-metadata.type",
    "exceptions/media-upload-policy.exception",
    "repositories/media-upload-session.repository.interface",
    "types/update-media.input",
  ])
    ok(
      existsSync(
        new URL(
          `../../apps/api/src/modules/media/domain/${target}.ts`,
          import.meta.url,
        ),
      ),
      target,
    );
});

for (const entry of [
  { name: "Media domain", path: "apps/api/src/modules/media/domain" },
  { name: "Core aggregate", path: "apps/api/src/core" },
])
  test(`tracked source has no literal import of the removed ${entry.name} entry`, () => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    const tracked = spawnSync(
      "git",
      ["ls-files", "*.ts", "*.tsx", "*.mts", "*.cts", "*.js", "*.mjs", "*.cjs"],
      { cwd: root, encoding: "utf8" },
    );
    equal(tracked.status, 0, tracked.stderr);
    const references = [];
    const target = resolve(root, entry.path);
    for (const file of tracked.stdout.trim().split(/\r?\n/)) {
      if (
        !/^(apps|packages|scripts)\//.test(file) ||
        !existsSync(resolve(root, file))
      )
        continue;
      const source = createSourceFile(
        file,
        readFileSync(resolve(root, file), "utf8"),
        ScriptTarget.Latest,
        true,
      );
      const inspect = (literal) => {
        if (!literal || !isStringLiteralLike(literal)) return;
        const specifier = literal.text;
        const candidate = specifier.startsWith("@api/")
          ? resolve(root, "apps/api/src", specifier.slice(5))
          : specifier.startsWith(".")
            ? resolve(root, dirname(file), specifier)
            : "";
        if (
          candidate
            .replace(/\.(?:[cm]?[jt]sx?)$/, "")
            .replace(/[\\/]index$/, "") === target
        )
          references.push(file + ": " + specifier);
      };
      const visit = (node) => {
        if (isImportDeclaration(node) || isExportDeclaration(node))
          inspect(node.moduleSpecifier);
        if (isImportTypeNode(node) && isLiteralTypeNode(node.argument))
          inspect(node.argument.literal);
        if (
          isCallExpression(node) &&
          (node.expression.kind === SyntaxKind.ImportKeyword ||
            (isIdentifier(node.expression) &&
              node.expression.text === "require") ||
            (isPropertyAccessExpression(node.expression) &&
              isIdentifier(node.expression.expression) &&
              node.expression.expression.text === "require" &&
              node.expression.name.text === "resolve"))
        )
          inspect(node.arguments[0]);
        forEachChild(node, visit);
      };
      visit(source);
    }
    deepEqual(references, []);
  });

test("Core has no unused catch-all aggregation entry", () => {
  equal(
    existsSync(new URL("../../apps/api/src/core/index.ts", import.meta.url)),
    false,
  );
});

const corePaginationNames = [
  "getPagination",
  "createPaginatedResult",
  "PaginationParams",
  "PaginationMeta",
  "PaginationQuery",
  "PaginatedResult",
  "DatabasePaginationParams",
  "DatabasePaginationQuery",
];
const coreExceptionNames = [
  "DatabaseException",
  "isPrismaKnownRequestError",
  "mapPrismaError",
  "PrismaExceptionFilter",
];
for (const [entry, expected] of [
  [
    "audit",
    [
      "AuditModule",
      "AuditRedactionService",
      "AuditWriterService",
      "AuditActorType",
      "AuditResult",
      "AuditEntry",
    ],
  ],
  [
    "config",
    [
      "configs",
      "appConfig",
      "databaseConfig",
      "jwtConfig",
      "mailConfig",
      "openaiConfig",
      "redisConfig",
      "ConfigurationModule",
      "validationSchema",
    ],
  ],
  [
    "database",
    [
      "PrismaModule",
      "PrismaService",
      ...corePaginationNames,
      "TransactionClient",
      ...coreExceptionNames,
      "PRISMA_CLIENT_OPTIONS",
    ],
  ],
  ["database/exceptions", coreExceptionNames],
  ["database/pagination", corePaginationNames],
  [
    "events",
    [
      "EventsModule",
      "createEventEnvelope",
      "OutboxWriterService",
      "EventCategory",
      "EventEnvelope",
      "JsonPrimitive",
      "JsonValue",
    ],
  ],
  ["graphql", ["GraphqlCoreModule", "GraphqlContext"]],
  ["observability", ["ObservabilityModule"]],
  [
    "queue",
    [
      "QueueModule",
      "OutboxDispatcherService",
      "QueueRegistryService",
      "QueueOperationsService",
    ],
  ],
])
  test(`Core ${entry} retains only its explicit reviewed export names`, () => {
    const source = createSourceFile(
      "index.ts",
      readFileSync(
        new URL(`../../apps/api/src/core/${entry}/index.ts`, import.meta.url),
        "utf8",
      ),
      ScriptTarget.Latest,
      true,
    );
    const names = [];
    for (const node of source.statements) {
      if (isExportDeclaration(node)) {
        ok(
          node.exportClause && isNamedExports(node.exportClause),
          "wildcard/namespace re-exports are forbidden",
        );
        names.push(
          ...node.exportClause.elements.map((element) => element.name.text),
        );
      } else if (
        node.modifiers?.some(
          (modifier) => modifier.kind === SyntaxKind.ExportKeyword,
        )
      ) {
        ok(
          entry === "config" && isVariableStatement(node),
          "barrels do not define new runtime behavior",
        );
        for (const declaration of node.declarationList.declarations) {
          ok(isIdentifier(declaration.name));
          names.push(declaration.name.text);
        }
      }
    }
    deepEqual(names.sort(), [...expected].sort());
  });

test("Core config preserves the existing ordered namespace registrations", () => {
  const source = createSourceFile(
    "index.ts",
    readFileSync(
      new URL("../../apps/api/src/core/config/index.ts", import.meta.url),
      "utf8",
    ),
    ScriptTarget.Latest,
    true,
  );
  const configs = source.statements
    .filter(isVariableStatement)
    .flatMap((node) => node.declarationList.declarations)
    .find((node) => node.name.getText(source) === "configs");
  deepEqual(
    configs?.initializer?.elements?.map((element) => element.getText(source)),
    [
      "appConfig",
      "databaseConfig",
      "jwtConfig",
      "mailConfig",
      "openaiConfig",
      "redisConfig",
    ],
  );
});

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
    "modules/iam/infrastructure/repositories/prisma-role-display.reader.ts",
    ["userRole"],
  ],
  ["modules/users/infrastructure/repositories/prisma-users.repository.ts", []],
  [
    "modules/users/infrastructure/repositories/prisma-viewer-profile.reader.ts",
    [],
  ],
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
  [
    "modules/interactions/infrastructure/repositories/prisma-comments.repository.ts",
    ["$transaction", "comment", "commentRevision"],
  ],
  [
    "modules/reputation/infrastructure/repositories/prisma-reputation.repository.ts",
    ["$transaction", "reputationPolicy"],
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
    "modules/reputation/infrastructure/repositories/prisma-reputation-entry.reader.ts",
    ["reputationEntry"],
    ["actor", "user", "recipient"],
  ],
  [
    "modules/users/infrastructure/repositories/prisma-reputation-actor.reader.ts",
    ["user"],
    ["roles", "permissions", "reputationEntries"],
  ],
  [
    "modules/users/infrastructure/repositories/prisma-reputation-write-actor.reader.ts",
    ["user"],
    ["roles", "permissions", "status"],
  ],
  [
    "modules/reputation/infrastructure/repositories/prisma-reputation.writer.ts",
    ["$executeRaw", "reputationEntry"],
    ["actor", "recipient", "user", "reversal"],
  ],
  [
    "modules/interactions/infrastructure/repositories/prisma-comment.writer.ts",
    ["$executeRaw", "comment", "commentRevision", "mention"],
    ["actor", "author", "user"],
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
    "news",
    [
      "CreateNewsDraft",
      "NEWS_ATTACHMENT_READER",
      "NEWS_DELIVERY_READER",
      "NEWS_DOCUMENT_NORMALIZER",
      "NEWS_DRAFT_TRANSACTION",
      "NEWS_INTERACTION_DECISIONS",
      "NEWS_INTERACTION_KIND",
      "NEWS_MEDIA_EVIDENCE",
      "NEWS_SEARCH_BATCH_PROJECTOR",
      "NEWS_SEARCH_INDEX_MAINTENANCE",
      "NEWS_SEARCH_PROJECTION_VERSION",
      "NEWS_SEARCH_PROJECTOR",
      "NEWS_VIEWER_DOCUMENT_READER",
      "NewsArticle",
      "NewsAttachmentFile",
      "NewsAttachmentReader",
      "NewsCommentItem",
      "NewsCommentsPage",
      "NewsDeliveryReader",
      "NewsDocumentNormalizer",
      "NewsDocumentProjection",
      "NewsDraftTransaction",
      "NewsFullRecord",
      "NewsInteractionCapability",
      "NewsInteractionDecision",
      "NewsInteractionDecisions",
      "NewsInteractionRequest",
      "NewsMediaEvidence",
      "NewsMediaEvidenceReader",
      "NewsModule",
      "NewsRatingVote",
      "NewsSearchBatchProjector",
      "NewsSearchIndexMaintenance",
      "NewsSearchInvalidSourceError",
      "NewsSearchProjector",
      "NewsViewerDocumentReader",
      "SaveNewsDraft",
      "ShortNewsItem",
      "ShortNewsNumberedQuery",
      "ShortNewsQuery",
    ],
  ],
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
      "EDITOR_PREVIEW_READER",
      "EditorPreviewReader",
      "EditorPreviewView",
      "EDITOR_DELIVERY_READER",
      "EditorDeliveryReader",
      "EditorDeliveryView",
      "EditorDeliveryDecision",
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
      "CONTENT_GATE_CREATOR",
      "ContentGateCreator",
      "CONTENT_GATE_POLICY_EVALUATOR",
      "ContentGatePolicyEvaluator",
      "ContentGatePolicyOperator",
      "ContentGatePolicyRequirement",
      "ContentGatePolicyView",
      "ContentGatePolicyEvaluation",
      "ContentGatePolicyCreation",
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
      "REPUTATION_WRITE_TRANSACTION",
      "ReputationWriteTransaction",
      "CreateReputationEntry",
      "REPUTATION_TOTAL_READER",
      "REPUTATION_ENTRY_READER",
      "ReputationEntryReader",
      "ReputationEntry",
      "ReputationActor",
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
      "USERS_PROFILE_PERSISTENCE",
      "UsersProfilePersistence",
      "PROFILE_ROLE_NAMES_READER",
      "ProfileRoleNamesReader",
      "ListUsersOptions",
      "ListUsersSort",
      "UpdateUserData",
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
      "MANUAL_AWARD_TRANSACTION",
      "ManualAwardTransaction",
      "ManualAchievementAward",
    ],
  ],
  [
    "iam",
    [
      "IamModule",
      "MEMBERSHIP_GRANT_TRANSACTION",
      "MembershipGrantTransaction",
      "ROLE_REVOCATION_TRANSACTION",
      "RoleRevocationTransaction",
      "RoleRevocationCheck",
      "RoleRevocationResult",
      "GrantAccessMembership",
      "MembershipRecord",
      "IAM_ROLE_DISPLAY_READER",
      "IamRoleDisplayReader",
      "IAM_SUBJECT_EXISTENCE_READER",
      "IamSubjectExistenceReader",
      "IAM_ASSIGNMENT_READER",
      "IamAssignmentReader",
      "IAM_ROLE_PERMISSION_KEYS_READER",
      "IamRolePermissionKeysReader",
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
      "AUTH_SUBJECT_EXISTENCE_READER",
      "AuthSubjectExistenceReader",
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
test("Core Authorization repository delegates facts without owning IAM/Auth persistence", () => {
  const source = readFileSync(
    new URL(
      "../../apps/api/src/core/authorization/repositories/permissions.repository.ts",
      import.meta.url,
    ),
    "utf8",
  );
  deepEqual(directPrismaSurface(source), []);
  ok(!source.includes("PrismaService"));
  ok(source.includes("this.roleFacts.read(roleNames)"));
  ok(source.includes("this.subjectFacts.read(userId)"));
});
test("Independent IAM assignment repository does not access the Auth-owned user delegate", () => {
  const source = readFileSync(
    new URL(
      "../../apps/api/src/modules/iam/infrastructure/repositories/prisma-subject-access.repository.ts",
      import.meta.url,
    ),
    "utf8",
  );
  ok(!directPrismaSurface(source).includes("user"));
  ok(source.includes("this.subjects.exists(id)"));
  ok(source.includes("this.assignments.find(userId)"));
});
const rules = (source, file) =>
  analyze(source, file).map((finding) => finding.rule);

test("Reputation technical readers remain absent from business roots and forbidden to applications", () => {
  const root = "apps/api/src/modules/reputation/index.ts";
  const source = readFileSync(
    new URL(`../../${root}`, import.meta.url),
    "utf8",
  );
  ok(!source.includes("PrismaReputationEntryReader"));
  ok(!source.includes("./infrastructure"));
  for (const file of [
    root,
    "apps/api/src/modules/reputation/application/read.ts",
    "apps/api/src/modules/news/infrastructure/read.ts",
  ]) {
    ok(
      analyzeBoundaries([
        {
          path: file,
          source:
            "import { PrismaReputationEntryReader } from '@api/modules/reputation/infrastructure';",
        },
      ]).some(({ rule }) => rule === "infrastructure-entry-business-import"),
    );
  }
});

test("Leaderboards ranking inputs have no foreign persistence and guarded SQL stays out of business roots", () => {
  const repository = readFileSync(
    new URL(
      "../../apps/api/src/modules/leaderboards/infrastructure/repositories/ranking-facts-leaderboards.repository.ts",
      import.meta.url,
    ),
    "utf8",
  );
  deepEqual(directPrismaSurface(repository), []);
  ok(
    !/Prisma|\$queryRaw|community_point_entries|reputation_entries|level_definitions|user_title_grants/.test(
      repository,
    ),
  );
  const contract = readFileSync(
    new URL(
      "../../apps/api/src/modules/leaderboards/contracts/ranking-facts.port.ts",
      import.meta.url,
    ),
    "utf8",
  );
  ok(!/from ['"](?:@prisma|.*infrastructure|.*core\/database)/.test(contract));
  for (const owner of [
    "auth",
    "users",
    "community-points",
    "reputation",
    "levels",
    "custom-titles",
    "leaderboards",
  ]) {
    const publicRoot = readFileSync(
      new URL(`../../apps/api/src/modules/${owner}/index.ts`, import.meta.url),
      "utf8",
    );
    ok(!/from ['"]\.\/infrastructure/.test(publicRoot));
    for (const path of [
      "apps/api/src/modules/news/application/foreign-ranking.ts",
      "apps/api/src/modules/news/infrastructure/foreign-ranking.ts",
      `apps/api/src/modules/${owner}/index.ts`,
    ]) {
      ok(
        analyzeBoundaries([
          {
            path,
            source: `import { ownedRankingSql } from '@api/modules/${owner}/infrastructure';`,
          },
        ]).some(({ rule }) => rule === "infrastructure-entry-business-import"),
      );
    }
  }
});

test("Leaderboard root assembly neither copies owner table algorithms nor introduces extra persistence work", () => {
  const source = readFileSync(
    new URL(
      "../../apps/api/src/composition/leaderboards/infrastructure/prisma-leaderboard-ranking.reader.ts",
      import.meta.url,
    ),
    "utf8",
  );
  equal((source.match(/this\.prisma\.\$queryRaw</g) ?? []).length, 1);
  ok(
    !/\$transaction|Prisma\.raw|findUnique|findMany|"community_point_entries"|"reputation_entries"|"level_definitions"|"custom_titles"|"user_title_grants"|"user_title_selections"|ROW_NUMBER|SUM\(/.test(
      source,
    ),
  );
});

test("owners publish only the intended guarded technical symbols", () => {
  for (const [moduleName, expected] of [
    [
      "reputation",
      [
        "PrismaReputationEntryReader",
        "ReputationEntryFact",
        "ReputationReversalFact",
        "PrismaReputationWriter",
        "ReputationEntryProjection",
        "leaderboardReputationAggregate",
      ],
    ],
    [
      "users",
      [
        "PrismaPublicProfileReader",
        "PrismaTransactionalProfileExistenceReader",
        "usersProfileSelect",
        "profileById",
        "profileByUsername",
        "profilesByIds",
        "profileDirectoryQuery",
        "profileUpdateData",
        "PrismaReputationActorReader",
        "PrismaReputationWriteActorReader",
        "PrismaMentionProfileSelector",
        "MentionRecipientMatcher",
        "MentionProfileCandidate",
        "leaderboardProfileColumns",
      ],
    ],
    [
      "auth",
      [
        "PrismaActiveSubjectSelector",
        "PrismaTransactionalSubjectExistenceReader",
        "subjectAnchorSelect",
        "subjectById",
        "profileAccountSelect",
        "profileAccountByEmail",
        "activeProfileAccount",
        "profileAccountState",
        "leaderboardSubjectSource",
        "leaderboardSubjectId",
        "leaderboardSubjectAge",
        "leaderboardSubjectEligibility",
      ],
    ],
    [
      "iam",
      [
        "profileDirectoryRole",
        "PrismaMembershipGrantWriter",
        "PrismaRoleRevocationWriter",
        "iamAssignmentSelect",
        "mapIamAssignments",
        "iamAuthorizationSelect",
        "mapAuthorizationAssignmentFacts",
      ],
    ],
    ["achievements", ["PrismaManualAwardWriter"]],
    [
      "custom-titles",
      [
        "PrismaTitleGrantWriter",
        "leaderboardTitleColumns",
        "leaderboardTitleJoins",
      ],
    ],
    ["community-points", ["leaderboardPointsAggregate"]],
    ["levels", ["leaderboardLevelLookup"]],
    [
      "leaderboards",
      ["leaderboardRankingColumns", "leaderboardPageWithPopulation"],
    ],
    [
      "interactions",
      [
        "PrismaInteractionTargetWriter",
        "PrismaCommentWriter",
        "CommentRecipientResolver",
        "PrismaInteractionDeliveryReader",
        "InteractionDeliveryComment",
      ],
    ],
  ]) {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/modules/${moduleName}/infrastructure.ts`,
        import.meta.url,
      ),
      "utf8",
    );
    const tree = createSourceFile(
      "infrastructure.ts",
      source,
      ScriptTarget.Latest,
      true,
    );
    const names = [];
    for (const node of tree.statements) {
      if (!isExportDeclaration(node)) continue;
      ok(node.exportClause && isNamedExports(node.exportClause));
      names.push(
        ...node.exportClause.elements.map((element) => element.name.text),
      );
    }
    deepEqual(names.sort(), [...expected].sort());
  }
});

for (const [owner, writer, rootFile] of [
  [
    "achievements",
    "PrismaManualAwardWriter",
    "prisma-manual-award.transaction.ts",
  ],
  [
    "custom-titles",
    "PrismaTitleGrantWriter",
    "prisma-title-grant.transaction.ts",
  ],
]) {
  test(`${owner} recipient composition has only default transaction lifetime and no foreign owner SQL`, () => {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/composition/gamification/infrastructure/${rootFile}`,
        import.meta.url,
      ),
      "utf8",
    );
    deepEqual(directPrismaSurface(source), ["$transaction"]);
    deepEqual(directPrismaSurface(source, "transaction", false), []);
    const root = readFileSync(
      new URL(`../../apps/api/src/modules/${owner}/index.ts`, import.meta.url),
      "utf8",
    );
    ok(!root.includes(writer));
    ok(!root.includes("./infrastructure"));
    for (const file of [
      `apps/api/src/modules/${owner}/index.ts`,
      `apps/api/src/modules/${owner}/application/command.ts`,
      "apps/api/src/modules/news/infrastructure/consumer.ts",
    ]) {
      ok(
        analyzeBoundaries([
          {
            path: file,
            source: `import { ${writer} } from '@api/modules/${owner}/infrastructure';`,
          },
        ]).some(({ rule }) => rule === "infrastructure-entry-business-import"),
      );
    }
  });
}
for (const [owner, file, expected] of [
  [
    "achievements",
    "prisma-manual-award.writer.ts",
    ["$executeRaw", "achievementAward", "achievementDefinition"],
  ],
  [
    "custom-titles",
    "prisma-title-grant.writer.ts",
    ["$executeRaw", "customTitle", "userTitleGrant"],
  ],
  ["users", "prisma-transactional-profile-existence.reader.ts", ["user"]],
]) {
  test(`${file} accesses only its owner delegates without owning transactions`, () => {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/modules/${owner}/infrastructure/repositories/${file}`,
        import.meta.url,
      ),
      "utf8",
    );
    deepEqual(directPrismaSurface(source), []);
    deepEqual(directPrismaSurface(source, "transaction", false), expected);
  });
}
test("Gamification recipient repositories no longer read Users in either client scope", () => {
  for (const owner of ["achievements", "custom-titles"]) {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/modules/${owner}/infrastructure/repositories/prisma-${owner}.repository.ts`,
        import.meta.url,
      ),
      "utf8",
    );
    ok(!directPrismaSurface(source).includes("user"));
    ok(!directPrismaSurface(source, "transaction", false).includes("user"));
    ok(!source.includes("createEventEnvelope"));
  }
});

for (const [file, writer] of [
  ["prisma-membership-grant.transaction.ts", "PrismaMembershipGrantWriter"],
  ["prisma-role-revocation.transaction.ts", "PrismaRoleRevocationWriter"],
]) {
  test(`${file} binds IAM/Auth without copying owner SQL or exposing technical adapters`, () => {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/composition/iam-transactions/infrastructure/${file}`,
        import.meta.url,
      ),
      "utf8",
    );
    deepEqual(directPrismaSurface(source), ["$transaction"]);
    deepEqual(directPrismaSurface(source, "tx", false), []);
    for (const [owner, symbol] of [
      ["iam", writer],
      ["auth", "PrismaTransactionalSubjectExistenceReader"],
    ]) {
      const root = readFileSync(
        new URL(
          `../../apps/api/src/modules/${owner}/index.ts`,
          import.meta.url,
        ),
        "utf8",
      );
      ok(!root.includes(symbol));
      for (const consumer of [
        `apps/api/src/modules/${owner}/index.ts`,
        `apps/api/src/modules/${owner}/application/read.ts`,
        "apps/api/src/modules/news/infrastructure/read.ts",
      ]) {
        ok(
          analyzeBoundaries([
            {
              path: consumer,
              source: `import { ${symbol} } from '@api/modules/${owner}/infrastructure';`,
            },
          ]).some(
            ({ rule }) => rule === "infrastructure-entry-business-import",
          ),
        );
      }
    }
  });
}
for (const [owner, file, client, expected] of [
  [
    "iam",
    "prisma-membership-grant.writer.ts",
    "tx",
    ["$queryRaw", "accessGroup", "accessGroupMembership"],
  ],
  [
    "iam",
    "prisma-role-revocation.writer.ts",
    "transaction",
    ["$queryRaw", "role", "userRole"],
  ],
  [
    "auth",
    "prisma-transactional-subject-existence.reader.ts",
    "transaction",
    ["user"],
  ],
]) {
  test(`${file} retains only owned delegates and no transaction lifetime`, () => {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/modules/${owner}/infrastructure/repositories/${file}`,
        import.meta.url,
      ),
      "utf8",
    );
    deepEqual(directPrismaSurface(source), []);
    deepEqual(directPrismaSurface(source, client, false), expected);
  });
}
test("IAM transactional repositories no longer read subjects or compose a role transaction", () => {
  for (const file of [
    "prisma-access-group.repository.ts",
    "prisma-role-revocation.repository.ts",
  ]) {
    const source = readFileSync(
      new URL(
        `../../apps/api/src/modules/iam/infrastructure/repositories/${file}`,
        import.meta.url,
      ),
      "utf8",
    );
    for (const client of ["this.prisma", "tx", "transaction"])
      ok(!directPrismaSurface(source, client, false).includes("user"));
    if (file.includes("role-revocation"))
      deepEqual(directPrismaSurface(source), []);
  }
});

test("Comment write composition owns transaction lifetime, never owner-table SQL", () => {
  const file =
    "apps/api/src/composition/comment-writes/infrastructure/prisma-comment-write.transaction.ts";
  const source = readFileSync(
    new URL(`../../${file}`, import.meta.url),
    "utf8",
  );
  deepEqual(directPrismaSurface(source), ["$transaction"]);
  deepEqual(directPrismaSurface(source, "transaction", false), []);
});

test("Reputation write composition binds adapters without copying owner SQL or exporting a business callback", () => {
  const file =
    "apps/api/src/composition/reputation/infrastructure/prisma-reputation-write.transaction.ts";
  const source = readFileSync(
    new URL(`../../${file}`, import.meta.url),
    "utf8",
  );
  deepEqual(directPrismaSurface(source), ["$transaction"]);
  deepEqual(directPrismaSurface(source, "transaction", false), []);
  const root = readFileSync(
    new URL("../../apps/api/src/modules/reputation/index.ts", import.meta.url),
    "utf8",
  );
  ok(!root.includes("PrismaReputationWriter"));
  ok(!root.includes("ReputationEntryProjection"));
  const port =
    "apps/api/src/modules/reputation/contracts/reputation-write-transaction.port.ts";
  const contract = readFileSync(
    new URL(`../../${port}`, import.meta.url),
    "utf8",
  );
  deepEqual(analyzeBoundaries([{ path: port, source: contract }]), []);
  const tree = createSourceFile(port, contract, ScriptTarget.Latest, true);
  ok(!tree.statements.some((node) => node.getText(tree).includes("Prisma")));
});

for (const [file, binding, fields] of [
  [
    "modules/users/infrastructure/repositories/prisma-profile-persistence.shape.ts",
    "usersProfileSelect",
    [
      "id",
      "username",
      "displayName",
      "bio",
      "location",
      "website",
      "technologies",
      "interests",
      "avatarUrl",
      "coverUrl",
      "lastSeenAt",
      "createdAt",
      "updatedAt",
    ],
  ],
  [
    "modules/auth/infrastructure/repositories/prisma-profile-account.shape.ts",
    "profileAccountSelect",
    ["email", "status", "emailVerifiedAt"],
  ],
]) {
  test("shared-row owner selection is exact and frozen: " + binding, () => {
    const source = readFileSync(
      new URL("../../apps/api/src/" + file, import.meta.url),
      "utf8",
    );
    const tree = createSourceFile(file, source, ScriptTarget.Latest, true);
    const declaration = tree.statements
      .flatMap((node) => node.declarationList?.declarations ?? [])
      .find((node) => node.name.getText(tree) === binding);
    equal(declaration.initializer.expression.getText(tree), "Object.freeze");
    const argument = declaration.initializer.arguments[0];
    const object = argument.expression ?? argument;
    deepEqual(
      object.properties.map((node) => node.name.getText(tree)).sort(),
      fields.slice().sort(),
    );
    ok(
      object.properties.every(
        (node) =>
          isPropertyAssignment(node) &&
          node.initializer.getText(tree) === "true",
      ),
    );
  });
}

test("Users shared-row root composes only owner fragments and preserves a lazy batch without business ORM contracts", () => {
  const file =
    "apps/api/src/composition/users-profiles/infrastructure/prisma-users-profile.persistence.ts";
  const source = readFileSync(
    new URL("../../" + file, import.meta.url),
    "utf8",
  );
  deepEqual(directPrismaSurface(source), ["$transaction", "user"]);
  const tree = createSourceFile(file, source, ScriptTarget.Latest, true);
  const forbidden = new Set([
    "email",
    "status",
    "emailVerifiedAt",
    "username",
    "displayName",
    "roles",
    "passwordHash",
    "refreshTokenHash",
  ]);
  function visit(node) {
    if (isPropertyAssignment(node))
      ok(
        !forbidden.has(node.name.getText(tree)),
        "root copies owner field " + node.name.getText(tree),
      );
    forEachChild(node, visit);
  }
  visit(tree);
  ok(source.includes("this.prisma.$transaction(["));
  for (const port of [
    "profile-persistence.port.ts",
    "profile-role-names.port.ts",
  ]) {
    const path = "apps/api/src/modules/users/contracts/" + port;
    const contract = readFileSync(
      new URL("../../" + path, import.meta.url),
      "utf8",
    );
    deepEqual(analyzeBoundaries([{ path, source: contract }]), []);
    ok(!contract.includes("Prisma"));
  }
});

test("IAM display reads assignment/name facts without foreign profiles or permissions", () => {
  const file =
    "apps/api/src/modules/iam/infrastructure/repositories/prisma-role-display.reader.ts";
  const source = readFileSync(
    new URL("../../" + file, import.meta.url),
    "utf8",
  );
  const tree = createSourceFile(file, source, ScriptTarget.Latest, true);
  const forbidden = new Set([
    "user",
    "status",
    "permissions",
    "passwordHash",
    "email",
    "authVersion",
  ]);
  function visit(node) {
    if (isPropertyAssignment(node)) ok(!forbidden.has(node.name.getText(tree)));
    forEachChild(node, visit);
  }
  visit(tree);
});

test("Mention SQL composition imports only guarded selectors and performs no owner delegate reads", () => {
  const file =
    "apps/api/src/composition/comment-writes/infrastructure/prisma-mention-recipient.resolver.ts";
  const source = readFileSync(
    new URL(`../../${file}`, import.meta.url),
    "utf8",
  );
  deepEqual(directPrismaSurface(source), []);
  deepEqual(directPrismaSurface(source, "transaction", false), ["$queryRaw"]);
  ok(!source.includes('FROM "users"'));
  deepEqual(analyzeBoundaries([{ path: file, source }]), []);
});

test("Comment write business port has no Prisma/client/callback surface or technical re-export", () => {
  const root = "apps/api/src/modules/interactions/index.ts";
  const source = readFileSync(
    new URL(`../../${root}`, import.meta.url),
    "utf8",
  );
  ok(!source.includes("PrismaCommentWriter"));
  ok(!source.includes("CommentRecipientResolver"));
  const file =
    "apps/api/src/modules/interactions/contracts/comment-write-transaction.port.ts";
  const port = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
  deepEqual(analyzeBoundaries([{ path: file, source: port }]), []);
  const tree = createSourceFile(file, port, ScriptTarget.Latest, true);
  ok(!tree.statements.some((node) => node.getText(tree).includes("Prisma")));
});

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

test("mandatory architecture command enforces the frozen inventory", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  const commands = manifest.scripts["architecture:check"].split(" && ");
  ok(
    commands.includes(
      "node scripts/architecture/report-boundaries.mjs --check-baseline",
    ),
  );
  equal(
    manifest.scripts["architecture:report"],
    "node scripts/architecture/report-boundaries.mjs",
  );
});

test("CI executes the mandatory architecture command without suppressing failure", () => {
  const workflow = readFileSync(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  ok(
    /- name: Validate architecture\r?\n\s+run: pnpm architecture:check\r?\n\s*\r?\n/.test(
      workflow,
    ),
  );
});

test("CLI frozen inventory check succeeds for the reviewed current sources", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./report-boundaries.mjs", import.meta.url)),
      "--check-baseline",
    ],
    { encoding: "utf8" },
  );
  equal(result.status, 0, result.stderr);
  ok(result.stderr.includes("Frozen inventory matches (0 known findings"));
});

function runInventoryFixture(source, baselineFindings, args) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "dss-architecture-cli-"));
  try {
    for (const directory of [
      "scripts/architecture",
      "apps/api/src/modules/auth/application",
      "apps/api/src/core",
      "apps/api/src/composition",
      "docs/architecture",
    ])
      mkdirSync(join(fixtureRoot, directory), { recursive: true });
    // Relocate the unmodified CLI logic, retaining the real production analyzer.
    const cli = readFileSync(
      new URL("./report-boundaries.mjs", import.meta.url),
      "utf8",
    );
    const importSpecifier = '"./analyze-boundaries.mjs"';
    equal(cli.split(importSpecifier).length, 2);
    writeFileSync(
      join(fixtureRoot, "scripts/architecture/report-boundaries.mjs"),
      cli.replace(
        importSpecifier,
        JSON.stringify(
          new URL("./analyze-boundaries.mjs", import.meta.url).href,
        ),
      ),
    );
    writeFileSync(join(fixtureRoot, path), source);
    const baselinePath = join(
      fixtureRoot,
      "docs/architecture/architecture-baseline.json",
    );
    const baseline = JSON.stringify({ findings: baselineFindings });
    writeFileSync(baselinePath, baseline);
    const result = spawnSync(
      process.execPath,
      [
        join(fixtureRoot, "scripts/architecture/report-boundaries.mjs"),
        ...args,
      ],
      { encoding: "utf8" },
    );
    equal(
      readFileSync(baselinePath, "utf8"),
      baseline,
      "CLI must never rewrite the baseline",
    );
    return result;
  } finally {
    // Only the unique directory created above belongs to this fixture.
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test("CLI blocks newly added violations without rewriting the baseline", () => {
  const result = runInventoryFixture(
    "import '@prisma/client';",
    [],
    ["--check-baseline"],
  );
  equal(result.status, 1, result.stderr);
  ok(result.stderr.includes("Baseline drift: 1 added, 0 removed"));
});

test("CLI blocks removed inventory entries until explicitly reviewed", () => {
  const result = runInventoryFixture("", analyze("import '@prisma/client';"), [
    "--check-baseline",
  ]);
  equal(result.status, 1, result.stderr);
  ok(result.stderr.includes("Baseline drift: 0 added, 1 removed"));
});

test("CLI report-only mode diagnoses ordinary violations without failing", () => {
  const result = runInventoryFixture(
    "import '@prisma/client';",
    [],
    ["--json"],
  );
  equal(result.status, 0, result.stderr);
  equal(JSON.parse(result.stdout).findings.length, 1);
});

test("CLI still blocks technical entry violations even in report-only mode", () => {
  const result = runInventoryFixture(
    "import { PrismaInteractionTargetWriter } from '@api/modules/interactions/infrastructure';",
    [],
    ["--json"],
  );
  equal(result.status, 1, result.stderr);
  ok(
    JSON.parse(result.stdout).findings.some(
      ({ rule }) => rule === "infrastructure-entry-business-import",
    ),
  );
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
