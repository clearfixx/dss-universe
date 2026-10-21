/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform Tests
 * 📄 File: apps/api/src/modules/interactions/application/services/audience-engagement.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies explicit viewer authorization, unchanged visitor hashing and no writes after denial/failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash } from 'node:crypto';

import { ForbiddenException } from '@nestjs/common';

import type { AudienceEngagementRepository } from '../../domain/repositories/audience-engagement.repository.interface';
import type { InteractionTargetsService } from './interaction-targets.service';
import { AudienceEngagementService } from './audience-engagement.service';

describe('AudienceEngagementService', () => {
  const summary = { changed: true, viewCount: 1, shareCount: 0, shares: [] };
  let repository: jest.Mocked<AudienceEngagementRepository>;
  let targets: Pick<InteractionTargetsService, 'authorize'>;
  let authorize: jest.Mock;
  let recordView: jest.Mock;
  let recordShare: jest.Mock;
  let service: AudienceEngagementService;

  beforeEach(() => {
    recordView = jest.fn().mockResolvedValue(summary);
    recordShare = jest.fn().mockResolvedValue(summary);
    repository = { recordView, recordShare };
    authorize = jest.fn().mockResolvedValue({ allowed: true });
    targets = { authorize };
    service = new AudienceEngagementService(
      repository,
      targets as InteractionTargetsService,
    );
  });

  it('uses one stable account identity across devices', async () => {
    await service.recordView('target-1', 'browser-1', 'user-1');
    expect(authorize).toHaveBeenCalledWith(
      'target-1',
      { kind: 'AUTHENTICATED', subjectId: 'user-1' },
      'READ',
    );
    expect(recordView).toHaveBeenCalledWith(
      'target-1',
      'user:user-1',
      'user-1',
    );
  });

  it('hashes anonymous browser identities before persistence', async () => {
    await service.recordView('target-1', 'browser-1');
    expect(authorize).toHaveBeenCalledWith(
      'target-1',
      { kind: 'GUEST' },
      'READ',
    );
    const digest = createHash('sha256').update('browser-1').digest('hex');
    expect(recordView).toHaveBeenCalledWith(
      'target-1',
      `guest:${digest}`,
      undefined,
    );
  });

  it.each(['view', 'share'] as const)(
    'does not call the repository after %s owner failure',
    async (kind) => {
      authorize.mockRejectedValue(new Error('Synthetic owner unavailable'));
      await expect(
        kind === 'view'
          ? service.recordView('target-1', 'browser-1')
          : service.recordShare('target-1', 'COPY_LINK', 'browser-1'),
      ).rejects.toThrow('Synthetic owner unavailable');
      expect(recordView).not.toHaveBeenCalled();
      expect(recordShare).not.toHaveBeenCalled();
    },
  );
  it('does not persist a share denied by the owner policy', async () => {
    authorize.mockResolvedValue({ allowed: false, reason: 'DISABLED' });
    await expect(
      service.recordShare('target-1', 'FACEBOOK', 'browser-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(recordShare).not.toHaveBeenCalled();
  });
});
