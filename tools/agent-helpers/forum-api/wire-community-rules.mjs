// One-off wiring edits for the community rules package; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

function edit(file, search, replace) {
  const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, replace));
}

edit(
  "apps/api/src/core/authorization/enums/permission.registry.ts",
  "  ForumStructureManage: {\n    key",
  "  ModerationRulesManage: {\n    key: 'moderation.rules.manage',\n    label: 'Manage community rules',\n    description: 'Allows editing the numbered community rules catalogue.',\n  },\n  ForumStructureManage: {\n    key",
);
edit(
  "apps/api/prisma/seed/role-permissions.seed.ts",
  "    Permission.ModerationPolicyManage,\n",
  "    Permission.ModerationPolicyManage,\n    Permission.ModerationRulesManage,\n",
);
const moduleFile = "apps/api/src/modules/moderation/moderation.module.ts";
edit(
  moduleFile,
  "import { ModerationSanctionsService }",
  "import { CommunityRulesService } from './infrastructure/prisma-community-rules';\nimport { ModerationSanctionsService }",
);
edit(
  moduleFile,
  "import { ModerationSanctionsResolver }",
  "import { CommunityRulesResolver } from './presentation/community-rules.resolver';\nimport { ModerationSanctionsResolver }",
);
edit(
  moduleFile,
  "    ModerationSanctionsResolver,\n",
  "    ModerationSanctionsResolver,\n    CommunityRulesService,\n    CommunityRulesResolver,\n",
);
const schema = "apps/api/prisma/schema.prisma";
edit(
  schema,
  "model ModerationSanctionPolicy {",
  'model CommunityRule {\n  id          String   @id @default(uuid())\n  code        String   @unique\n  text        String\n  active      Boolean  @default(true)\n  updatedById String?\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @default(now()) @updatedAt\n\n  updatedBy User? @relation("CommunityRuleEditor", fields: [updatedById], references: [id], onDelete: Restrict)\n\n  @@map("community_rules")\n}\n\nmodel ModerationSanctionPolicy {',
);
edit(
  schema,
  '  blockedByUsers          UserBlock[]                  @relation("UserBlocked")\n',
  '  blockedByUsers          UserBlock[]                  @relation("UserBlocked")\n  editedCommunityRules    CommunityRule[]              @relation("CommunityRuleEditor")\n',
);
