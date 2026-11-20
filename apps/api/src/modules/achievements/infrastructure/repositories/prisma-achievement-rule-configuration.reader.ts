/** Includes enabled rules on inactive definitions so later enabling cannot bypass readiness. */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
@Injectable()
export class PrismaAchievementRuleConfigurationReader {
  async read(this: void, transaction: TransactionClient) {
    return transaction.achievementRule.findMany({
      where: { enabled: true },
      select: { eventName: true, recipientPayloadKey: true },
      orderBy: { id: 'asc' },
    });
  }
}
