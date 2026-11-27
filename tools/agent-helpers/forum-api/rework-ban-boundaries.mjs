// Reworks the ban packages so no public contract sees the ORM; run from the repo root.
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}
function header(module, path, purpose, important) {
  return `/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: ${module}
 * 📄 File: ${path}
 *
 * 🎯 Purpose:
 * ${purpose}
 *
 * ⚠️ Important:
 * ${important}
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
`;
}

const auth = "apps/api/src/modules/auth";
const moderation = "apps/api/src/modules/moderation";
const composition = "apps/api/src/composition/moderation-bans";

// ---- Auth: a read-only public contract plus a guarded technical writer.
writeFileSync(
  `${auth}/contracts/ban-tickets.contract.ts`,
  header(
    "Authentication",
    `${auth}/contracts/ban-tickets.contract.ts`,
    "Verifies the narrow ticket a banned account receives at login.",
    "A banned account never gets a session; the ticket only identifies it.",
  ) +
    `export interface AuthBanTickets {
  /** The subject of a valid ticket while the account is still banned. */
  subjectOf(ticket: string): Promise<string | null>;
}

export const AUTH_BAN_TICKETS = Symbol('AUTH_BAN_TICKETS');
`,
);
writeFileSync(
  `${auth}/infrastructure/repositories/prisma-ban-ticket.reader.ts`,
  header(
    "Authentication",
    `${auth}/infrastructure/repositories/prisma-ban-ticket.reader.ts`,
    "Auth-owned verification of ban tickets against the current account.",
    "Lifting a ban bumps authVersion, so older tickets stop working.",
  ) +
    `import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { TokenService } from '../../application/services/token.service';
import type { AuthBanTickets } from '../../contracts/ban-tickets.contract';

@Injectable()
export class PrismaBanTicketReader implements AuthBanTickets {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async subjectOf(ticket: string): Promise<string | null> {
    const claims = await this.tokens.verifyBanTicket(ticket);
    if (!claims) return null;
    const account = await this.prisma.user.findUnique({
      where: { id: claims.subjectId },
      select: { status: true, authVersion: true },
    });
    return account?.status === 'BANNED' &&
      account.authVersion === claims.authVersion
      ? claims.subjectId
      : null;
  }
}
`,
);
writeFileSync(
  `${auth}/infrastructure/repositories/prisma-account-ban.writer.ts`,
  header(
    "Authentication",
    `${auth}/infrastructure/repositories/prisma-account-ban.writer.ts`,
    "Auth-owned account writes of a permanent ban for guarded root composition.",
    "Runs inside the caller's transaction: status and session revocation commit with the ban record.",
  ) +
    `import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaAccountBanWriter {
  /**
   * Marks the account banned, invalidates every token and revokes sessions.
   * Returns the previous status, or null when it cannot be banned.
   */
  async ban(
    tx: Prisma.TransactionClient,
    subjectId: string,
  ): Promise<'ACTIVE' | 'DEACTIVATED' | null> {
    const account = await tx.user.findUnique({
      where: { id: subjectId },
      select: { status: true },
    });
    const previous = account?.status;
    if (previous !== 'ACTIVE' && previous !== 'DEACTIVATED') return null;
    const changed = await tx.user.updateMany({
      where: { id: subjectId, status: previous },
      data: {
        status: 'BANNED',
        authVersion: { increment: 1 },
        refreshTokenHash: null,
      },
    });
    if (changed.count !== 1) return null;
    await tx.session.updateMany({
      where: { userId: subjectId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return previous;
  }

  /** Returns a banned account to its earlier status. */
  async restore(
    tx: Prisma.TransactionClient,
    subjectId: string,
    status: 'ACTIVE' | 'DEACTIVATED',
  ): Promise<boolean> {
    const changed = await tx.user.updateMany({
      where: { id: subjectId, status: 'BANNED' },
      data: { status, authVersion: { increment: 1 } },
    });
    return changed.count === 1;
  }
}
`,
);
rmSync(`${auth}/contracts/account-bans.contract.ts`);
rmSync(`${auth}/infrastructure/repositories/prisma-account-bans.ts`);
const authModule = `${auth}/auth.module.ts`;
edit(
  authModule,
  "import { AUTH_ACCOUNT_BANS } from './contracts/account-bans.contract';\nimport { PrismaAccountBans } from './infrastructure/repositories/prisma-account-bans';\n",
  "import { AUTH_BAN_TICKETS } from './contracts/ban-tickets.contract';\nimport { PrismaBanTicketReader } from './infrastructure/repositories/prisma-ban-ticket.reader';\n",
);
edit(
  authModule,
  "{ provide: AUTH_ACCOUNT_BANS, useClass: PrismaAccountBans },",
  "{ provide: AUTH_BAN_TICKETS, useClass: PrismaBanTicketReader },",
);
edit(authModule, "    AUTH_ACCOUNT_BANS,\n", "    AUTH_BAN_TICKETS,\n");
edit(
  `${auth}/index.ts`,
  "export {\n  AUTH_ACCOUNT_BANS,\n  type AuthAccountBans,\n  type StatusBeforeBan,\n} from './contracts/account-bans.contract';\n",
  "export {\n  AUTH_BAN_TICKETS,\n  type AuthBanTickets,\n} from './contracts/ban-tickets.contract';\n",
);
writeFileSync(
  `${auth}/infrastructure.ts`,
  `${read(`${auth}/infrastructure.ts`)}export { PrismaAccountBanWriter } from './infrastructure/repositories/prisma-account-ban.writer';\n`,
);

