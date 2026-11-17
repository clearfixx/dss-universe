/** Owner-only enabled rule facts for activation readiness, no economic policy. */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
@Injectable()
export class PrismaPointRuleConfigurationReader {
  async read(this: void, transaction: TransactionClient) {
    return transaction.communityPointRule.findMany({
      where: { enabled: true },
      select: { eventName: true },
      orderBy: { key: 'asc' },
    });
  }
}
