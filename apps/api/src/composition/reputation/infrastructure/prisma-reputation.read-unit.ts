/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/prisma-reputation.read-unit.ts
 *
 * 🎯 Purpose:
 * Composes owned ledger and public actor reads without foreign SQL in Reputation.
 *
 * 🧠 Responsibilities:
 * • retains default-isolation history transaction and original query ordering;
 * • retains independent original-entry reads and fail-closed actor composition.
 *
 * 🏗️ Architecture:
 * Root infrastructure implementing the consumer-owned semantic read port.
 *
 * ⚠️ Important:
 * No Repeatable Read, cache, timeout or new profile/status policy is introduced.
 * Business contracts never receive the explicit infrastructure client.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  ReputationEntryReader,
  ReputationEntry,
  ReputationActor,
} from '@api/modules/reputation';
import {
  PrismaReputationEntryReader,
  type ReputationEntryFact,
} from '@api/modules/reputation/infrastructure';
import { PrismaReputationActorReader } from '@api/modules/users/infrastructure';

@Injectable()
export class PrismaReputationReadUnit implements ReputationEntryReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entries: PrismaReputationEntryReader,
    private readonly actors: PrismaReputationActorReader,
  ) {}

  async findOriginalById(id: string): Promise<ReputationEntry | null> {
    const entry = await this.entries.original(this.prisma, id);
    if (!entry) return null;
    const [result] = await this.hydrate(this.prisma, [entry]);
    return result;
  }

  history(recipientId: string, page: number, limit: number) {
    return this.prisma.$transaction(async (transaction) => {
      const facts = await this.entries.page(
        transaction,
        recipientId,
        page,
        limit,
      );
      const items = await this.hydrate(transaction, facts);
      const total = await this.entries.total(transaction, recipientId);
      const score = await this.entries.score(transaction, recipientId);
      return {
        items,
        total,
        score,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  private async hydrate(
    transaction: Prisma.TransactionClient,
    entries: ReputationEntryFact[],
  ): Promise<ReputationEntry[]> {
    if (!entries.length) return [];
    // Match the former relation-query schedule; combining actor batches would move a Read Committed observation point.
    const actors = await this.actors.read(
      transaction,
      entries.map(({ actorId }) => actorId),
    );
    const reversals = await this.entries.reversals(
      transaction,
      entries.map(({ id }) => id),
    );
    const reversalActors = await this.actors.read(
      transaction,
      reversals.map(({ actorId }) => actorId),
    );
    const byOriginal = new Map(
      reversals.map((row) => [row.reversesEntryId, row]),
    );
    const actor = (
      profiles: Map<string, ReputationActor>,
      id: string,
    ): ReputationActor => {
      const found = profiles.get(id);
      if (!found) throw new Error('Reputation actor evidence is incomplete.');
      return {
        id: found.id,
        username: found.username,
        displayName: found.displayName,
        avatarUrl: found.avatarUrl,
      };
    };
    return entries.map(({ actorId, ...entry }) => {
      const reversed = byOriginal.get(entry.id);
      return {
        ...entry,
        value: entry.value as -1 | 1,
        actor: actor(actors, actorId),
        reversal: reversed
          ? {
              id: reversed.id,
              reason: reversed.reason,
              createdAt: reversed.createdAt,
              actor: actor(reversalActors, reversed.actorId),
            }
          : null,
      };
    });
  }
}

/**
 * The ledger remembers the score. Users still owns the name on the scoreboard. 🛰️
 */