// ---- Moderation: ORM-free port; the ledger writer is a guarded technical export.
writeFileSync(
  `${moderation}/domain/types/account-ban.type.ts`,
  header(
    "Moderation",
    `${moderation}/domain/types/account-ban.type.ts`,
    "Facts of a permanent ban.",
    "A ban is issued once and lifted at most once.",
  ) +
    `export type AccountBanRecord = {
  id: string;
  reference: string;
  subjectId: string;
  issuerId: string;
  ruleCode: string;
  ruleText: string;
  comment: string;
  contextPath: string | null;
  issuedAt: Date;
  liftedAt: Date | null;
  liftedById: string | null;
  liftReason: string | null;
};

export type NewAccountBan = {
  reference: string;
  subjectId: string;
  issuerId: string;
  ruleId: string;
  ruleCode: string;
  ruleText: string;
  comment: string;
  context: { type: string; id: string; path: string | null } | null;
  issuedAt: Date;
};
`,
);
writeFileSync(
  `${moderation}/contracts/ban-transaction.port.ts`,
  header(
    "Moderation",
    `${moderation}/contracts/ban-transaction.port.ts`,
    "Atomic ban commands: the ban record and the account change together.",
    "Root composition implements it; no ORM client or callback crosses it.",
  ) +
    `import type {
  AccountBanRecord,
  NewAccountBan,
} from '../domain/types/account-ban.type';

export interface BanTransaction {
  /** Null when the account cannot be banned (already banned or deleted). */
  issue(ban: NewAccountBan): Promise<AccountBanRecord | null>;
  /** Null when the ban was already lifted. */
  lift(
    banId: string,
    actorId: string,
    reason: string,
  ): Promise<AccountBanRecord | null>;
  /** The banned subject of a valid login ticket. */
  ticketSubject(ticket: string): Promise<string | null>;
}

export const BAN_TRANSACTION = Symbol('BAN_TRANSACTION');
`,
);
rmSync(`${moderation}/contracts/ban-accounts.port.ts`);
writeFileSync(
  `${moderation}/infrastructure/prisma-account-ban.ledger.ts`,
  header(
    "Moderation",
    `${moderation}/infrastructure/prisma-account-ban.ledger.ts`,
    "Moderation-owned ban rows with their audit and Outbox records.",
    "Writes run inside the caller's transaction. Rows are never deleted.",
  ) +
    `import { Injectable } from '@nestjs/common';
import type { AccountBan, Prisma } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type {
  AccountBanRecord,
  NewAccountBan,
} from '../domain/types/account-ban.type';

const PRODUCER = 'dss.api.moderation';

export function accountBanRecord(row: AccountBan): AccountBanRecord {
  return {
    id: row.id,
    reference: row.reference,
    subjectId: row.subjectId,
    issuerId: row.issuerId,
    ruleCode: row.ruleCode,
    ruleText: row.ruleText,
    comment: row.comment,
    contextPath: row.contextPath,
    issuedAt: row.issuedAt,
    liftedAt: row.liftedAt,
    liftedById: row.liftedById,
    liftReason: row.liftReason,
  };
}

@Injectable()
export class PrismaAccountBanLedger {
  constructor(
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async create(
    tx: Prisma.TransactionClient,
    ban: NewAccountBan,
    previousStatus: 'ACTIVE' | 'DEACTIVATED',
  ): Promise<AccountBanRecord> {
    const { context, ...facts } = ban;
    const row = await tx.accountBan.create({
      data: {
        ...facts,
        contextType: context?.type ?? null,
        contextId: context?.id ?? null,
        contextPath: context?.path ?? null,
        previousStatus,
      },
    });
    await this.record(tx, ban.issuerId, 'issued', row);
    return accountBanRecord(row);
  }

  async markLifted(
    tx: Prisma.TransactionClient,
    banId: string,
    actorId: string,
    reason: string,
  ): Promise<{
    record: AccountBanRecord;
    previousStatus: 'ACTIVE' | 'DEACTIVATED';
  } | null> {
    const changed = await tx.accountBan.updateMany({
      where: { id: banId, liftedAt: null },
      data: { liftedAt: new Date(), liftedById: actorId, liftReason: reason },
    });
    if (changed.count !== 1) return null;
    const row = await tx.accountBan.findUniqueOrThrow({
      where: { id: banId },
    });
    await this.record(tx, actorId, 'lifted', row);
    return {
      record: accountBanRecord(row),
      previousStatus:
        row.previousStatus === 'DEACTIVATED' ? 'DEACTIVATED' : 'ACTIVE',
    };
  }

  private async record(
    tx: Prisma.TransactionClient,
    actorId: string,
    verb: 'issued' | 'lifted',
    row: AccountBan,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: \`moderation.ban_\${verb}\`,
      actorType: 'USER',
      actorId,
      targetType: 'AccountBan',
      targetId: row.id,
      metadata: { reference: row.reference, subjectId: row.subjectId },
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: \`moderation.ban.\${verb}.v1\`,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: 'AccountBan', id: row.id },
        payload: { subjectId: row.subjectId, ruleCode: row.ruleCode },
      }),
    );
  }
}
`,
);
writeFileSync(
  `${moderation}/infrastructure.ts`,
  header(
    "Moderation Persistence Composition",
    `${moderation}/infrastructure.ts`,
    "Publishes the owned ban ledger for guarded root composition.",
    "Business code must not import this entry.",
  ) +
    "export { PrismaAccountBanLedger } from './infrastructure/prisma-account-ban.ledger';\n",
);

