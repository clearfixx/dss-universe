/** News-owned publication evidence; no content, foreign tables or eligibility. */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';

@Injectable()
export class PrismaPublicationEvidenceReader {
  async read(
    transaction: TransactionClient,
    articleId: string,
    decisionId: string,
  ) {
    const article = await transaction.newsArticle.findUnique({
      where: { id: articleId },
      select: { id: true, authorId: true, status: true, currentVersion: true },
    });
    const decision = await transaction.newsEditorialDecision.findUnique({
      where: { id: decisionId },
      select: {
        id: true,
        articleId: true,
        actorId: true,
        action: true,
        revisionVersion: true,
      },
    });
    if (
      !article ||
      !decision ||
      decision.articleId !== article.id ||
      article.status !== 'PUBLISHED' ||
      decision.action !== 'PUBLISHED' ||
      decision.revisionVersion !== article.currentVersion
    )
      return null;
    // The current workflow has one publication and no withdrawal/reinstatement
    // command. A future publishing cycle needs its own descriptor contract.
    return {
      articleId: article.id,
      authorId: article.authorId,
      actorId: decision.actorId,
      decisionId: decision.id,
      revisionVersion: decision.revisionVersion,
      qualificationRevision: '1' as const,
      contractVersion: 1 as const,
    };
  }
}
