/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Test Infrastructure
 * 📄 File: apps/api/test/media-platform.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies Media v1 persistence relations, storage identities and reference-aware deletion.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../src/modules/media/domain/repositories/media.repository.interface';
import { MediaKind } from '../src/modules/media/domain/enums/media-kind.enum';
import { MediaStatus } from '../src/modules/media/domain/enums/media-status.enum';
import { MediaStorageProvider } from '../src/modules/media/domain/enums/media-storage-provider.enum';
import { MediaVisibility } from '../src/modules/media/domain/enums/media-visibility.enum';

describe('DSS Media Platform v1 schema (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mediaRepository: MediaRepository;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    mediaRepository = app.get<MediaRepository>(MEDIA_REPOSITORY);
  });

  it('persists Media through the repository boundary', async () => {
    const suffix = `repository-${Date.now()}`;
    const media = await mediaRepository.create({
      kind: MediaKind.IMAGE,
      status: MediaStatus.READY,
      visibility: MediaVisibility.PRIVATE,
      storageProvider: MediaStorageProvider.LOCAL,
      bucket: 'media-test',
      storageKey: `repository/${suffix}.webp`,
      originalFilename: 'repository.png',
      mimeType: 'image/webp',
      extension: 'webp',
      size: 1024,
      checksum: `checksum-${suffix}`,
    });

    expect(await mediaRepository.findById(media.id)).toMatchObject({
      id: media.id,
      status: MediaStatus.READY,
    });
    expect(await mediaRepository.countActiveReferences(media.id)).toBe(0);

    const deleted = await mediaRepository.softDelete(media.id);
    expect(deleted.status).toBe(MediaStatus.DELETED);
    expect(deleted.deletedAt).toBeInstanceOf(Date);

    await prisma.media.delete({ where: { id: media.id } });
  });

  it('persists variants, references, upload sessions and lifecycle audit', async () => {
    const suffix = Date.now().toString();
    const user = await prisma.user.create({
      data: {
        email: `media-${suffix}@dss.test`,
        username: `media-${suffix}`,
        passwordHash: 'not-a-real-password-hash',
      },
    });
    const media = await prisma.media.create({
      data: {
        ownerId: user.id,
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PRIVATE',
        storageProvider: 'LOCAL',
        bucket: 'media-test',
        storageKey: `original/${suffix}.webp`,
        originalFilename: 'avatar.png',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 2048,
        checksum: `checksum-${suffix}`,
        width: 512,
        height: 512,
        readyAt: new Date(),
        variants: {
          create: {
            name: 'avatar-128',
            storageProvider: 'LOCAL',
            bucket: 'media-test',
            storageKey: `variants/${suffix}-128.webp`,
            mimeType: 'image/webp',
            extension: 'webp',
            size: 512,
            checksum: `variant-checksum-${suffix}`,
            width: 128,
            height: 128,
          },
        },
        references: {
          create: {
            targetType: 'User',
            targetId: user.id,
            purpose: 'AVATAR',
            createdBy: user.id,
          },
        },
        auditLogs: {
          create: {
            action: 'media.ready',
            actorId: user.id,
            correlationId: `correlation-${suffix}`,
          },
        },
      },
      include: { variants: true, references: true, auditLogs: true },
    });
    const session = await prisma.mediaUploadSession.create({
      data: {
        ownerId: user.id,
        policyKey: 'USER_AVATAR',
        status: 'INITIATED',
        storageProvider: 'LOCAL',
        bucket: 'media-test',
        temporaryKey: `temporary/${suffix}`,
        originalFilename: 'avatar.png',
        declaredMimeType: 'image/png',
        declaredSize: 4096,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    expect(media).toMatchObject({
      status: 'READY',
      variants: [{ name: 'avatar-128' }],
      references: [{ purpose: 'AVATAR' }],
      auditLogs: [{ action: 'media.ready' }],
    });
    await expect(
      prisma.media.delete({ where: { id: media.id } }),
    ).rejects.toThrow();

    await prisma.mediaReference.deleteMany({ where: { mediaId: media.id } });
    await prisma.media.delete({ where: { id: media.id } });
    await prisma.mediaUploadSession.delete({ where: { id: session.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  afterAll(async () => app.close());
});
