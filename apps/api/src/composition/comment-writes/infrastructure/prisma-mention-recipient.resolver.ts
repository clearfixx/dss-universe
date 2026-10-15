/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comment Write Composition
 * 📄 File: apps/api/src/composition/comment-writes/infrastructure/prisma-mention-recipient.resolver.ts
 *
 * 🎯 Purpose:
 * Joins owned Users/Auth projections into one authoritative lookup at the comment write point.
 *
 * 🧠 Responsibilities:
 * • executes one bound candidate SELECT using the supplied transaction;
 * • asks Users to apply unchanged exact/unique handle matching and returns IDs only.
 *
 * 🏗️ Architecture:
 * Operation-specific root infrastructure, not a generic SQL or transaction framework.
 *
 * ⚠️ Important:
 * No profile pre-read, second eligibility query, cross-request cache or implicit isolation change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaActiveSubjectSelector } from '@api/modules/auth/infrastructure';
import {
  PrismaMentionProfileSelector,
  MentionRecipientMatcher,
  type MentionProfileCandidate,
} from '@api/modules/users/infrastructure';

@Injectable()
export class PrismaMentionRecipientResolver {
  constructor(
    private readonly profiles: PrismaMentionProfileSelector,
    private readonly subjects: PrismaActiveSubjectSelector,
    private readonly matcher: MentionRecipientMatcher,
  ) {}

  async resolve(
    transaction: Prisma.TransactionClient,
    usernames: readonly string[],
    authorId: string,
  ): Promise<string[]> {
    if (!usernames.length) return [];
    const candidates = await transaction.$queryRaw<
      MentionProfileCandidate[]
    >(Prisma.sql`SELECT profiles."id", profiles."username"
      FROM (${this.profiles.candidates(usernames, authorId)}) AS profiles
      INNER JOIN (${this.subjects.activeIds()}) AS subjects ON subjects."id" = profiles."id"
      ORDER BY profiles."id" ASC`);
    return this.matcher.resolve(usernames, candidates, authorId);
  }
}
