/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Tests
 * 📄 File: apps/api/src/composition/content-reads/content-read-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins exact minimal Media/Activity projections and private implementation providers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import {
  MediaModule,
  MEDIA_PUBLICATION_EVIDENCE,
  MEDIA_PROFILE_ASSET_COMMANDS,
  MEDIA_IMAGE_ELIGIBILITY,
  MEDIA_PUBLIC_ATTACHMENT_READER,
  type MediaPublicationEvidenceReader,
} from '@api/modules/media';
import {
  ActivityModule,
  ACTOR_ACTIVITY_READER,
  type ActorActivityReader,
} from '@api/modules/activity';
import type { PrismaService } from '@api/core/database';
import { PrismaMediaPublicationEvidenceReader } from '../../modules/media/infrastructure/repositories/prisma-media-publication-evidence.reader';
import { ActorActivityReaderService } from '../../modules/activity/application/services/actor-activity-reader.service';
import type { ActivityFeedService } from '../../modules/activity/application/services/activity-feed.service';
import { NewsMediaEvidenceAdapter } from './infrastructure/news-media-evidence.adapter';
import { ProfileActivityAdapter } from './infrastructure/profile-activity.adapter';

describe('Content read boundaries', () => {
  const date = new Date('2026-10-14');
  const item = {
    id: 'entry',
    actorId: 'subject',
    module: 'NEWS',
    action: 'created',
    subjectType: 'NewsArticle',
    subjectId: 'article',
    occurredAt: date,
  };
  it('keeps Media repositories/upload services and full Activity service private', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, MediaModule)).toEqual([
      MEDIA_PUBLIC_ATTACHMENT_READER,
      MEDIA_PROFILE_ASSET_COMMANDS,
      MEDIA_PUBLICATION_EVIDENCE,
      MEDIA_IMAGE_ELIGIBILITY,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, ActivityModule),
    ).toEqual([ACTOR_ACTIVITY_READER]);
  });
  it('selects only owner/visibility/status and preserves nullable system ownership', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ownerId: null,
      visibility: 'PUBLIC',
      status: 'READY',
      storageKey: 'must not escape',
    });
    const reader = new PrismaMediaPublicationEvidenceReader({
      media: { findUnique },
    } as unknown as PrismaService);
    expect(await reader.findById('media')).toEqual({
      ownerId: null,
      isPublic: true,
      isReady: true,
    });
    expect(findUnique.mock.calls).toEqual([
      [
        {
          where: { id: 'media' },
          select: { ownerId: true, visibility: true, status: true },
        },
      ],
    ]);
  });
  it.each(['PROCESSING', 'REJECTED', 'FAILED', 'DELETED'])(
    'does not synthesize readiness for %s media',
    async (status) => {
      const reader = new PrismaMediaPublicationEvidenceReader({
        media: {
          findUnique: jest.fn().mockResolvedValue({
            ownerId: 'subject',
            status,
            visibility: 'PRIVATE',
          }),
        },
      } as unknown as PrismaService);
      expect(await reader.findById('media')).toEqual({
        ownerId: 'subject',
        isPublic: false,
        isReady: false,
      });
    },
  );
  it('preserves missing Media and read failures', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('Unavailable'));
    const reader = new PrismaMediaPublicationEvidenceReader({
      media: { findUnique },
    } as unknown as PrismaService);
    expect(await reader.findById('missing')).toBeNull();
    await expect(reader.findById('media')).rejects.toThrow('Unavailable');
  });
  it('adapts only needed Media facts and propagates unavailable evidence', async () => {
    const media = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          ownerId: null,
          isPublic: true,
          isReady: false,
          storageKey: 'must not escape',
        })
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Unavailable')),
    } satisfies jest.Mocked<MediaPublicationEvidenceReader>;
    const adapter = new NewsMediaEvidenceAdapter(media);
    expect(await adapter.findById('media')).toEqual({
      ownerId: null,
      isPublic: true,
      isReady: false,
    });
    expect(await adapter.findById('missing')).toBeNull();
    await expect(adapter.findById('media')).rejects.toThrow('Unavailable');
  });
  it('publishes only actor-summary fields with unchanged pagination and copied dates', async () => {
    const byActor = jest.fn().mockResolvedValue({
      items: [
        {
          ...item,
          visibility: 'MEMBERS',
          metadata: { private: 'must not escape' },
        },
      ],
      total: 4,
      page: 2,
      limit: 1,
      totalPages: 4,
    });
    const reader = new ActorActivityReaderService({
      byActor,
    } as unknown as ActivityFeedService);
    const page = await reader.byActor('subject', 2, 1);
    expect(page).toEqual({
      items: [item],
      total: 4,
      page: 2,
      limit: 1,
      totalPages: 4,
    });
    expect(page.items[0].occurredAt).not.toBe(date);
    expect(byActor.mock.calls).toEqual([['subject', 2, 1]]);
  });
  it('adapts only profile activity fields and propagates provider failures', async () => {
    const activity = {
      byActor: jest
        .fn()
        .mockResolvedValueOnce({
          items: [{ ...item, secret: 'must not escape' }],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
        .mockRejectedValueOnce(new Error('Unavailable')),
    } satisfies jest.Mocked<ActorActivityReader>;
    const adapter = new ProfileActivityAdapter(activity);
    expect(await adapter.byActor('subject')).toEqual({
      items: [item],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    await expect(adapter.byActor('subject')).rejects.toThrow('Unavailable');
  });
});
