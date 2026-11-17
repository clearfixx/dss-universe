/** Fenced orchestration only. Owners retain eligibility, ledger and level policy.
 * Each owner transaction is outside receipt transactions; fencing cannot cancel
 * an owner already in flight. Replays therefore rely on durable owner receipts.
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  QUALIFIED_POINTS_CONSUMER,
  type QualifiedPointsConsumer,
} from '@api/modules/community-points';
import {
  LEVEL_EVENT_CONSUMER,
  type LevelEventConsumer,
} from '@api/modules/levels';
import {
  QUALIFIED_ACHIEVEMENT_CONSUMER,
  type QualifiedAchievementConsumer,
} from '@api/modules/achievements';
import { GAMIFICATION_CONSUMPTION } from '../contracts/consumption.constants';
import type {
  ConsumptionClaim,
  ConsumptionOwner,
  GamificationConsumption,
  OwnerCompletion,
} from '../contracts/consumption.types';
import { AdmissionCodecError } from '../infrastructure/admission-codec.error';

export type CoordinationResult =
  | 'IDLE'
  | 'PROCESSED'
  | 'STALE'
  | 'BLOCKED'
  | 'CONTINUED';

@Injectable()
export class GamificationCoordinator {
  constructor(
    @Inject(GAMIFICATION_CONSUMPTION)
    private readonly consumption: GamificationConsumption,
    @Inject(QUALIFIED_POINTS_CONSUMER)
    private readonly points: QualifiedPointsConsumer,
    @Inject(LEVEL_EVENT_CONSUMER) private readonly levels: LevelEventConsumer,
    @Inject(QUALIFIED_ACHIEVEMENT_CONSUMER)
    private readonly achievements: QualifiedAchievementConsumer,
  ) {}

  async processOne(): Promise<CoordinationResult> {
    const [claim] = await this.consumption.claim(1);
    return claim ? this.processClaim(claim) : 'IDLE';
  }

  async processClaim(claim: ConsumptionClaim): Promise<CoordinationResult> {
    try {
      for (const owner of ['POINTS', 'LEVELS', 'ACHIEVEMENTS'] as const) {
        // Fresh token check before every effect, never cached across owners.
        const work = await this.consumption.load(claim);
        if (!work) return 'STALE';
        if (work.done[owner]) continue;
        const inputs = work.projection.inputs;
        let outcome: OwnerCompletion;
        if (owner === 'POINTS') {
          if (!('POINTS' in inputs))
            throw new AdmissionCodecError('INVALID_QUALIFIED_PROJECTION');
          const result = await this.points.advance(inputs.POINTS.command);
          if (result.status === 'BLOCKED') {
            return (await this.consumption.block(claim, {
              owner,
              code: result.code,
            })) === 'APPLIED'
              ? 'BLOCKED'
              : 'STALE';
          }
          // Completion says the owner processed its facets, not that it awarded.
          outcome = { owner, disposition: 'COMPLETE' };
        } else if (owner === 'LEVELS') {
          if (!('LEVELS' in inputs))
            throw new AdmissionCodecError('INVALID_QUALIFIED_PROJECTION');
          const command = inputs.LEVELS.command;
          await this.levels.consume({
            eventId: command.eventId,
            eventName: command.eventName,
            eventVersion: command.eventVersion,
            producer: command.producer,
            category: 'integration',
            occurredAt: command.occurredAt,
            aggregateType: command.sourceType ?? undefined,
            aggregateId: command.sourceId ?? undefined,
            payload: { userId: command.userId },
          });
          outcome = { owner, disposition: 'SYNCED' };
        } else {
          const result = await this.achievements.advance(
            inputs.ACHIEVEMENTS.command,
          );
          if (result.status === 'BLOCKED')
            return (await this.consumption.block(claim, {
              owner,
              code: result.code,
            })) === 'APPLIED'
              ? 'BLOCKED'
              : 'STALE';
          if (result.status === 'CONTINUE')
            return (await this.consumption.continueOwner(claim, {
              owner,
              progress: result.progress,
            })) === 'APPLIED'
              ? 'CONTINUED'
              : 'STALE';
          outcome = { owner, disposition: 'COMPLETE' };
        }
        if (
          (await this.consumption.completeOwner(claim, outcome)) !== 'APPLIED'
        )
          return 'STALE';
        if (
          (['POINTS', 'LEVELS', 'ACHIEVEMENTS'] as const).every(
            (candidate: ConsumptionOwner) =>
              candidate === owner || work.done[candidate],
          )
        )
          return 'PROCESSED';
      }
      return 'PROCESSED';
    } catch (error) {
      // CAS records a technical failure only for the still-current claim. If
      // storage also fails, leave recovery to its existing lease rather than
      // replacing the original owner/provider failure with a cleanup failure.
      try {
        await this.consumption.fail(
          claim,
          error instanceof AdmissionCodecError
            ? 'SEAL_READ_FAILURE'
            : 'OWNER_FAILURE',
        );
      } catch {
        /* Original failure identity belongs to the caller. */
      }
      throw error;
    }
  }
}

/** Кур’єр може подзвонити двічі. Бухгалтерія все одно перевірить квитанцію. */
