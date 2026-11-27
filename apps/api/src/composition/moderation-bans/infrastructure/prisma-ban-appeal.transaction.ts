/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation Bans Composition
 * 📄 File: apps/api/src/composition/moderation-bans/infrastructure/prisma-ban-appeal.transaction.ts
 *
 * 🎯 Purpose:
 * Joins the appeal ledger with Media references and, on acceptance, with
 * the ban ledger and the account in one transaction.
 *
 * ⚠️ Important:
 * Every attached screenshot keeps a Media reference: unreferenced files are
 * removed by retention.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { PrismaAccountBanWriter } from '@api/modules/auth/infrastructure';
import type {
  BanAppealRecord,
  BanAppealTransaction,
} from '@api/modules/moderation';
import {
  PrismaAccountBanLedger,
  PrismaBanAppealLedger,
} from '@api/modules/moderation/infrastructure';
import { syncDocumentMediaReferences } from '../../media-references/sync-document-media-references';

/** Rolls the decision back when the ban cannot be lifted with it. */
class BanNotLiftable extends Error {}

const references = (banId: string) => ({
  targetType: 'AccountBan',
  targetId: banId,
  purpose: 'appeal-screenshot',
});

@Injectable()
export class PrismaBanAppealTransaction implements BanAppealTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appeals: PrismaBanAppealLedger,
    private readonly bans: PrismaAccountBanLedger,
    private readonly accounts: PrismaAccountBanWriter,
  ) {}

  attach(banId: string, subjectId: string, mediaId: string): Promise<boolean> {
    return this.changeFiles(banId, subjectId, (tx) =>
      this.appeals.addFile(tx, banId, mediaId),
    );
  }

  detach(banId: string, subjectId: string, fileId: string): Promise<boolean> {
    return this.changeFiles(banId, subjectId, (tx) =>
      this.appeals.removeFile(tx, banId, fileId),
    );
  }

  submit(banId: string, text: string): Promise<BanAppealRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      await this.appeals.lock(tx, banId);
      return this.appeals.create(tx, banId, text);
    });
  }

  async decide(
    appealId: string,
    actorId: string,
    accept: boolean,
    reason: string,
  ): Promise<BanAppealRecord | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const decided = await this.appeals.decide(
          tx,
          appealId,
          actorId,
          accept,
          reason,
        );
        if (decided && accept) await this.lift(tx, decided, actorId, reason);
        return decided;
      });
    } catch (error) {
      if (error instanceof BanNotLiftable) return null;
      throw error;
    }
  }

  private async lift(
    tx: TransactionClient,
    appeal: BanAppealRecord,
    actorId: string,
    reason: string,
  ): Promise<void> {
    const lifted = await this.bans.markLifted(
      tx,
      appeal.banId,
      actorId,
      reason,
    );
    const restored =
      !!lifted &&
      (await this.accounts.restore(
        tx,
        lifted.record.subjectId,
        lifted.previousStatus,
      ));
    if (!restored) throw new BanNotLiftable();
  }

  private changeFiles(
    banId: string,
    subjectId: string,
    change: (tx: TransactionClient) => Promise<string[] | null>,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await this.appeals.lock(tx, banId);
      const attached = await change(tx);
      if (!attached) return false;
      await syncDocumentMediaReferences(
        tx,
        references(banId),
        subjectId,
        attached,
      );
      return true;
    });
  }
}
