/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation Bans Composition
 * 📄 File: apps/api/src/composition/moderation-bans/infrastructure/prisma-ban.transaction.ts
 *
 * 🎯 Purpose:
 * Joins the Moderation ban ledger and the Auth account change in one transaction.
 *
 * ⚠️ Important:
 * Wiring only: who may ban whom is decided by Moderation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
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
