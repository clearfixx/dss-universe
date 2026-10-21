/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Persistence
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-mention-profile.selector.ts
 *
 * 🎯 Purpose:
 * Defines the owned parameterized public-handle candidate subquery for atomic mention resolution.
 *
 * 🧠 Responsibilities:
 * • selects id/username only, excluding the author before ambiguity resolution;
 * • preserves existing ILIKE candidate semantics with bound requested handles.
 *
 * 🏗️ Architecture:
 * Guarded technical SQL projection, composed only by root infrastructure.
 *
 * ⚠️ Important:
 * No Auth import, ACTIVE policy, credentials or arbitrary SQL identifiers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaMentionProfileSelector {
  candidates(usernames: readonly string[], authorId: string): Prisma.Sql {
    const matching = usernames.length
      ? Prisma.join(
          usernames.map((username) => Prisma.sql`"username" ILIKE ${username}`),
          ' OR ',
        )
      : Prisma.sql`FALSE`;
    return Prisma.sql`SELECT "id", "username" FROM "users" WHERE "id" <> ${authorId} AND (${matching})`;
  }
}
