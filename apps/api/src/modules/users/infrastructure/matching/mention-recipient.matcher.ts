/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Handle Matching
 * 📄 File: apps/api/src/modules/users/infrastructure/matching/mention-recipient.matcher.ts
 *
 * 🎯 Purpose:
 * Preserves exact-first/unique locale matching over already eligible mention candidates.
 *
 * 🧠 Responsibilities:
 * • excludes self defensively and compares en-US case-insensitively but accent-sensitively;
 * • deduplicates recipient IDs in requested-name order without accepting ambiguous fallbacks.
 *
 * 🏗️ Architecture:
 * Pure guarded technical matcher; no persistence, account state or authorization policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';

export type MentionProfileCandidate = { id: string; username: string };

@Injectable()
export class MentionRecipientMatcher {
  resolve(
    usernames: readonly string[],
    candidates: readonly MentionProfileCandidate[],
    authorId: string,
  ): string[] {
    const recipientIds = new Set<string>();
    for (const username of usernames) {
      const matches = candidates.filter(
        (candidate) =>
          candidate.id !== authorId &&
          candidate.username.localeCompare(username, 'en-US', {
            sensitivity: 'accent',
          }) === 0,
      );
      const exact = matches.find(
        (candidate) => candidate.username === username,
      );
      if (exact) recipientIds.add(exact.id);
      else if (matches.length === 1 && matches[0])
        recipientIds.add(matches[0].id);
    }
    return [...recipientIds];
  }
}