const service = `${moderation}/infrastructure/prisma-account-ban-records.ts`;
let source = read(service);
const cut = (from, to, replacement) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to);
  if (start < 0 || end < 0 || end < start) throw new Error(`cut ${from}`);
  source = source.slice(0, start) + replacement + source.slice(end);
};
const swap = (search, replace) => {
  if (!source.includes(search)) throw new Error(`service: ${search}`);
  source = source.replace(search, () => replace);
};
cut(
  "import { randomBytes }",
  "export type IssueBanCommand",
  `import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  Permission,
  SUBJECT_ACCESS_READER,
  type SubjectAccessReader,
} from '@api/core/authorization';
import { PrismaService } from '@api/core/database';
import type {
  ModerationActor,
  SanctionContextInput,
} from '../application/moderation-sanctions.commands';
import {
  BAN_TRANSACTION,
  type BanTransaction,
} from '../contracts/ban-transaction.port';
import { banReference } from '../domain/account-ban.rules';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';
import {
  normalizeSanctionContext,
  normalizeSanctionReason,
} from '../domain/moderation-sanction.rules';
import type { AccountBanRecord } from '../domain/types/account-ban.type';
import { accountBanRecord } from './prisma-account-ban.ledger';

`,
);
cut("export type AccountBanRecord = {", "@Injectable()\nexport class", "");
swap(
  `    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(SUBJECT_ACCESS_READER)
    private readonly subjects: SubjectAccessReader,
    @Inject(BAN_ACCOUNTS) private readonly accounts: BanAccounts,`,
  `    private readonly prisma: PrismaService,
    @Inject(SUBJECT_ACCESS_READER)
    private readonly subjects: SubjectAccessReader,
    @Inject(BAN_TRANSACTION) private readonly bans: BanTransaction,`,
);
cut(
  "    return this.prisma.$transaction(async (tx) => {\n      const previousStatus",
  "  /** The ban in force for an account, if any. */",
  `    const issuedAt = new Date();
    const issued = await this.bans.issue({
      reference: banReference(issuedAt, randomBytes(3)),
      subjectId: command.subjectId,
      issuerId: actor.id,
      ruleId: rule.id,
      ruleCode: rule.code,
      ruleText: rule.text,
      comment,
      context,
      issuedAt,
    });
    if (!issued)
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'This account cannot be banned: it is already banned or deleted.',
      );
    return issued;
  }

  async lift(
    actor: ModerationActor,
    banId: string,
    reason: string,
  ): Promise<AccountBanRecord> {
    this.require(actor);
    const liftReason = normalizeSanctionReason(reason);
    const known = await this.prisma.accountBan.findUnique({
      where: { id: banId },
      select: { id: true },
    });
    if (!known)
      throw new ModerationSanctionError('NOT_FOUND', 'Ban not found.');
    const lifted = await this.bans.lift(banId, actor.id, liftReason);
    if (!lifted)
      throw new ModerationSanctionError(
        'INVALID_STATE',
        'This ban was already lifted.',
      );
    return lifted;
  }

`,
);
swap("return row ? this.view(row) : null;", "return row ? accountBanRecord(row) : null;");
swap(
  "const subjectId = await this.accounts.ticketSubject(ticket);",
  "const subjectId = await this.bans.ticketSubject(ticket);",
);
swap("    return this.view(row);\n  }\n\n  private inForce", "    return accountBanRecord(row);\n  }\n\n  private inForce");
cut("  private async liftIn(", "  private inForce", "");
source = source.slice(0, source.indexOf("  private async record(")).trimEnd() + "\n}\n";
writeFileSync(service, source);

