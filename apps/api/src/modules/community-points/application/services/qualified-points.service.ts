/** DSS Universe — ordered, independently durable Points facets; no automatic work. */
import { Inject, Injectable } from '@nestjs/common';
import {
  POINTS_RECIPIENT_EXISTENCE,
  type PointsRecipientExistence,
} from '../../contracts/recipient-existence.port';
import {
  QUALIFIED_POINTS_REPOSITORY,
  type QualifiedPointsRepository,
} from '../../domain/repositories/qualified-points.repository.interface';
import { PointQualificationBlockedError } from '../../domain/errors/point-qualification-blocked.error';
import { validateQualifiedPointCommand } from '../../domain/qualified-points.validation';
import type {
  PointFacetResult,
  QualifiedPointCommand,
  QualifiedPointOutcome,
} from '../../domain/types/qualified-points.type';

@Injectable()
export class QualifiedPointsService {
  constructor(
    @Inject(QUALIFIED_POINTS_REPOSITORY)
    private readonly points: QualifiedPointsRepository,
    @Inject(POINTS_RECIPIENT_EXISTENCE)
    private readonly users: PointsRecipientExistence,
  ) {}

  async advance(
    command: QualifiedPointCommand,
  ): Promise<QualifiedPointOutcome> {
    try {
      validateQualifiedPointCommand(command);
      if (!(await this.users.exists(command.recipientId)))
        throw new PointQualificationBlockedError('INVALID_QUALIFICATION');
      const results: PointFacetResult[] = [];
      for (const facet of ['CONTROL', 'CONTRIBUTION'] as const) {
        if (command.facets.includes(facet))
          results.push(await this.points.consumeFacet(command, facet));
      }
      return { status: 'COMPLETE', facets: results };
    } catch (error) {
      if (error instanceof PointQualificationBlockedError)
        return { status: 'BLOCKED', code: error.code };
      throw error;
    }
  }
}
