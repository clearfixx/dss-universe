// One-off wiring edits for ban appeals (package 2); run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}

const api = "apps/api";
const media = `${api}/src/modules/media`;
edit(`${media}/domain/types/media-upload-policy.type.ts`, "  | 'attachment';", "  | 'attachment'\n  | 'appeal-screenshot';");
edit(
  `${media}/application/services/media-upload-policy.service.ts`,
  "    'content-image': this.imagePolicy('content-image', MediaVisibility.PRIVATE),\n",
  "    'content-image': this.imagePolicy('content-image', MediaVisibility.PRIVATE),\n    // Screenshots of a ban appeal (owner 2026-11-27). Not offered by the\n    // signed-in upload input: only the appeal intake uses it.\n    'appeal-screenshot': {\n      ...this.imagePolicy('appeal-screenshot', MediaVisibility.PRIVATE),\n      maximumBytes: 10 * MEBIBYTE,\n    },\n",
);
const binary = `${media}/application/services/media-binary-upload.service.ts`;
edit(
  binary,
  "    if (policyKey === 'content-image') {\n",
  "    if (policyKey === 'appeal-screenshot') {\n      return [\n        {\n          name: 'review',\n          storageKey: `${prefix}/review.webp`,\n          width: 2560,\n          fit: 'inside',\n        },\n      ];\n    }\n    if (policyKey === 'content-image') {\n",
);
const mediaModule = `${media}/media.module.ts`;
edit(
  mediaModule,
  "import { StorageModule } from '@api/core/storage';\n",
  "import { StorageModule } from '@api/core/storage';\nimport { MEDIA_APPEAL_SCREENSHOTS } from './contracts/appeal-screenshots.contract';\nimport { MediaAppealScreenshotsService } from './application/services/media-appeal-screenshots.service';\n",
);
edit(
  mediaModule,
  "    AvatarService,\n    CoverService,\n    MediaAccessService,",
  "    MediaAppealScreenshotsService,\n    {\n      provide: MEDIA_APPEAL_SCREENSHOTS,\n      useExisting: MediaAppealScreenshotsService,\n    },\n    AvatarService,\n    CoverService,\n    MediaAccessService,",
);
edit(mediaModule, "    MEDIA_IMAGE_ELIGIBILITY,\n  ],\n})", "    MEDIA_IMAGE_ELIGIBILITY,\n    MEDIA_APPEAL_SCREENSHOTS,\n  ],\n})");
writeFileSync(
  `${media}/index.ts`,
  `${read(`${media}/index.ts`).trimEnd()}\nexport {\n  MEDIA_APPEAL_SCREENSHOTS,\n  type MediaAppealScreenshots,\n} from './contracts/appeal-screenshots.contract';\n`,
);

const moderation = `${api}/src/modules/moderation`;
const moduleFile = `${moderation}/moderation.module.ts`;
edit(
  moduleFile,
  "import { CommunityRulesService }",
  "import { BanAppealsService } from './infrastructure/prisma-ban-appeals';\nimport {\n  BanAppealFilesController,\n  BanTicketGuard,\n} from './presentation/ban-appeal-files.controller';\nimport { BanAppealsResolver } from './presentation/ban-appeals.resolver';\nimport { CommunityRulesService }",
);
edit(moduleFile, "    AccountBansResolver,\n", "    AccountBansResolver,\n    BanAppealsService,\n    BanAppealsResolver,\n    BanTicketGuard,\n");
edit(moduleFile, "  imports: [AuthorizationModule],\n", "  imports: [AuthorizationModule],\n  controllers: [BanAppealFilesController],\n");
writeFileSync(
  `${moderation}/index.ts`,
  `${read(`${moderation}/index.ts`).trimEnd()}\nexport {\n  BAN_APPEAL_TRANSACTION,\n  type BanAppealTransaction,\n} from './contracts/ban-appeal-transaction.port';\nexport {\n  APPEAL_SCREENSHOT_FILES,\n  type AppealScreenshotFiles,\n} from './contracts/appeal-screenshots.port';\nexport type { BanAppealRecord } from './domain/ban-appeal.rules';\n`,
);
writeFileSync(
  `${moderation}/infrastructure.ts`,
  `${read(`${moderation}/infrastructure.ts`).trimEnd()}\nexport { PrismaBanAppealLedger } from './infrastructure/prisma-ban-appeal.ledger';\n`,
);