edit(
  `${moderation}/presentation/account-bans.resolver.ts`,
  "import {\n  AccountBansService,\n  type AccountBanRecord,\n} from '../infrastructure/prisma-account-ban-records';",
  "import type { AccountBanRecord } from '../domain/types/account-ban.type';\nimport { AccountBansService } from '../infrastructure/prisma-account-ban-records';",
);
edit(
  `${moderation}/index.ts`,
  "export {\n  BAN_ACCOUNTS,\n  type BanAccounts,\n  type BanPreviousStatus,\n} from './contracts/ban-accounts.port';\n",
  "export {\n  BAN_TRANSACTION,\n  type BanTransaction,\n} from './contracts/ban-transaction.port';\nexport type {\n  AccountBanRecord,\n  NewAccountBan,\n} from './domain/types/account-ban.type';\n",
);

// ---- Composition: one transaction over both owners.
writeFileSync(
  `${composition}/prisma-ban.transaction.ts`,
  header(
    "Moderation Bans Composition",
    `${composition}/prisma-ban.transaction.ts`,
    "Joins the Moderation ban ledger and the Auth account change in one transaction.",
    "Wiring only: who may ban whom is decided by Moderation.",
  ) +
    `import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AUTH_BAN_TICKETS, type AuthBanTickets } from '@api/modules/auth';
import { PrismaAccountBanWriter } from '@api/modules/auth/infrastructure';
import type {
  AccountBanRecord,
  BanTransaction,
  NewAccountBan,
} from '@api/modules/moderation';
import { PrismaAccountBanLedger } from '@api/modules/moderation/infrastructure';

/** Rolls the transaction back when the account no longer matches the ban. */
class AccountNotRestorable extends Error {}

@Injectable()
export class PrismaBanTransaction implements BanTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: PrismaAccountBanWriter,
    private readonly ledger: PrismaAccountBanLedger,
    @Inject(AUTH_BAN_TICKETS) private readonly tickets: AuthBanTickets,
  ) {}

  issue(ban: NewAccountBan): Promise<AccountBanRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const previous = await this.accounts.ban(tx, ban.subjectId);
      return previous ? this.ledger.create(tx, ban, previous) : null;
    });
  }

  async lift(
    banId: string,
    actorId: string,
    reason: string,
  ): Promise<AccountBanRecord | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lifted = await this.ledger.markLifted(tx, banId, actorId, reason);
        if (!lifted) return null;
        const restored = await this.accounts.restore(
          tx,
          lifted.record.subjectId,
          lifted.previousStatus,
        );
        if (!restored) throw new AccountNotRestorable();
        return lifted.record;
      });
    } catch (error) {
      if (error instanceof AccountNotRestorable) return null;
      throw error;
    }
  }

  ticketSubject(ticket: string): Promise<string | null> {
    return this.tickets.subjectOf(ticket);
  }
}
`,
);
writeFileSync(
  `${composition}/moderation-bans-integration.module.ts`,
  header(
    "Moderation Bans Composition",
    `${composition}/moderation-bans-integration.module.ts`,
    "Binds Moderation's ban transaction to the Auth and Moderation owners.",
    "Wiring only; no ban rules live here.",
  ) +
    `import { Global, Module } from '@nestjs/common';
import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { AuthModule } from '@api/modules/auth';
import { PrismaAccountBanWriter } from '@api/modules/auth/infrastructure';
import { BAN_TRANSACTION } from '@api/modules/moderation';
import { PrismaAccountBanLedger } from '@api/modules/moderation/infrastructure';
import { PrismaBanTransaction } from './prisma-ban.transaction';

@Global()
@Module({
  imports: [PrismaModule, AuditModule, EventsModule, AuthModule],
  providers: [
    PrismaAccountBanWriter,
    PrismaAccountBanLedger,
    { provide: BAN_TRANSACTION, useClass: PrismaBanTransaction },
  ],
  exports: [BAN_TRANSACTION],
})
export class ModerationBansIntegrationModule {}
`,
);

// ---- Approved public surface.
const test = "scripts/architecture/analyze-boundaries.test.mjs";
edit(
  test,
  '      "AUTH_ACCOUNT_EVIDENCE",\n      "AuthAccountEvidenceReader",\n      "AuthAccountEvidence",\n    ],',
  '      "AUTH_ACCOUNT_EVIDENCE",\n      "AuthAccountEvidenceReader",\n      "AuthAccountEvidence",\n      "AUTH_BAN_TICKETS",\n      "AuthBanTickets",\n    ],',
);
edit(
  test,
  '        "credentialEnrollmentData",\n      ],',
  '        "credentialEnrollmentData",\n        "PrismaAccountBanWriter",\n      ],',
);
edit(
  test,
  '    ["levels", ["leaderboardLevelLookup", "PrismaLevelSynchronizationWriter"]],\n',
  '    ["levels", ["leaderboardLevelLookup", "PrismaLevelSynchronizationWriter"]],\n    ["moderation", ["PrismaAccountBanLedger"]],\n',
);
