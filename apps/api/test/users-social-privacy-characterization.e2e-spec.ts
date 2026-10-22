/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Security
 * 📄 File: apps/api/test/users-social-privacy-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies viewer-safe social-list profile projection through real GraphQL.
 *
 * 🧠 Responsibilities:
 * • owns synthetic users in a fully migrated isolated schema;
 * • authenticates viewers with actual Auth-issued credentials;
 * • verifies private profile fields stay redacted in social-list responses.
 * • preserves page metadata and bounded privacy-query work under real persistence.
 * • isolates presence side effects and controls a late-persistence ordering case.
 *
 * 🏗️ Architecture:
 * Real HTTP security regression with actual Users privacy and Auth credentials.
 *
 * ⚠️ Important:
 * Only synthetic values are used; fixtures own their schemas and do not mock access grants.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { UserSocialGraphService } from '../src/modules/users/application/services/user-social-graph.service';
import { UserBlockService } from '../src/modules/users/application/services/user-block.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import {
  USER_PRIVACY_REPOSITORY,
  type UserPrivacyRepository,
} from '../src/modules/users/domain/repositories/user-privacy.repository.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type SocialList = 'followers' | 'following' | 'blockedUsers';
type Profile = {
  id: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  technologies: string[];
  interests: string[];
  lastSeenAt: string | null;
};
type SocialPage = {
  items: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
const fields = 'id bio location website technologies interests lastSeenAt';

describe('Users social-list privacy (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let presenceTouch: jest.SpiedFunction<UserPresenceService['touch']>;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    // Privacy owns the response snapshot; asynchronous presence has separate tests.
    presenceTouch = jest
      .spyOn(app.get(UserPresenceService), 'touch')
      .mockResolvedValue(undefined);
  }, 60000);
  afterAll(async () => {
    presenceTouch?.mockRestore();
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      username: `privacy-${id}`,
      email: `${id}@dss.test`,
      password: 'synthetic-privacy-password-123',
    });
  }
  async function page(
    kind: SocialList,
    hubId: string,
    token: string,
    number = 1,
    limit = 2,
  ) {
    const queryStart = fixture.queries.length;
    const owner = kind === 'blockedUsers' ? '' : 'userId: $id, ';
    const declaration = kind === 'blockedUsers' ? '' : '($id: ID!)';
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `query${declaration} { page: ${kind}(${owner}pagination: { page: ${number}, limit: ${limit} }) { items { ${fields} } total page limit totalPages } }`,
        variables: kind === 'blockedUsers' ? {} : { id: hubId },
      })
      .expect(200);
    const body = response.body as {
      errors?: unknown;
      data?: { page: SocialPage };
    };
    expect(body.errors).toBeUndefined();
    if (!body.data) throw new Error('Expected social page.');
    const privacyReads = fixture.queries
      .slice(queryStart)
      .filter((sql) => sql.includes('"user_privacy_settings"'));
    expect(privacyReads).toHaveLength(
      (kind === 'blockedUsers' ? 0 : 1) + (body.data.page.items.length ? 1 : 0),
    );
    return body.data.page;
  }

  async function connect(kind: SocialList, hubId: string, subjectId: string) {
    if (kind === 'blockedUsers')
      return app.get(UserBlockService).block(hubId, subjectId);
    const graph = app.get(UserSocialGraphService);
    await graph.follow(
      kind === 'followers' ? subjectId : hubId,
      kind === 'followers' ? hubId : subjectId,
    );
  }

  it.each(['followers', 'following', 'blockedUsers'] as const)(
    '%s redacts each profile without changing total, ordering or page boundaries',
    async (kind) => {
      const hub = await register();
      const viewer = await register();
      const subjects: { profile: Profile; token: string }[] = [];
      for (const [index, visibility] of (
        ['PUBLIC', 'MEMBERS', 'PRIVATE'] as const
      ).entries()) {
        const subject = await register();
        const data = {
          bio: `synthetic-${visibility}`,
          location: 'Synthetic Location',
          website: 'https://dss.test',
          technologies: ['TypeScript'],
          interests: ['Space'],
          lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
        };
        await fixture.prisma.user.update({
          where: { id: subject.user.id },
          data,
        });
        await fixture.prisma.userPrivacySettings.create({
          data: {
            userId: subject.user.id,
            profileVisibility: visibility,
            showLocation: visibility !== 'MEMBERS',
            showWebsite: visibility !== 'MEMBERS',
            showLastSeen: visibility !== 'MEMBERS',
          },
        });
        await connect(kind, hub.user.id, subject.user.id);
        const createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index));
        if (kind === 'blockedUsers') {
          await fixture.prisma.userBlock.updateMany({
            where: { blockerId: hub.user.id, blockedId: subject.user.id },
            data: { createdAt },
          });
        } else {
          await fixture.prisma.userFollow.updateMany({
            where: {
              followerId: kind === 'followers' ? subject.user.id : hub.user.id,
              followingId: kind === 'followers' ? hub.user.id : subject.user.id,
            },
            data: { createdAt },
          });
        }
        subjects.push({
          token: subject.tokens.accessToken,
          profile: {
            ...data,
            id: subject.user.id,
            lastSeenAt: data.lastSeenAt.toISOString(),
          },
        });
      }
      const privateProfile = subjects[2].profile;
      const expected = [
        {
          ...privateProfile,
          bio: null,
          location: null,
          website: null,
          technologies: [],
          interests: [],
          lastSeenAt: null,
        },
        {
          ...subjects[1].profile,
          location: null,
          website: null,
          lastSeenAt: null,
        },
        subjects[0].profile,
      ];
      const token =
        kind === 'blockedUsers'
          ? hub.tokens.accessToken
          : viewer.tokens.accessToken;
      expect(await page(kind, hub.user.id, token)).toEqual({
        items: expected.slice(0, 2),
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
      expect(await page(kind, hub.user.id, token, 2)).toEqual({
        items: expected.slice(2),
        total: 3,
        page: 2,
        limit: 2,
        totalPages: 2,
      });
      expect(await page(kind, hub.user.id, token, 3)).toEqual({
        items: [],
        total: 3,
        page: 3,
        limit: 2,
        totalPages: 2,
      });
      // Owning the list does not grant access to the listed private profiles.
      expect(
        (await page(kind, hub.user.id, hub.tokens.accessToken)).items[0],
      ).toEqual(expected[0]);
      if (kind !== 'blockedUsers') {
        await fixture.prisma.userPrivacySettings.update({
          where: { userId: privateProfile.id },
          data: {
            showLocation: false,
            showWebsite: false,
            showLastSeen: false,
          },
        });
        const ownProfile = (await page(kind, hub.user.id, subjects[2].token))
          .items[0];
        // Presence is controlled in this suite: compare exact seeded facts,
        // not a later database snapshot racing an unrelated asynchronous write.
        const current = await fixture.prisma.user.findUniqueOrThrow({
          where: { id: privateProfile.id },
          select: { lastSeenAt: true },
        });
        expect(current.lastSeenAt?.toISOString()).toBe(
          privateProfile.lastSeenAt,
        );
        expect(ownProfile).toEqual(privateProfile);
        await fixture.prisma.userPrivacySettings.update({
          where: { userId: subjects[0].profile.id },
          data: { profileVisibility: 'PRIVATE' },
        });
        expect((await page(kind, hub.user.id, token, 2)).items[0]).toEqual({
          ...subjects[0].profile,
          bio: null,
          location: null,
          website: null,
          technologies: [],
          interests: [],
          lastSeenAt: null,
        });
      }
    },
    30000,
  );

  it('keeps the exact owner response when presence persists after that response', async () => {
    const owner = await register();
    const hub = await register();
    const initial = new Date('2026-01-01T00:00:00.000Z');
    const later = new Date('2026-01-02T00:00:00.000Z');
    const data = {
      bio: 'synthetic-late-presence-private',
      location: 'Synthetic Location',
      website: 'https://dss.test',
      technologies: ['TypeScript'],
      interests: ['Space'],
      lastSeenAt: initial,
    };
    await fixture.prisma.user.update({ where: { id: owner.user.id }, data });
    await fixture.prisma.userPrivacySettings.create({
      data: {
        userId: owner.user.id,
        profileVisibility: 'PRIVATE',
        showLocation: false,
        showWebsite: false,
        showLastSeen: false,
      },
    });
    await connect('following', hub.user.id, owner.user.id);

    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate;
    });
    const persisted = gate.then(async () => {
      await fixture.prisma.user.update({
        where: { id: owner.user.id },
        data: { lastSeenAt: later },
      });
    });
    presenceTouch.mockImplementationOnce(() => persisted);
    try {
      const response = await page(
        'following',
        hub.user.id,
        owner.tokens.accessToken,
      );
      const expected = {
        ...data,
        id: owner.user.id,
        lastSeenAt: initial.toISOString(),
      };
      expect(presenceTouch).toHaveBeenLastCalledWith(owner.user.id, undefined);
      expect(response.items).toEqual([expected]);
      release();
      await persisted;
      const current = await fixture.prisma.user.findUniqueOrThrow({
        where: { id: owner.user.id },
        select: { lastSeenAt: true },
      });
      expect(current.lastSeenAt?.toISOString()).toBe(later.toISOString());
      expect(response.items).toEqual([expected]);
      expect(response.items[0].lastSeenAt).not.toBe(
        current.lastSeenAt?.toISOString(),
      );
    } finally {
      release();
      await persisted;
      presenceTouch.mockResolvedValue(undefined);
    }
  });

  it('does not return unredacted data when batched privacy evidence fails', async () => {
    const hub = await register();
    const subject = await register();
    await connect('following', hub.user.id, subject.user.id);
    const privacy = app.get<UserPrivacyRepository>(USER_PRIVACY_REPOSITORY);
    const failure = jest
      .spyOn(privacy, 'findManyByUserIds')
      .mockRejectedValueOnce(new Error('synthetic privacy failure'));
    try {
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${hub.tokens.accessToken}`)
        .send({
          query:
            'query($id: ID!) { following(userId: $id) { items { id bio } total } }',
          variables: { id: hub.user.id },
        })
        .expect(200);
      const body = response.body as { errors?: unknown; data?: unknown };
      expect(body.errors).toBeDefined();
      expect(body.data).toBeNull();
    } finally {
      failure.mockRestore();
    }
  });
  it('keeps private fields hidden directly and through a public users followers', async () => {
    const owner = await register();
    const hub = await register();
    const viewer = await register();
    const bio = `synthetic-private-bio-${randomUUID()}`;
    const location = 'Synthetic Hidden Location';
    await fixture.prisma.user.update({
      where: { id: owner.user.id },
      data: { bio, location, interests: ['synthetic-private-interest'] },
    });
    await fixture.prisma.userPrivacySettings.create({
      data: {
        userId: owner.user.id,
        profileVisibility: 'PRIVATE',
        showLocation: false,
        showWebsite: false,
        showLastSeen: false,
      },
    });
    await app.get(UserSocialGraphService).follow(owner.user.id, hub.user.id);
    const direct = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${viewer.tokens.accessToken}`)
      .send({
        query:
          'query($username: String!) { userByUsername(username: $username) { id bio location interests } }',
        variables: { username: owner.user.username },
      })
      .expect(200);
    const directBody = direct.body as {
      errors?: unknown;
      data?: {
        userByUsername: {
          id: string;
          bio: string | null;
          location: string | null;
          interests: string[];
        };
      };
    };
    expect(directBody.errors).toBeUndefined();
    expect(directBody.data?.userByUsername).toEqual({
      id: owner.user.id,
      bio: null,
      location: null,
      interests: [],
    });
    const list = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${viewer.tokens.accessToken}`)
      .send({
        query:
          'query($id: ID!) { followers(userId: $id) { items { id bio location interests } total } }',
        variables: { id: hub.user.id },
      })
      .expect(200);
    const listBody = list.body as {
      errors?: unknown;
      data?: {
        followers: {
          items: {
            id: string;
            bio: string | null;
            location: string | null;
            interests: string[];
          }[];
          total: number;
        };
      };
    };
    expect(listBody.errors).toBeUndefined();
    expect(listBody.data?.followers.items).toContainEqual({
      id: owner.user.id,
      bio: null,
      location: null,
      interests: [],
    });
  });
});