const wiring = `${api}/src/composition/moderation-bans/moderation-bans-integration.module.ts`;
edit(wiring, "import { BAN_TRANSACTION } from '@api/modules/moderation';\n", "import {\n  MEDIA_APPEAL_SCREENSHOTS,\n  MediaModule,\n} from '@api/modules/media';\nimport {\n  APPEAL_SCREENSHOT_FILES,\n  BAN_APPEAL_TRANSACTION,\n  BAN_TRANSACTION,\n} from '@api/modules/moderation';\n");
edit(
  wiring,
  "import { PrismaAccountBanLedger } from '@api/modules/moderation/infrastructure';\n",
  "import {\n  PrismaAccountBanLedger,\n  PrismaBanAppealLedger,\n} from '@api/modules/moderation/infrastructure';\nimport { PrismaBanAppealTransaction } from './infrastructure/prisma-ban-appeal.transaction';\n",
);
edit(wiring, "AuthModule],\n", "AuthModule, MediaModule],\n");
edit(
  wiring,
  "    { provide: BAN_TRANSACTION, useClass: PrismaBanTransaction },\n",
  "    { provide: BAN_TRANSACTION, useClass: PrismaBanTransaction },\n    PrismaBanAppealLedger,\n    { provide: BAN_APPEAL_TRANSACTION, useClass: PrismaBanAppealTransaction },\n    { provide: APPEAL_SCREENSHOT_FILES, useExisting: MEDIA_APPEAL_SCREENSHOTS },\n",
);
edit(wiring, "  exports: [BAN_TRANSACTION],\n", "  exports: [\n    BAN_TRANSACTION,\n    BAN_APPEAL_TRANSACTION,\n    APPEAL_SCREENSHOT_FILES,\n  ],\n");

const schema = `${api}/prisma/schema.prisma`;
edit(
  schema,
  "model CommunityRule {",
  `model BanAppeal {
  id             String    @id @default(uuid())
  banId          String    @unique
  text           String
  status         String    @default("PENDING")
  submittedAt    DateTime  @default(now())
  decidedAt      DateTime?
  decidedById    String?
  decisionReason String?

  ban       AccountBan @relation(fields: [banId], references: [id], onDelete: Restrict)
  decidedBy User?      @relation("BanAppealDecider", fields: [decidedById], references: [id], onDelete: Restrict)

  @@index([status, submittedAt])
  @@map("ban_appeals")
}

model BanAppealFile {
  id        String    @id @default(uuid())
  banId     String
  mediaId   String    @unique
  addedAt   DateTime  @default(now())
  removedAt DateTime?

  ban AccountBan @relation(fields: [banId], references: [id], onDelete: Restrict)

  @@index([banId, addedAt])
  @@map("ban_appeal_files")
}

model CommunityRule {`,
);
edit(schema, '  @@index([subjectId, issuedAt])\n  @@map("account_bans")', '  appeal      BanAppeal?\n  appealFiles BanAppealFile[]\n\n  @@index([subjectId, issuedAt])\n  @@map("account_bans")');
const users = read(schema);
const anchor = users.match(/\n  liftedAccountBans +AccountBan\[\] +@relation\("AccountBanLifter"\)\n/);
if (!anchor) throw new Error("User relation anchor");
writeFileSync(schema, users.replace(anchor[0], `${anchor[0]}  decidedBanAppeals       BanAppeal[]                  @relation("BanAppealDecider")\n`));

const test = "scripts/architecture/analyze-boundaries.test.mjs";
edit(test, '    ["moderation", ["PrismaAccountBanLedger"]],\n', '    ["moderation", ["PrismaAccountBanLedger", "PrismaBanAppealLedger"]],\n');
