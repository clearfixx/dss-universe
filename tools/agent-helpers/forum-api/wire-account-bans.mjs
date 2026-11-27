// One-off wiring edits for Moderation's permanent bans; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

function edit(file, search, replace) {
  const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, replace));
}

const api = "apps/api";
edit(
  `${api}/src/core/authorization/enums/permission.registry.ts`,
  "  ModerationRulesManage: {\n",
  "  ModerationBansManage: {\n    key: 'moderation.bans.manage',\n    label: 'Manage permanent bans',\n    description: 'Allows banning accounts permanently and lifting bans.',\n  },\n  ModerationRulesManage: {\n",
);
edit(
  `${api}/prisma/seed/role-permissions.seed.ts`,
  "    Permission.ModerationRulesManage,\n",
  "    Permission.ModerationRulesManage,\n    Permission.ModerationBansManage,\n",
);
const moduleFile = `${api}/src/modules/moderation/moderation.module.ts`;
edit(
  moduleFile,
  "import { CommunityRulesService }",
  "import { AccountBansService } from './infrastructure/prisma-account-ban-records';\nimport { AccountBansResolver } from './presentation/account-bans.resolver';\nimport { CommunityRulesService }",
);
edit(
  moduleFile,
  "    CommunityRulesResolver,\n",
  "    CommunityRulesResolver,\n    AccountBansService,\n    AccountBansResolver,\n",
);
edit(
  `${api}/src/modules/moderation/index.ts`,
  "export { ModerationModule } from './moderation.module';\n",
  "export { ModerationModule } from './moderation.module';\nexport {\n  BAN_ACCOUNTS,\n  type BanAccounts,\n  type BanPreviousStatus,\n} from './contracts/ban-accounts.port';\n",
);
const app = `${api}/src/app.module.ts`;
edit(
  app,
  "import { IdentityCompositionModule }",
  "import { ModerationBansIntegrationModule } from './composition/moderation-bans/moderation-bans-integration.module';\nimport { IdentityCompositionModule }",
);
edit(
  app,
  "    IdentityCompositionModule,\n",
  "    IdentityCompositionModule,\n    ModerationBansIntegrationModule,\n",
);

const schema = `${api}/prisma/schema.prisma`;
edit(
  schema,
  "model CommunityRule {",
  `model AccountBan {
  id             String    @id @default(uuid())
  reference      String    @unique
  subjectId      String
  issuerId       String
  ruleId         String
  ruleCode       String
  ruleText       String
  comment        String
  contextType    String?
  contextId      String?
  contextPath    String?
  previousStatus String
  issuedAt       DateTime  @default(now())
  liftedAt       DateTime?
  liftedById     String?
  liftReason     String?

  subject  User          @relation("AccountBanSubject", fields: [subjectId], references: [id], onDelete: Restrict)
  issuer   User          @relation("AccountBanIssuer", fields: [issuerId], references: [id], onDelete: Restrict)
  liftedBy User?         @relation("AccountBanLifter", fields: [liftedById], references: [id], onDelete: Restrict)
  rule     CommunityRule @relation(fields: [ruleId], references: [id], onDelete: Restrict)

  @@index([subjectId, issuedAt])
  @@map("account_bans")
}

model CommunityRule {`,
);
edit(
  schema,
  '  updatedBy User? @relation("CommunityRuleEditor", fields: [updatedById], references: [id], onDelete: Restrict)\n',
  '  updatedBy User?        @relation("CommunityRuleEditor", fields: [updatedById], references: [id], onDelete: Restrict)\n  bans      AccountBan[]\n',
);
const users = readFileSync(schema, "utf8").replace(/\r\n/g, "\n");
const anchor = users.match(/\n  editedCommunityRules +CommunityRule\[\] +@relation\("CommunityRuleEditor"\)\n/);
if (!anchor) throw new Error("User relation anchor");
writeFileSync(
  schema,
  users.replace(
    anchor[0],
    `${anchor[0]}  accountBans             AccountBan[]                 @relation("AccountBanSubject")\n  issuedAccountBans       AccountBan[]                 @relation("AccountBanIssuer")\n  liftedAccountBans       AccountBan[]                 @relation("AccountBanLifter")\n`,
  ),
);

edit(
  `${api}/test/moderation-sanctions.e2e-spec.ts`,
  "    expect(keys.map(({ key }) => key)).toEqual([\n",
  "    expect(keys.map(({ key }) => key)).toEqual([\n      'moderation.bans.manage',\n",
);
edit(
  `${api}/test/prisma-schema-alignment.e2e-spec.ts`,
  "    const legacyDefaults = [\n",
  "    const legacyDefaults = [\n      'account_bans',\n",
);
