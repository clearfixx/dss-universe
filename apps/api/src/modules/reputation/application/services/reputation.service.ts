/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/application/services/reputation.service.ts
 *
 * 🎯 Purpose:
 * Enforces direct reputation policy and coordinates append-only ledger writes.
 *
 * 🧠 Responsibilities:
 * • validates actor, recipient, reason and account age;
 * • enforces one actor-to-recipient decision per rolling 24 hours;
 * • appends compensating reversals without mutating history;
 * • exposes public, explainable reputation history.
 *
 * 🏗️ Architecture:
 * Owned reputation policy consumes separate minimal account, block and existence ports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  REPUTATION_ACCOUNT_READER,
  type ReputationAccountReader,
} from '../../contracts/account-evidence.port';
import {
  REPUTATION_BLOCK_READER,
  type ReputationBlockReader,
} from '../../contracts/block-decision.port';
import {
  REPUTATION_PROFILE_EXISTENCE,
  type ReputationProfileExistence,
} from '../../contracts/profile-existence.port';

import {
  REPUTATION_REPOSITORY,
  type ReputationRepository,
} from '../../domain/repositories/reputation.repository.interface';
import type {
  ReputationEntry,
  ReputationHistory,
  ReputationPolicy,
  ReputationValue,
} from '../../domain/types/reputation.type';

const REPUTATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

@Injectable()
export class ReputationService {
  constructor(
    @Inject(REPUTATION_REPOSITORY)
    private readonly reputation: ReputationRepository,
    @Inject(REPUTATION_ACCOUNT_READER)
    private readonly accounts: ReputationAccountReader,
    @Inject(REPUTATION_BLOCK_READER)
    private readonly blocks: ReputationBlockReader,
    @Inject(REPUTATION_PROFILE_EXISTENCE)
    private readonly profiles: ReputationProfileExistence,
  ) {}

  getPolicy(): Promise<ReputationPolicy> {
    return this.reputation.policy();
  }

  updatePolicy(
    minimumAccountAgeDays: number,
    updatedById: string,
  ): Promise<ReputationPolicy> {
    if (
      !Number.isInteger(minimumAccountAgeDays) ||
      minimumAccountAgeDays < 0 ||
      minimumAccountAgeDays > 3650
    ) {
      throw new BadRequestException(
        'Minimum account age must be between 0 and 3650 days.',
      );
    }
    return this.reputation.updatePolicy(minimumAccountAgeDays, updatedById);
  }

  async give(
    actorId: string,
    recipientId: string,
    value: ReputationValue,
    reason: string,
  ): Promise<ReputationEntry> {
    if (actorId === recipientId) {
      throw new BadRequestException('You cannot change your own reputation.');
    }
    if (value !== 1 && value !== -1) {
      throw new BadRequestException('Reputation value must be +1 or -1.');
    }
    const cleanReason = this.reason(reason);
    const [actor, recipient, policy, blocked] = await Promise.all([
      this.accounts.find(actorId),
      this.accounts.find(recipientId),
      this.reputation.policy(),
      this.blocks.isBlocked(actorId, recipientId),
    ]);
    if (!actor || !actor.active) {
      throw new BadRequestException('The reputation actor is not active.');
    }
    if (!recipient || !recipient.active) {
      throw new BadRequestException('The reputation recipient is not active.');
    }
    if (blocked) {
      throw new BadRequestException(
        'Reputation is unavailable between blocked users.',
      );
    }
    const eligibleAt =
      actor.createdAt.getTime() +
      policy.minimumAccountAgeDays * 24 * 60 * 60 * 1000;
    if (Date.now() < eligibleAt) {
      throw new BadRequestException(
        `Your account must be at least ${policy.minimumAccountAgeDays} days old.`,
      );
    }
    const entry = await this.reputation.createDirect({
      actorId,
      recipientId,
      value,
      reason: cleanReason,
      cooldownStartedAfter: new Date(Date.now() - REPUTATION_COOLDOWN_MS),
    });
    if (!entry) {
      throw new ConflictException(
        'You may rate this user only once per rolling 24 hours.',
      );
    }
    return entry;
  }

  async reverse(
    entryId: string,
    moderatorId: string,
    reason: string,
  ): Promise<ReputationEntry> {
    const original = await this.reputation.findOriginalById(entryId);
    if (!original) {
      throw new NotFoundException('Reputation entry not found.');
    }
    if (original.reversal) {
      throw new ConflictException('Reputation entry is already reversed.');
    }
    const reversal = await this.reputation.reverse(
      entryId,
      moderatorId,
      original.recipientId,
      original.value === 1 ? -1 : 1,
      this.reason(reason),
    );
    if (!reversal) {
      throw new ConflictException('Reputation entry is already reversed.');
    }
    return reversal;
  }

  async history(
    recipientId: string,
    page = 1,
    limit = 20,
  ): Promise<ReputationHistory> {
    if (!(await this.profiles.exists(recipientId))) {
      throw new NotFoundException('Reputation recipient not found.');
    }
    return this.reputation.history(recipientId, page, limit);
  }

  private reason(value: string): string {
    const reason = value.trim();
    if (
      reason.length < MIN_REASON_LENGTH ||
      reason.length > MAX_REASON_LENGTH
    ) {
      throw new BadRequestException(
        `Reason must contain ${MIN_REASON_LENGTH} to ${MAX_REASON_LENGTH} characters.`,
      );
    }
    return reason;
  }
}

/**
 * ⭐ Reputation without a reason is just a mysterious button. DSS prefers
 * explainable gravity.
 */
