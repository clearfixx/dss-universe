/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API Test Infrastructure
 * 📄 File: apps/api/test/app.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies REST compatibility and the GraphQL Auth/Users vertical slice.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { Test, type TestingModule } from '@nestjs/testing';
import { printSchema } from 'graphql';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';
import request from 'supertest';
import type { Job } from 'bullmq';
import type { IntegrationEventJob, MediaProcessingJob } from '@dss/jobs';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';
import { QueueRegistryService } from './../src/core/queue';
import { StorageService } from './../src/core/storage';
import { MediaRetentionService } from './../src/modules/media/application/services/media-retention.service';
import { LocalMediaFileProcessor } from '../../worker/src/local-media-file.processor';
import { createMediaProcessingProcessor } from '../../worker/src/media-processing.processor';
import { PostgresMediaProcessingStore } from '../../worker/src/postgres-media-processing.store';
import { PostgresActivityProjector } from '../../worker/src/postgres-activity.projector';

const E2E_UPLOADS_DIR = `.e2e-uploads-${process.pid}`;
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

type GraphqlErrorResponse = {
  errors: Array<{ extensions: { code: string } }>;
};

type RegisterResponse = {
  data: {
    register: {
      user: { id: string; email: string; username: string };
      tokens: { accessToken: string };
    };
  };
};

type RegisterErrorResponse = {
  errors?: Array<{ extensions: { code: string } }>;
};

type ReactivateResponse = {
  data: {
    reactivateAccount: {
      user: { id: string; email: string; username: string };
      tokens: { accessToken: string };
    };
  };
  errors?: Array<{ extensions: { code: string } }>;
};

type LoginResponse = {
  data: {
    login: {
      user: { id: string; email: string; username: string };
      tokens: { accessToken: string };
    };
  };
  errors?: Array<{ extensions: { code: string } }>;
};

type InitiateMediaUploadResponse = {
  data: {
    initiateMediaUpload: {
      id: string;
      policyKey: string;
      status: string;
      declaredMimeType: string;
      expiresAt: string;
    };
  };
  errors?: Array<{ message: string }>;
};

describe('DSS API (e2e)', () => {
  let app: INestApplication<App>;
  let processingPool: Pool;

  beforeAll(async () => {
    process.env.DSS_UPLOADS_DIR = E2E_UPLOADS_DIR;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    processingPool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  it('preserves the REST application status endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({ app: 'DSS Universe API', status: 'ok' });
  });

  it('exposes separate liveness and dependency readiness with request IDs', async () => {
    const live = await request(app.getHttpServer())
      .get('/api/health/live')
      .set('x-request-id', 'dss-health-proof')
      .expect(200);
    expect(live.headers['x-request-id']).toBe('dss-health-proof');
    expect(live.body).toMatchObject({ status: 'ok', service: 'dss-api' });

    const ready = await request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200);
    expect(ready.body).toMatchObject({
      status: 'ok',
      database: { status: 'up' },
      redis: { status: 'up' },
      queues: { status: 'up' },
    });
  });

  it('exposes the GraphQL transport status query', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: '{ apiInfo { name status transport } }' })
      .expect(200);

    expect(response.body).toEqual({
      data: {
        apiInfo: {
          name: 'DSS Universe API',
          status: 'ok',
          transport: 'graphql',
        },
      },
    });
  });

  it('generates a deterministic schema without authentication secrets', () => {
    const schema = printSchema(app.get(GraphQLSchemaHost).schema);

    expect(schema).toContain('type Viewer');
    expect(schema).toContain('register(input: RegisterInput!)');
    expect(schema).toContain(
      'deactivateAccount(input: DeactivateAccountInput!)',
    );
    expect(schema).toContain('reactivateAccount(input: LoginInput!)');
    expect(schema).toContain('changeViewerEmail(input: ChangeEmailInput!)');
    expect(schema).toContain(
      'changeViewerPassword(input: ChangePasswordInput!)',
    );
    expect(schema).toContain('viewerSessions: [AuthSession!]!');
    expect(schema).toContain('revokeViewerSession(sessionId: ID!)');
    expect(schema).toContain('revokeOtherViewerSessions');
    expect(schema).toContain(
      'viewerNotificationPreferences: NotificationPreferences!',
    );
    expect(schema).toContain(
      'updateViewerNotificationPreferences(input: UpdateNotificationPreferencesInput!)',
    );
    expect(schema).toContain('presenceSummary: PresenceSummary!');
    expect(schema).toContain('viewerProfileCompletion: ProfileCompletion!');
    expect(schema).toContain(
      'userActivity(pagination: UsersPageInput, userId: ID!): UserActivityPage!',
    );
    expect(schema).toContain('users(pagination: UsersPageInput)');
    expect(schema).toContain('setViewerAvatar(mediaId: ID!)');
    expect(schema).toContain('removeViewerAvatar: Viewer!');
    expect(schema).toContain(
      'mediaAccessUrl(mediaId: ID!, variantName: String!): MediaAccess!',
    );
    expect(schema).not.toContain('passwordHash');
    expect(schema).not.toContain('refreshTokenHash');
  });

  it('returns a stable unauthenticated GraphQL error code', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: '{ viewer { id } }' })
      .expect(200);
    const body = response.body as GraphqlErrorResponse;

    expect(body.errors[0]?.extensions.code).toBe('UNAUTHENTICATED');
  });

  it('rejects GraphQL operations above the complexity limit', async () => {
    const fields = Array.from(
      { length: 251 },
      (_, index) => `status${index}: apiInfo { status }`,
    ).join('\n');
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: `{ ${fields} }` })
      .expect(400);

    const body = response.body as GraphqlErrorResponse;

    expect(body.errors).toBeDefined();
  });

  it('registers and resolves the authenticated viewer through GraphQL', async () => {
    const suffix = String(Date.now()) + Math.random().toString(16).slice(2);
    const username = 'astronaut-' + suffix;
    const email = username + '@dss.test';
    const registration = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation {
          register(input: {
            email: "${email}"
            username: "${username}"
            displayName: "Phase Three Astronaut"
            password: "dss-test-password"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      });
    const registered = registration.body as RegisterResponse;
    const registrationError = registration.body as RegisterErrorResponse;

    expect(registrationError.errors).toBeUndefined();
    expect(registration.status).toBe(200);
    const accessToken = registered.data.register.tokens.accessToken;

    expect(registered.data.register.user.email).toBe(email);

    const viewer = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({ query: '{ viewer { id email username } }' })
      .expect(200);

    expect(viewer.body).toEqual({
      data: {
        viewer: registered.data.register.user,
      },
    });

    const updatedProfile = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation UpdateViewerProfile($input: UpdateViewerProfileInput!) {
          updateViewerProfile(input: $input) {
            id displayName bio location website technologies interests
          }
        }`,
        variables: {
          input: {
            displayName: '  Commander Andrii  ',
            bio: 'Building the DSS Universe',
            location: '  Kyiv, Ukraine ',
            website: 'https://dss.example/profile',
            technologies: [' TypeScript ', 'typescript', 'NestJS'],
            interests: ['Open source', ' Space '],
          },
        },
      })
      .expect(200);
    expect(updatedProfile.body).toEqual({
      data: {
        updateViewerProfile: {
          id: registered.data.register.user.id,
          displayName: 'Commander Andrii',
          bio: 'Building the DSS Universe',
          location: 'Kyiv, Ukraine',
          website: 'https://dss.example/profile',
          technologies: ['typescript', 'NestJS'],
          interests: ['Open source', 'Space'],
        },
      },
    });

    const updatedSocialLinks = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation UpdateViewerSocialLinks(
          $input: UpdateViewerSocialLinksInput!
        ) {
          updateViewerSocialLinks(input: $input) {
            platform label url position
          }
        }`,
        variables: {
          input: {
            links: [
              {
                platform: 'GitHub',
                label: '  Open Source ',
                url: 'https://github.com/dss-universe',
              },
              {
                platform: 'LinkedIn',
                url: 'https://linkedin.com/in/dss-universe',
              },
            ],
          },
        },
      })
      .expect(200);
    expect(updatedSocialLinks.body).toEqual({
      data: {
        updateViewerSocialLinks: [
          {
            platform: 'github',
            label: 'Open Source',
            url: 'https://github.com/dss-universe',
            position: 0,
          },
          {
            platform: 'linkedin',
            label: null,
            url: 'https://linkedin.com/in/dss-universe',
            position: 1,
          },
        ],
      },
    });

    const deniedProfileCompletion = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: '{ viewerProfileCompletion { percentage } }' })
      .expect(200);
    expect(
      (deniedProfileCompletion.body as GraphqlErrorResponse).errors[0]
        .extensions.code,
    ).toBe('UNAUTHENTICATED');

    const profileCompletion = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query {
          viewerProfileCompletion {
            percentage completedCount totalCount isComplete
            completedFields missingFields
          }
        }`,
      })
      .expect(200);
    expect(profileCompletion.body).toEqual({
      data: {
        viewerProfileCompletion: {
          percentage: 75,
          completedCount: 6,
          totalCount: 8,
          isComplete: false,
          completedFields: [
            'BIO',
            'LOCATION',
            'WEBSITE',
            'TECHNOLOGIES',
            'INTERESTS',
            'SOCIAL_LINKS',
          ],
          missingFields: ['AVATAR', 'COVER'],
        },
      },
    });

    const userLookup = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .set('Content-Type', 'application/json')
      .send(
        JSON.stringify({
          query:
            'query UserByUsername($username: String!) { userByUsername(username: $username) { id username location technologies socialLinks { platform url position } } }',
          variables: { username },
        }),
      );

    expect(userLookup.body).not.toHaveProperty('errors');
    expect(userLookup.status).toBe(200);

    expect(userLookup.body).toEqual({
      data: {
        userByUsername: {
          id: registered.data.register.user.id,
          username,
          location: 'Kyiv, Ukraine',
          technologies: ['typescript', 'NestJS'],
          socialLinks: [
            {
              platform: 'github',
              url: 'https://github.com/dss-universe',
              position: 0,
            },
            {
              platform: 'linkedin',
              url: 'https://linkedin.com/in/dss-universe',
              position: 1,
            },
          ],
        },
      },
    });
    const defaultPrivacy = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query {
          viewerPrivacySettings {
            profileVisibility showLocation showWebsite showSocialLinks
            showLastSeen showOnlineStatus allowFollowers showFollows allowWallPosts
          }
        }`,
      })
      .expect(200);
    expect(defaultPrivacy.body).toEqual({
      data: {
        viewerPrivacySettings: {
          profileVisibility: 'PUBLIC',
          showLocation: true,
          showWebsite: true,
          showSocialLinks: true,
          showLastSeen: false,
          showOnlineStatus: true,
          allowFollowers: true,
          showFollows: true,
          allowWallPosts: true,
        },
      },
    });

    const privacyUpdate = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation UpdateViewerPrivacy(
          $input: UpdateUserPrivacyInput!
        ) {
          updateViewerPrivacy(input: $input) {
            profileVisibility showLocation showWebsite showSocialLinks
            showLastSeen showOnlineStatus allowFollowers showFollows allowWallPosts
          }
        }`,
        variables: {
          input: {
            profileVisibility: 'PRIVATE',
            showLocation: true,
            showWebsite: true,
            showSocialLinks: true,
            showLastSeen: true,
            showOnlineStatus: true,
            allowFollowers: true,
            showFollows: true,
            allowWallPosts: true,
          },
        },
      });
    expect(privacyUpdate.status).toBe(200);
    expect(
      (
        privacyUpdate.body as {
          data: {
            updateViewerPrivacy: { profileVisibility: string };
          };
        }
      ).data.updateViewerPrivacy.profileVisibility,
    ).toBe('PRIVATE');

    const visitorUsername = 'visitor-' + suffix;
    const visitorRegistration = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation {
          register(input: {
            email: "${visitorUsername}@dss.test"
            username: "${visitorUsername}"
            displayName: "Profile Visitor"
            password: "dss-test-password"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      })
      .expect(200);
    const visitor = visitorRegistration.body as RegisterResponse;
    const privateProfile = await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `query UserByUsername($username: String!) {
          userByUsername(username: $username) {
            username bio location website technologies interests lastSeenAt
            isOnline
            socialLinks { platform url }
          }
        }`,
        variables: { username },
      })
      .expect(200);
    expect(privateProfile.body).toEqual({
      data: {
        userByUsername: {
          username,
          bio: null,
          location: null,
          website: null,
          technologies: [],
          interests: [],
          lastSeenAt: null,
          isOnline: false,
          socialLinks: [],
        },
      },
    });

    const privateProfileById = await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `query User($id: ID!) {
          user(id: $id) {
            username bio location website technologies interests lastSeenAt
            isOnline
            socialLinks { platform url }
          }
        }`,
        variables: { id: registered.data.register.user.id },
      })
      .expect(200);
    const profileByIdBody = privateProfileById.body as {
      data: { user: Record<string, unknown> };
    };
    const profileByUsernameBody = privateProfile.body as {
      data: { userByUsername: Record<string, unknown> };
    };
    expect(profileByIdBody.data.user).toEqual(
      profileByUsernameBody.data.userByUsername,
    );

    const wallPostResult = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation CreateWallPost($input: CreateWallPostInput!) {
          createProfileWallPost(input: $input) {
            id interactionTargetId profileOwnerId authorId body imageMediaId isDeleted
          }
        }`,
        variables: {
          input: {
            profileOwnerId: registered.data.register.user.id,
            body: '  First transmission from the Profile Wall.  ',
          },
        },
      })
      .expect(200);
    const wallPostBody = wallPostResult.body as {
      data: {
        createProfileWallPost: {
          id: string;
          interactionTargetId: string;
          profileOwnerId: string;
          body: string;
          isDeleted: boolean;
        };
      };
    };
    expect(wallPostBody.data.createProfileWallPost).toMatchObject({
      profileOwnerId: registered.data.register.user.id,
      body: 'First transmission from the Profile Wall.',
      isDeleted: false,
    });

    const targetAccess = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query TargetAccess($targetId: ID!) {
          interactionTarget(id: $targetId) {
            id kind ownerModule ownerType ownerId status
          }
          interactionTargetAccess(
            targetId: $targetId
            capability: COMMENT
          ) {
            allowed reason capability
          }
        }`,
        variables: {
          targetId: wallPostBody.data.createProfileWallPost.interactionTargetId,
        },
      })
      .expect(200);
    expect(targetAccess.body).toMatchObject({
      data: {
        interactionTarget: {
          id: wallPostBody.data.createProfileWallPost.interactionTargetId,
          kind: 'users.profile-wall-post',
          ownerModule: 'users',
          ownerType: 'UserWallPost',
          ownerId: wallPostBody.data.createProfileWallPost.id,
          status: 'ACTIVE',
        },
        interactionTargetAccess: {
          allowed: true,
          reason: null,
          capability: 'COMMENT',
        },
      },
    });

    const targetId =
      wallPostBody.data.createProfileWallPost.interactionTargetId;
    const setUpvote = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SetReaction($input: SetReactionInput!) {
          setReaction(input: $input) {
            changed
            reaction { interactionTargetId actorId kind }
            summary {
              likes upvotes downvotes score total viewerReaction
            }
          }
        }`,
        variables: {
          input: { interactionTargetId: targetId, kind: 'UPVOTE' },
        },
      })
      .expect(200);
    expect(setUpvote.body).toMatchObject({
      data: {
        setReaction: {
          changed: true,
          reaction: {
            interactionTargetId: targetId,
            actorId: registered.data.register.user.id,
            kind: 'UPVOTE',
          },
          summary: {
            likes: 0,
            upvotes: 1,
            downvotes: 0,
            score: 1,
            total: 1,
            viewerReaction: 'UPVOTE',
          },
        },
      },
    });

    const repeatedUpvote = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SetReaction($input: SetReactionInput!) {
          setReaction(input: $input) { changed summary { total score } }
        }`,
        variables: {
          input: { interactionTargetId: targetId, kind: 'UPVOTE' },
        },
      })
      .expect(200);
    expect(repeatedUpvote.body).toEqual({
      data: {
        setReaction: {
          changed: false,
          summary: { total: 1, score: 1 },
        },
      },
    });

    const switchedReaction = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SetReaction($input: SetReactionInput!) {
          setReaction(input: $input) {
            changed
            summary {
              likes upvotes downvotes score total viewerReaction
            }
          }
        }`,
        variables: {
          input: { interactionTargetId: targetId, kind: 'LIKE' },
        },
      })
      .expect(200);
    expect(switchedReaction.body).toEqual({
      data: {
        setReaction: {
          changed: true,
          summary: {
            likes: 1,
            upvotes: 0,
            downvotes: 0,
            score: 0,
            total: 1,
            viewerReaction: 'LIKE',
          },
        },
      },
    });

    const clearedReaction = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation ClearReaction($targetId: ID!) {
          clearReaction(interactionTargetId: $targetId) {
            likes upvotes downvotes score total viewerReaction
          }
        }`,
        variables: { targetId },
      })
      .expect(200);
    expect(clearedReaction.body).toEqual({
      data: {
        clearReaction: {
          likes: 0,
          upvotes: 0,
          downvotes: 0,
          score: 0,
          total: 0,
          viewerReaction: null,
        },
      },
    });

    const reactionSummary = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query ReactionSummary($targetId: ID!) {
          reactionSummary(interactionTargetId: $targetId) {
            likes upvotes downvotes score total viewerReaction
          }
        }`,
        variables: { targetId },
      })
      .expect(200);
    expect(reactionSummary.body).toEqual({
      data: {
        reactionSummary: {
          likes: 0,
          upvotes: 0,
          downvotes: 0,
          score: 0,
          total: 0,
          viewerReaction: null,
        },
      },
    });
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          targetId,
          action: {
            in: [
              'reactions.reaction.set',
              'reactions.reaction.changed',
              'reactions.reaction.cleared',
            ],
          },
        },
      }),
    ).resolves.toBe(3);
    await expect(
      app.get(PrismaService).outboxEvent.count({
        where: {
          actorId: registered.data.register.user.id,
          aggregateId: targetId,
          eventName: {
            in: [
              'reactions.reaction.set.v1',
              'reactions.reaction.changed.v1',
              'reactions.reaction.cleared.v1',
            ],
          },
        },
      }),
    ).resolves.toBe(3);

    const savedBookmark = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SaveBookmark($targetId: ID!) {
          saveBookmark(interactionTargetId: $targetId) {
            saved changed
            bookmark { id interactionTargetId createdAt }
          }
        }`,
        variables: { targetId },
      })
      .expect(200);
    const savedBookmarkBody = savedBookmark.body as {
      data: {
        saveBookmark: {
          saved: boolean;
          changed: boolean;
          bookmark: {
            id: string;
            interactionTargetId: string;
            createdAt: string;
          };
        };
      };
    };
    expect(savedBookmarkBody.data.saveBookmark).toMatchObject({
      saved: true,
      changed: true,
      bookmark: { interactionTargetId: targetId },
    });
    expect(typeof savedBookmarkBody.data.saveBookmark.bookmark.createdAt).toBe(
      'string',
    );

    const repeatedBookmark = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SaveBookmark($targetId: ID!) {
          saveBookmark(interactionTargetId: $targetId) {
            saved changed bookmark { id }
          }
        }`,
        variables: { targetId },
      })
      .expect(200);
    expect(repeatedBookmark.body).toEqual({
      data: {
        saveBookmark: {
          saved: true,
          changed: false,
          bookmark: { id: savedBookmarkBody.data.saveBookmark.bookmark.id },
        },
      },
    });

    const viewerBookmarks = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query ViewerBookmarks {
          viewerBookmarks(pagination: { page: 1, limit: 10 }) {
            total page limit totalPages
            items { id interactionTargetId }
          }
        }`,
      })
      .expect(200);
    expect(viewerBookmarks.body).toEqual({
      data: {
        viewerBookmarks: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          items: [
            {
              id: savedBookmarkBody.data.saveBookmark.bookmark.id,
              interactionTargetId: targetId,
            },
          ],
        },
      },
    });

    const removedBookmark = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation RemoveBookmark($targetId: ID!) {
          removeBookmark(interactionTargetId: $targetId) {
            saved changed bookmark { id }
          }
        }`,
        variables: { targetId },
      })
      .expect(200);
    expect(removedBookmark.body).toEqual({
      data: {
        removeBookmark: { saved: false, changed: true, bookmark: null },
      },
    });

    const repeatedRemoval = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation RemoveBookmark($targetId: ID!) {
          removeBookmark(interactionTargetId: $targetId) {
            saved changed
          }
        }`,
        variables: { targetId },
      })
      .expect(200);
    expect(repeatedRemoval.body).toEqual({
      data: { removeBookmark: { saved: false, changed: false } },
    });
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          targetId,
          action: {
            in: ['bookmarks.bookmark.saved', 'bookmarks.bookmark.removed'],
          },
        },
      }),
    ).resolves.toBe(2);
    await expect(
      app.get(PrismaService).outboxEvent.count({
        where: {
          actorId: registered.data.register.user.id,
          aggregateId: savedBookmarkBody.data.saveBookmark.bookmark.id,
          eventName: {
            in: [
              'bookmarks.bookmark.saved.v1',
              'bookmarks.bookmark.removed.v1',
            ],
          },
        },
      }),
    ).resolves.toBe(2);

    const createdComment = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) {
            id interactionTargetId authorId parentId body isDeleted editedAt
          }
        }`,
        variables: {
          input: {
            interactionTargetId:
              wallPostBody.data.createProfileWallPost.interactionTargetId,
            body: '  First shared comment.  ',
          },
        },
      })
      .expect(200);
    const createdCommentBody = createdComment.body as {
      data: {
        createComment: {
          id: string;
          interactionTargetId: string;
          parentId: string | null;
          body: string;
          isDeleted: boolean;
        };
      };
    };
    expect(createdCommentBody.data.createComment).toMatchObject({
      interactionTargetId:
        wallPostBody.data.createProfileWallPost.interactionTargetId,
      parentId: null,
      body: 'First shared comment.',
      isDeleted: false,
    });

    const editedComment = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation EditComment($input: EditCommentInput!) {
          editComment(input: $input) { id body editedAt }
        }`,
        variables: {
          input: {
            commentId: createdCommentBody.data.createComment.id,
            body: 'Edited shared comment.',
          },
        },
      })
      .expect(200);
    expect(editedComment.body).toMatchObject({
      data: {
        editComment: {
          id: createdCommentBody.data.createComment.id,
          body: 'Edited shared comment.',
        },
      },
    });
    expect(
      typeof (
        editedComment.body as { data: { editComment: { editedAt: unknown } } }
      ).data.editComment.editedAt,
    ).toBe('string');

    const commentRevisionHistory = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query CommentRevisions($commentId: ID!) {
          commentRevisions(commentId: $commentId) {
            commentId version body editorId createdAt
          }
        }`,
        variables: { commentId: createdCommentBody.data.createComment.id },
      })
      .expect(200);
    expect(commentRevisionHistory.body).toMatchObject({
      data: {
        commentRevisions: [
          { version: 1, body: 'First shared comment.' },
          { version: 2, body: 'Edited shared comment.' },
        ],
      },
    });

    const replyComment = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation Reply($input: CreateCommentInput!) {
          createComment(input: $input) { id parentId body }
        }`,
        variables: {
          input: {
            interactionTargetId:
              wallPostBody.data.createProfileWallPost.interactionTargetId,
            parentId: createdCommentBody.data.createComment.id,
            body: 'A bounded reply.',
          },
        },
      })
      .expect(200);
    expect(replyComment.body).toMatchObject({
      data: {
        createComment: {
          parentId: createdCommentBody.data.createComment.id,
          body: 'A bounded reply.',
        },
      },
    });

    const topLevelComments = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query Comments($targetId: ID!) {
          commentsForTarget(
            interactionTargetId: $targetId
            pagination: { page: 1, limit: 10 }
          ) {
            total items { id parentId body }
          }
        }`,
        variables: {
          targetId: wallPostBody.data.createProfileWallPost.interactionTargetId,
        },
      })
      .expect(200);
    expect(topLevelComments.body).toMatchObject({
      data: {
        commentsForTarget: {
          total: 1,
          items: [
            {
              id: createdCommentBody.data.createComment.id,
              parentId: null,
              body: 'Edited shared comment.',
            },
          ],
        },
      },
    });

    const removedComment = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation RemoveComment($commentId: ID!) {
          removeComment(commentId: $commentId, reason: "Author cleanup") {
            id body isDeleted deletedAt
          }
        }`,
        variables: { commentId: createdCommentBody.data.createComment.id },
      })
      .expect(200);
    expect(removedComment.body).toMatchObject({
      data: {
        removeComment: {
          id: createdCommentBody.data.createComment.id,
          body: null,
          isDeleted: true,
        },
      },
    });
    expect(
      typeof (
        removedComment.body as {
          data: { removeComment: { deletedAt: unknown } };
        }
      ).data.removeComment.deletedAt,
    ).toBe('string');

    const prisma = app.get(PrismaService);
    const activityProjector = new PostgresActivityProjector(processingPool);
    const createdEvent = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        eventName: 'users.profile-wall.post-created.v1',
        aggregateId: wallPostBody.data.createProfileWallPost.id,
      },
    });
    await activityProjector.project({
      eventId: createdEvent.id,
      eventName: createdEvent.eventName,
      eventVersion: createdEvent.eventVersion,
      category: createdEvent.eventCategory,
      producer: createdEvent.producer,
      actorId: createdEvent.actorId ?? undefined,
      aggregateType: createdEvent.aggregateType ?? undefined,
      aggregateId: createdEvent.aggregateId ?? undefined,
      payload: createdEvent.payload,
      occurredAt: createdEvent.occurredAt.toISOString(),
    } satisfies IntegrationEventJob);

    const projectedActivity = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query UserActivity($userId: ID!) {
          userActivity(userId: $userId, pagination: { page: 1, limit: 10 }) {
            total page limit totalPages
            items { actorId module action subjectType subjectId occurredAt }
          }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    expect(projectedActivity.body).toEqual({
      data: {
        userActivity: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          items: [
            {
              actorId: registered.data.register.user.id,
              module: 'PROFILE',
              action: 'PROFILE_WALL_POST_CREATED',
              subjectType: 'UserWallPost',
              subjectId: wallPostBody.data.createProfileWallPost.id,
              occurredAt: createdEvent.occurredAt.toISOString(),
            },
          ],
        },
      },
    });

    const privateActivity = await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `query UserActivity($userId: ID!) {
          userActivity(userId: $userId) { total }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    expect(
      (privateActivity.body as GraphqlErrorResponse).errors[0].extensions.code,
    ).toBe('FORBIDDEN');

    const removedWallPost = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation RemoveWallPost($postId: ID!) {
          removeProfileWallPost(postId: $postId, reason: "Owner cleanup") {
            id body imageMediaId isDeleted deletedAt
          }
        }`,
        variables: {
          postId: wallPostBody.data.createProfileWallPost.id,
        },
      })
      .expect(200);
    const removedWallPostBody = removedWallPost.body as {
      data: {
        removeProfileWallPost: {
          id: string;
          body: string | null;
          imageMediaId: string | null;
          isDeleted: boolean;
          deletedAt: string | null;
        };
      };
    };
    expect(removedWallPostBody.data.removeProfileWallPost).toMatchObject({
      id: wallPostBody.data.createProfileWallPost.id,
      body: null,
      imageMediaId: null,
      isDeleted: true,
    });
    expect(
      typeof removedWallPostBody.data.removeProfileWallPost.deletedAt,
    ).toBe('string');

    const lockedTarget = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query LockedTarget($targetId: ID!) {
          interactionTarget(id: $targetId) { status }
          read: interactionTargetAccess(
            targetId: $targetId
            capability: READ
          ) { allowed reason }
          comment: interactionTargetAccess(
            targetId: $targetId
            capability: COMMENT
          ) { allowed reason }
          react: interactionTargetAccess(
            targetId: $targetId
            capability: REACT
          ) { allowed reason }
          bookmark: interactionTargetAccess(
            targetId: $targetId
            capability: BOOKMARK
          ) { allowed reason }
        }`,
        variables: {
          targetId: wallPostBody.data.createProfileWallPost.interactionTargetId,
        },
      })
      .expect(200);
    expect(lockedTarget.body).toEqual({
      data: {
        interactionTarget: { status: 'LOCKED' },
        read: { allowed: true, reason: null },
        comment: { allowed: false, reason: 'TARGET_LOCKED' },
        react: { allowed: false, reason: 'TARGET_LOCKED' },
        bookmark: { allowed: false, reason: 'TARGET_LOCKED' },
      },
    });

    const commentOnLockedTarget = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) { id }
        }`,
        variables: {
          input: {
            interactionTargetId:
              wallPostBody.data.createProfileWallPost.interactionTargetId,
            body: 'Too late.',
          },
        },
      })
      .expect(200);
    expect(
      (commentOnLockedTarget.body as GraphqlErrorResponse).errors[0].extensions
        .code,
    ).toBe('FORBIDDEN');

    const reactionOnLockedTarget = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SetReaction($input: SetReactionInput!) {
          setReaction(input: $input) { changed }
        }`,
        variables: {
          input: { interactionTargetId: targetId, kind: 'UPVOTE' },
        },
      })
      .expect(200);
    expect(
      (reactionOnLockedTarget.body as GraphqlErrorResponse).errors[0].extensions
        .code,
    ).toBe('FORBIDDEN');

    const bookmarkOnLockedTarget = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SaveBookmark($targetId: ID!) {
          saveBookmark(interactionTargetId: $targetId) { changed }
        }`,
        variables: { targetId },
      })
      .expect(200);
    expect(
      (bookmarkOnLockedTarget.body as GraphqlErrorResponse).errors[0].extensions
        .code,
    ).toBe('FORBIDDEN');

    const retractedEvent = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        eventName: 'users.profile-wall.post-retracted.v1',
        aggregateId: wallPostBody.data.createProfileWallPost.id,
      },
    });
    await activityProjector.project({
      eventId: retractedEvent.id,
      eventName: retractedEvent.eventName,
      eventVersion: retractedEvent.eventVersion,
      category: retractedEvent.eventCategory,
      producer: retractedEvent.producer,
      actorId: retractedEvent.actorId ?? undefined,
      aggregateType: retractedEvent.aggregateType ?? undefined,
      aggregateId: retractedEvent.aggregateId ?? undefined,
      payload: retractedEvent.payload,
      occurredAt: retractedEvent.occurredAt.toISOString(),
    } satisfies IntegrationEventJob);
    const retractedActivity = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query UserActivity($userId: ID!) {
          userActivity(userId: $userId) { total items { id } }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    expect(retractedActivity.body).toEqual({
      data: { userActivity: { total: 0, items: [] } },
    });
    await prisma.outboxEvent.deleteMany({
      where: {
        eventName: {
          in: [
            'users.profile-wall.post-created.v1',
            'users.profile-wall.post-retracted.v1',
          ],
        },
      },
    });

    const wallHistory = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query ProfileWall($profileOwnerId: ID!) {
          profileWall(
            profileOwnerId: $profileOwnerId
            pagination: { page: 1, limit: 10 }
          ) {
            total items { id body isDeleted }
          }
        }`,
        variables: { profileOwnerId: registered.data.register.user.id },
      })
      .expect(200);
    expect(wallHistory.body).toEqual({
      data: {
        profileWall: {
          total: 1,
          items: [
            {
              id: wallPostBody.data.createProfileWallPost.id,
              body: null,
              isDeleted: true,
            },
          ],
        },
      },
    });
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          targetId: wallPostBody.data.createProfileWallPost.id,
          action: {
            in: ['user.wall.post_created', 'user.wall.post_deleted'],
          },
        },
      }),
    ).resolves.toBe(2);

    const followResult = await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `mutation FollowUser($userId: ID!) {
          followUser(userId: $userId) {
            userId followerCount followingCount
          }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    expect(followResult.body).toEqual({
      data: {
        followUser: {
          userId: registered.data.register.user.id,
          followerCount: 1,
          followingCount: 0,
        },
      },
    });

    const ownerFollowers = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query Followers($userId: ID!) {
          followers(userId: $userId, pagination: { page: 1, limit: 10 }) {
            total page limit totalPages
            items { id username followerCount followingCount }
          }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    expect(ownerFollowers.body).toEqual({
      data: {
        followers: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          items: [
            {
              id: visitor.data.register.user.id,
              username: visitorUsername,
              followerCount: 0,
              followingCount: 1,
            },
          ],
        },
      },
    });

    const hiddenFollowers = await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `query Followers($userId: ID!) {
          followers(userId: $userId) { total }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    const hiddenFollowersBody = hiddenFollowers.body as {
      errors?: Array<{ extensions?: { code?: string } }>;
    };
    expect(hiddenFollowersBody.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

    const blockResult = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation BlockUser($userId: ID!) {
          blockUser(userId: $userId) { userId blocked }
        }`,
        variables: { userId: visitor.data.register.user.id },
      })
      .expect(200);
    expect(blockResult.body).toEqual({
      data: {
        blockUser: {
          userId: visitor.data.register.user.id,
          blocked: true,
        },
      },
    });

    const blockedList = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query {
          blockedUsers(pagination: { page: 1, limit: 10 }) {
            total items { id username }
          }
        }`,
      })
      .expect(200);
    expect(blockedList.body).toEqual({
      data: {
        blockedUsers: {
          total: 1,
          items: [
            {
              id: visitor.data.register.user.id,
              username: visitorUsername,
            },
          ],
        },
      },
    });

    const membersDirectory = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query Members($input: MembersDirectoryInput) {
          members(input: $input) {
            total page limit totalPages
            items { id username displayName avatarUrl isOnline roles createdAt }
          }
        }`,
        variables: {
          input: {
            page: 1,
            limit: 10,
            search: visitorUsername.toUpperCase(),
            sort: 'USERNAME_ASC',
            onlineOnly: true,
            role: 'user',
          },
        },
      })
      .expect(200);
    const membersDirectoryBody = membersDirectory.body as {
      data: {
        members: {
          total: number;
          items: Array<{ id: string; username: string }>;
        };
      };
    };
    expect(membersDirectoryBody.data.members.total).toBe(1);
    expect(membersDirectoryBody.data.members.items).toEqual([
      expect.objectContaining({
        id: visitor.data.register.user.id,
        username: visitorUsername,
        isOnline: true,
        roles: ['user'],
      }),
    ]);

    await expect(
      app.get(PrismaService).userFollow.count({
        where: {
          OR: [
            {
              followerId: visitor.data.register.user.id,
              followingId: registered.data.register.user.id,
            },
            {
              followerId: registered.data.register.user.id,
              followingId: visitor.data.register.user.id,
            },
          ],
          deletedAt: null,
        },
      }),
    ).resolves.toBe(0);

    const deniedFollow = await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `mutation FollowUser($userId: ID!) {
          followUser(userId: $userId) { followerCount }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    const deniedFollowBody = deniedFollow.body as {
      errors?: Array<{ extensions?: { code?: string } }>;
    };
    expect(deniedFollowBody.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation UnblockUser($userId: ID!) {
          unblockUser(userId: $userId) { userId blocked }
        }`,
        variables: { userId: visitor.data.register.user.id },
      })
      .expect(200)
      .expect({
        data: {
          unblockUser: {
            userId: visitor.data.register.user.id,
            blocked: false,
          },
        },
      });

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `mutation FollowUser($userId: ID!) {
          followUser(userId: $userId) { followerCount }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);

    const unfollowResult = await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        'Bearer ' + visitor.data.register.tokens.accessToken,
      )
      .send({
        query: `mutation UnfollowUser($userId: ID!) {
          unfollowUser(userId: $userId) { userId followerCount }
        }`,
        variables: { userId: registered.data.register.user.id },
      })
      .expect(200);
    const unfollowBody = unfollowResult.body as {
      data: { unfollowUser: { followerCount: number } };
    };
    expect(unfollowBody.data.unfollowUser.followerCount).toBe(0);
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: visitor.data.register.user.id,
          targetId: registered.data.register.user.id,
          action: { in: ['user.follow.created', 'user.follow.removed'] },
        },
      }),
    ).resolves.toBe(3);
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          targetId: visitor.data.register.user.id,
          action: { in: ['user.block.created', 'user.block.removed'] },
        },
      }),
    ).resolves.toBe(2);

    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          action: 'user.profile.privacy_updated',
          actorId: registered.data.register.user.id,
          targetId: registered.data.register.user.id,
        },
      }),
    ).resolves.toBe(1);

    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          action: 'user.profile.social_links_updated',
          actorId: registered.data.register.user.id,
          targetId: registered.data.register.user.id,
        },
      }),
    ).resolves.toBe(1);

    const initiatedUpload = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation InitiateMediaUpload($input: InitiateMediaUploadInput!) {
          initiateMediaUpload(input: $input) {
            id policyKey status declaredMimeType expiresAt
          }
        }`,
        variables: {
          input: {
            policyKey: 'avatar',
            originalFilename: 'commander.png',
            declaredMimeType: 'image/png',
            declaredSize: 2048,
          },
        },
      })
      .expect(200);
    const uploadBody = initiatedUpload.body as InitiateMediaUploadResponse;

    expect(uploadBody.errors).toBeUndefined();
    expect(uploadBody.data.initiateMediaUpload).toMatchObject({
      policyKey: 'avatar',
      status: 'INITIATED',
      declaredMimeType: 'image/png',
    });
    const abortedUpload = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation AbortMediaUpload($id: String!) {
          abortMediaUpload(id: $id) { id status }
        }`,
        variables: { id: uploadBody.data.initiateMediaUpload.id },
      })
      .expect(200);

    expect(abortedUpload.body).toEqual({
      data: {
        abortMediaUpload: {
          id: uploadBody.data.initiateMediaUpload.id,
          status: 'ABORTED',
        },
      },
    });

    const binarySession = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation InitiateMediaUpload($input: InitiateMediaUploadInput!) {
          initiateMediaUpload(input: $input) { id status }
        }`,
        variables: {
          input: {
            policyKey: 'avatar',
            originalFilename: 'commander.png',
            declaredMimeType: 'image/png',
            declaredSize: PNG_1X1.length,
          },
        },
      })
      .expect(200);
    const binarySessionBody = binarySession.body as {
      data: { initiateMediaUpload: { id: string; status: string } };
      errors?: Array<{ message: string }>;
    };
    expect(binarySessionBody.errors).toBeUndefined();

    const binaryUpload = await request(app.getHttpServer())
      .put(
        `/api/media/uploads/${binarySessionBody.data.initiateMediaUpload.id}/content`,
      )
      .set('Authorization', 'Bearer ' + accessToken)
      .attach('file', PNG_1X1, {
        filename: 'commander.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(binaryUpload.body).toMatchObject({
      id: binarySessionBody.data.initiateMediaUpload.id,
      policyKey: 'avatar',
      status: 'COMPLETED',
      declaredMimeType: 'image/png',
    });
    expect(binaryUpload.body).not.toHaveProperty('temporaryKey');
    expect(binaryUpload.body).not.toHaveProperty('bucket');

    const uploadSessionId = binarySessionBody.data.initiateMediaUpload.id;
    const queuedJob = await app
      .get(QueueRegistryService)
      .mediaProcessing.getJob(uploadSessionId);
    expect(queuedJob).not.toBeNull();
    const processingJob = queuedJob as Job<MediaProcessingJob>;
    expect(processingJob.data).toMatchObject({
      uploadSessionId,
      processingKind: 'IMAGE',
      variants: [
        { name: 'avatar-64' },
        { name: 'avatar-128' },
        { name: 'avatar-256' },
      ],
    });

    const processMedia = createMediaProcessingProcessor(
      new PostgresMediaProcessingStore(processingPool),
      new LocalMediaFileProcessor(join(process.cwd(), E2E_UPLOADS_DIR)),
      { scan: () => Promise.resolve({ status: 'CLEAN' as const }) },
    );
    await expect(processMedia(processingJob)).resolves.toEqual({
      mediaId: processingJob.data.mediaId,
      duplicate: false,
      quarantined: false,
    });

    const processedMedia = await app.get(PrismaService).media.findUnique({
      where: { id: processingJob.data.mediaId },
      include: { variants: { orderBy: { name: 'asc' } } },
    });
    expect(processedMedia).toMatchObject({
      status: 'READY',
      mimeType: 'image/webp',
      extension: 'webp',
      width: 1,
      height: 1,
    });
    expect(processedMedia?.variants.map((variant) => variant.name)).toEqual([
      'avatar-128',
      'avatar-256',
      'avatar-64',
    ]);

    const mediaId = processingJob.data.mediaId;
    const setAvatar = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SetViewerAvatar($mediaId: ID!) {
          setViewerAvatar(mediaId: $mediaId) { id avatarUrl }
        }`,
        variables: { mediaId },
      })
      .expect(200);

    expect(setAvatar.body).toEqual({
      data: {
        setViewerAvatar: {
          id: registered.data.register.user.id,
          avatarUrl: `/api/media/public/${mediaId}/avatar-256`,
        },
      },
    });

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query:
          'mutation SetViewerAvatar($mediaId: ID!) { setViewerAvatar(mediaId: $mediaId) { id } }',
        variables: { mediaId },
      })
      .expect(200);

    const deliveredAvatar = await request(app.getHttpServer())
      .get(`/api/media/public/${mediaId}/avatar-256`)
      .expect(200)
      .expect('Content-Type', /image\/webp/);
    expect(deliveredAvatar.headers['cache-control']).toContain('immutable');
    expect(deliveredAvatar.body).toBeInstanceOf(Buffer);

    const avatarState = await app.get(PrismaService).user.findUniqueOrThrow({
      where: { id: registered.data.register.user.id },
      include: {
        avatarMedia: true,
      },
    });
    expect(avatarState.avatarMediaId).toBe(mediaId);
    expect(avatarState.avatarMedia?.id).toBe(mediaId);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId,
          targetId: avatarState.id,
          purpose: 'avatar',
          removedAt: null,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId,
          targetId: avatarState.id,
          purpose: 'avatar',
        },
      }),
    ).resolves.toBe(2);

    const removeAvatar = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: 'mutation { removeViewerAvatar { id avatarUrl } }',
      })
      .expect(200);
    expect(removeAvatar.body).toEqual({
      data: {
        removeViewerAvatar: {
          id: registered.data.register.user.id,
          avatarUrl: `/api/media/avatars/fallback/${username}.svg`,
        },
      },
    });

    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          action: { in: ['user.avatar.assigned', 'user.avatar.removed'] },
        },
      }),
    ).resolves.toBe(3);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId,
          targetId: registered.data.register.user.id,
          purpose: 'avatar',
          removedAt: null,
        },
      }),
    ).resolves.toBe(0);

    await request(app.getHttpServer())
      .get(`/api/media/avatars/fallback/${username}.svg`)
      .expect(200)
      .expect('Content-Type', /image\/svg\+xml/);

    const coverSession = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation InitiateMediaUpload($input: InitiateMediaUploadInput!) {
          initiateMediaUpload(input: $input) { id status }
        }`,
        variables: {
          input: {
            policyKey: 'cover',
            originalFilename: 'mission-cover.png',
            declaredMimeType: 'image/png',
            declaredSize: PNG_1X1.length,
          },
        },
      })
      .expect(200);
    const coverSessionId = (
      coverSession.body as {
        data: { initiateMediaUpload: { id: string } };
      }
    ).data.initiateMediaUpload.id;
    await request(app.getHttpServer())
      .put(`/api/media/uploads/${coverSessionId}/content`)
      .set('Authorization', 'Bearer ' + accessToken)
      .attach('file', PNG_1X1, {
        filename: 'mission-cover.png',
        contentType: 'image/png',
      })
      .expect(200);
    const coverJob = await app
      .get(QueueRegistryService)
      .mediaProcessing.getJob(coverSessionId);
    expect(coverJob).not.toBeNull();
    const coverProcessingJob = coverJob as Job<MediaProcessingJob>;
    expect(coverProcessingJob.data.variants).toEqual([
      expect.objectContaining({ name: 'cover-640' }),
      expect.objectContaining({ name: 'cover-1280' }),
    ]);
    await expect(processMedia(coverProcessingJob)).resolves.toEqual({
      mediaId: coverProcessingJob.data.mediaId,
      duplicate: false,
      quarantined: false,
    });
    const coverMediaId = coverProcessingJob.data.mediaId;

    const setCover = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SetViewerCover($mediaId: ID!) {
          setViewerCover(mediaId: $mediaId) { id coverUrl }
        }`,
        variables: { mediaId: coverMediaId },
      })
      .expect(200);
    expect(setCover.body).toEqual({
      data: {
        setViewerCover: {
          id: registered.data.register.user.id,
          coverUrl: `/api/media/public/${coverMediaId}/cover-1280`,
        },
      },
    });
    await request(app.getHttpServer())
      .get(`/api/media/public/${coverMediaId}/cover-1280`)
      .expect(200)
      .expect('Content-Type', /image\/webp/);
    const coverState = await app.get(PrismaService).user.findUniqueOrThrow({
      where: { id: registered.data.register.user.id },
      include: { coverMedia: true },
    });
    expect(coverState.coverMediaId).toBe(coverMediaId);
    expect(coverState.coverMedia?.id).toBe(coverMediaId);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId: coverMediaId,
          targetId: coverState.id,
          purpose: 'cover',
          removedAt: null,
        },
      }),
    ).resolves.toBe(1);

    const removeCover = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: 'mutation { removeViewerCover { id coverUrl } }',
      })
      .expect(200);
    expect(removeCover.body).toEqual({
      data: {
        removeViewerCover: {
          id: registered.data.register.user.id,
          coverUrl: null,
        },
      },
    });
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          action: { in: ['user.cover.assigned', 'user.cover.removed'] },
        },
      }),
    ).resolves.toBe(2);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId: coverMediaId,
          targetId: registered.data.register.user.id,
          purpose: 'cover',
          removedAt: null,
        },
      }),
    ).resolves.toBe(0);

    await app.get(PrismaService).media.update({
      where: { id: mediaId },
      data: { visibility: 'PRIVATE' },
    });
    await request(app.getHttpServer())
      .get(`/api/media/public/${mediaId}/avatar-256`)
      .expect(404);

    const access = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query MediaAccess($mediaId: ID!, $variantName: String!) {
          mediaAccessUrl(mediaId: $mediaId, variantName: $variantName) {
            url expiresAt
          }
        }`,
        variables: { mediaId, variantName: 'avatar-256' },
      })
      .expect(200);
    const accessBody = access.body as {
      data: { mediaAccessUrl: { url: string; expiresAt: string } };
      errors?: Array<{ message: string }>;
    };
    expect(accessBody.errors).toBeUndefined();
    expect(accessBody.data.mediaAccessUrl.url).toMatch(
      /^\/api\/media\/signed\//,
    );
    expect(accessBody.data.mediaAccessUrl.url).not.toContain('processed/');

    await request(app.getHttpServer())
      .get(accessBody.data.mediaAccessUrl.url)
      .expect(200)
      .expect('Cache-Control', 'private, no-store')
      .expect('Content-Type', /image\/webp/);
    await request(app.getHttpServer())
      .get(`${accessBody.data.mediaAccessUrl.url}x`)
      .expect(401);

    await app.get(PrismaService).media.update({
      where: { id: mediaId },
      data: {
        status: 'QUARANTINED',
        failureCode: 'MALWARE_DETECTED',
        failureReason: 'Eicar-Signature',
      },
    });
    const deniedQuarantine = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({ query: '{ quarantinedMedia { id status failureCode } }' })
      .expect(200);
    expect(deniedQuarantine.body).toMatchObject({
      data: null,
      errors: [{ extensions: { code: 'FORBIDDEN' } }],
    });

    const quarantinePermission = await app
      .get(PrismaService)
      .permission.upsert({
        where: { key: 'media.quarantine.manage' },
        update: {},
        create: {
          key: 'media.quarantine.manage',
          label: 'Manage media quarantine',
        },
      });
    const libraryPermission = await app.get(PrismaService).permission.upsert({
      where: { key: 'media.library.read' },
      update: {},
      create: {
        key: 'media.library.read',
        label: 'Read Media Library',
      },
    });
    const jobsPermission = await app.get(PrismaService).permission.upsert({
      where: { key: 'media.jobs.manage' },
      update: {},
      create: {
        key: 'media.jobs.manage',
        label: 'Manage media jobs',
      },
    });
    await app.get(PrismaService).userPermission.createMany({
      data: [quarantinePermission, libraryPermission, jobsPermission].map(
        (permission) => ({
          userId: registered.data.register.user.id,
          permissionId: permission.id,
        }),
      ),
    });
    const login = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) { tokens { accessToken } }
        }`,
        variables: {
          input: { email, password: 'dss-test-password' },
        },
      })
      .expect(200);
    const managerToken = (
      login.body as { data: { login: { tokens: { accessToken: string } } } }
    ).data.login.tokens.accessToken;

    const quarantineList = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query:
          '{ quarantinedMedia(limit: 10) { id status failureCode failureReason } }',
      })
      .expect(200);
    expect(quarantineList.body).toEqual({
      data: {
        quarantinedMedia: [
          {
            id: mediaId,
            status: 'QUARANTINED',
            failureCode: 'MALWARE_DETECTED',
            failureReason: 'Eicar-Signature',
          },
        ],
      },
    });

    const mediaLibrary = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `query MediaLibrary($input: MediaLibraryInput) {
          mediaLibrary(input: $input) {
            items { id kind status visibility originalFilename }
            pageInfo { hasNextPage endCursor }
          }
          mediaLibraryMetrics {
            totalMedia originalBytes variantBytes totalBytes
            orphanedMedia failedMedia quarantinedMedia
          }
        }`,
        variables: {
          input: {
            first: 10,
            search: 'commander',
            status: 'QUARANTINED',
            orphaned: true,
          },
        },
      })
      .expect(200);
    const libraryBody = mediaLibrary.body as {
      data: {
        mediaLibrary: {
          items: Array<{
            id: string;
            kind: string;
            status: string;
            visibility: string;
            originalFilename: string;
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
        mediaLibraryMetrics: {
          totalMedia: number;
          originalBytes: number;
          variantBytes: number;
          totalBytes: number;
          orphanedMedia: number;
          failedMedia: number;
          quarantinedMedia: number;
        };
      };
      errors?: Array<{ message: string }>;
    };
    expect(libraryBody.errors).toBeUndefined();
    expect(libraryBody.data.mediaLibrary.items).toEqual([
      {
        id: mediaId,
        kind: 'IMAGE',
        status: 'QUARANTINED',
        visibility: 'PRIVATE',
        originalFilename: 'commander.png',
      },
    ]);
    expect(libraryBody.data.mediaLibrary.pageInfo.hasNextPage).toBe(false);
    expect(typeof libraryBody.data.mediaLibrary.pageInfo.endCursor).toBe(
      'string',
    );
    expect(libraryBody.data.mediaLibraryMetrics).toMatchObject({
      quarantinedMedia: 1,
    });
    expect(libraryBody.data.mediaLibraryMetrics.totalBytes).toBeGreaterThan(0);

    const rescan = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `mutation Rescan($mediaId: ID!) {
          rescanQuarantinedMedia(mediaId: $mediaId) { id status }
        }`,
        variables: { mediaId },
      })
      .expect(200);
    expect(rescan.body).toEqual({
      data: {
        rescanQuarantinedMedia: { id: mediaId, status: 'QUARANTINED' },
      },
    });

    const rejected = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `mutation Reject($mediaId: ID!) {
          rejectQuarantinedMedia(mediaId: $mediaId) { id status }
        }`,
        variables: { mediaId },
      })
      .expect(200);
    expect(rejected.body).toEqual({
      data: {
        rejectQuarantinedMedia: { id: mediaId, status: 'REJECTED' },
      },
    });
    await app.get(PrismaService).media.update({
      where: { id: mediaId },
      data: {
        status: 'FAILED',
        failureCode: 'PROCESSING_FAILED',
        failureReason: 'Synthetic retry proof',
      },
    });
    const retry = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `mutation RetryFailedMedia($mediaId: ID!) {
          retryFailedMedia(mediaId: $mediaId) {
            id status failureCode
          }
        }`,
        variables: { mediaId },
      })
      .expect(200);
    expect(retry.body).toEqual({
      data: {
        retryFailedMedia: {
          id: mediaId,
          status: 'PROCESSING',
          failureCode: null,
        },
      },
    });
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          action: 'media.processing.retry_requested',
          targetId: mediaId,
        },
      }),
    ).resolves.toBe(1);
    const rescanJobs = await app
      .get(QueueRegistryService)
      .mediaProcessing.getJobs(['waiting', 'delayed']);
    await Promise.all(
      rescanJobs
        .filter((job) => job.data.mediaId === mediaId)
        .map((job) => job.remove()),
    );
    await queuedJob?.remove();
  });

  it('purges only claimed unreferenced media after retention', async () => {
    const storage = app.get(StorageService);
    const retention = app.get(MediaRetentionService);
    const prisma = app.get(PrismaService);
    const original = await storage.save({
      buffer: Buffer.from('old-original'),
      directory: 'cleanup',
      filename: `original-${Date.now()}.webp`,
    });
    const variant = await storage.save({
      buffer: Buffer.from('old-variant'),
      directory: 'cleanup',
      filename: `variant-${Date.now()}.webp`,
    });
    const oldDate = new Date('2026-05-01T00:00:00.000Z');
    const media = await prisma.media.create({
      data: {
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PRIVATE',
        storageProvider: 'LOCAL',
        bucket: 'media',
        storageKey: original.path,
        originalFilename: 'old.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 12,
        checksum: 'old-original-checksum',
        readyAt: oldDate,
        createdAt: oldDate,
        variants: {
          create: {
            name: 'content-640',
            storageProvider: 'LOCAL',
            bucket: 'media',
            storageKey: variant.path,
            mimeType: 'image/webp',
            extension: 'webp',
            size: 11,
            checksum: 'old-variant-checksum',
          },
        },
      },
    });

    await expect(
      retention.runOnce(new Date('2026-07-25T00:00:00.000Z')),
    ).resolves.toBeGreaterThanOrEqual(1);
    const cleaned = await prisma.media.findUniqueOrThrow({
      where: { id: media.id },
    });
    expect(cleaned.status).toBe('DELETED');
    expect(cleaned.deletedAt).toBeInstanceOf(Date);
    await expect(storage.read(original.path)).rejects.toThrow();
    await expect(storage.read(variant.path)).rejects.toThrow();
    await expect(
      prisma.auditRecord.count({
        where: {
          targetId: media.id,
          action: {
            in: ['media.cleanup.claimed', 'media.cleanup.completed'],
          },
        },
      }),
    ).resolves.toBe(2);
  });

  it('deactivates an account immediately and permits credentialed reactivation', async () => {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const username = `lifecycle-${suffix}`;
    const email = `${username}@dss.test`;
    const password = 'dss-lifecycle-password';
    const registration = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation {
          register(input: {
            email: "${email}"
            username: "${username}"
            displayName: "Lifecycle Astronaut"
            password: "${password}"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      })
      .expect(200);
    const registered = registration.body as RegisterResponse;
    const userId = registered.data.register.user.id;
    const oldAccessToken = registered.data.register.tokens.accessToken;

    const deactivation = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${oldAccessToken}`)
      .send({
        query: `mutation Deactivate($input: DeactivateAccountInput!) {
          deactivateAccount(input: $input) { success }
        }`,
        variables: { input: { password } },
      })
      .expect(200);
    expect(deactivation.body).toEqual({
      data: { deactivateAccount: { success: true } },
    });

    const rejectedViewer = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${oldAccessToken}`)
      .send({ query: '{ viewer { id } }' })
      .expect(200);
    expect(
      (rejectedViewer.body as GraphqlErrorResponse).errors[0]?.extensions.code,
    ).toBe('UNAUTHENTICATED');

    const rejectedLogin = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) { tokens { accessToken } }
        }`,
        variables: { input: { email, password } },
      })
      .expect(200);
    expect(
      (rejectedLogin.body as GraphqlErrorResponse).errors[0]?.extensions.code,
    ).toBe('UNAUTHENTICATED');

    const reactivation = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Reactivate($input: LoginInput!) {
          reactivateAccount(input: $input) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
        variables: { input: { email, password } },
      })
      .expect(200);
    const reactivated = reactivation.body as ReactivateResponse;
    expect(reactivated.errors).toBeUndefined();
    expect(reactivated.data.reactivateAccount.user.id).toBe(userId);

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set(
        'Authorization',
        `Bearer ${reactivated.data.reactivateAccount.tokens.accessToken}`,
      )
      .send({ query: '{ viewer { id } }' })
      .expect(200)
      .expect({ data: { viewer: { id: userId } } });

    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: userId,
          action: {
            in: ['user.account.deactivated', 'user.account.reactivated'],
          },
        },
      }),
    ).resolves.toBe(2);
  });

  it('rotates authentication immediately after email and password changes', async () => {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const username = `credentials-${suffix}`;
    const oldEmail = `${username}@dss.test`;
    const newEmail = `${username}-new@dss.test`;
    const oldPassword = 'dss-old-password';
    const newPassword = 'dss-new-password';
    const registration = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation {
          register(input: {
            email: "${oldEmail}"
            username: "${username}"
            displayName: "Credential Astronaut"
            password: "${oldPassword}"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      })
      .expect(200);
    const registered = registration.body as RegisterResponse;
    const userId = registered.data.register.user.id;
    const registrationToken = registered.data.register.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${registrationToken}`)
      .send({
        query: `mutation ChangeEmail($input: ChangeEmailInput!) {
          changeViewerEmail(input: $input) { success }
        }`,
        variables: {
          input: {
            email: newEmail.toUpperCase(),
            currentPassword: oldPassword,
          },
        },
      })
      .expect(200)
      .expect({ data: { changeViewerEmail: { success: true } } });

    const expiredRegistrationToken = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${registrationToken}`)
      .send({ query: '{ viewer { id } }' })
      .expect(200);
    expect(
      (expiredRegistrationToken.body as GraphqlErrorResponse).errors[0]
        ?.extensions.code,
    ).toBe('UNAUTHENTICATED');

    const emailLogin = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
        variables: { input: { email: newEmail, password: oldPassword } },
      })
      .expect(200);
    const loggedInAfterEmail = emailLogin.body as LoginResponse;
    expect(loggedInAfterEmail.errors).toBeUndefined();
    expect(loggedInAfterEmail.data.login.user.email).toBe(newEmail);

    const emailToken = loggedInAfterEmail.data.login.tokens.accessToken;
    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${emailToken}`)
      .send({
        query: `mutation ChangePassword($input: ChangePasswordInput!) {
          changeViewerPassword(input: $input) { success }
        }`,
        variables: {
          input: {
            currentPassword: oldPassword,
            newPassword,
          },
        },
      })
      .expect(200)
      .expect({ data: { changeViewerPassword: { success: true } } });

    const expiredEmailToken = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${emailToken}`)
      .send({ query: '{ viewer { id } }' })
      .expect(200);
    expect(
      (expiredEmailToken.body as GraphqlErrorResponse).errors[0]?.extensions
        .code,
    ).toBe('UNAUTHENTICATED');

    const finalLogin = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
        variables: { input: { email: newEmail, password: newPassword } },
      })
      .expect(200);
    const loggedInAfterPassword = finalLogin.body as LoginResponse;
    expect(loggedInAfterPassword.errors).toBeUndefined();
    expect(loggedInAfterPassword.data.login.user.id).toBe(userId);
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: userId,
          action: {
            in: ['user.account.email_changed', 'user.account.password_changed'],
          },
        },
      }),
    ).resolves.toBe(2);
  });

  it('lists device sessions and revokes other or current sessions immediately', async () => {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const username = `sessions-${suffix}`;
    const email = `${username}@dss.test`;
    const password = 'dss-session-password';
    const registration = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('User-Agent', 'DSS Device One')
      .send({
        query: `mutation {
          register(input: {
            email: "${email}"
            username: "${username}"
            displayName: "Session Astronaut"
            password: "${password}"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      })
      .expect(200);
    const first = registration.body as RegisterResponse;
    const firstToken = first.data.register.tokens.accessToken;

    const login = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('User-Agent', 'DSS Device Two')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
        variables: { input: { email, password } },
      })
      .expect(200);
    const second = login.body as LoginResponse;
    const secondToken = second.data.login.tokens.accessToken;

    const sessions = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({
        query: `{
          viewerSessions {
            id userAgent ipAddress expiresAt createdAt current
          }
        }`,
      })
      .expect(200);
    const sessionItems = (
      sessions.body as {
        data: {
          viewerSessions: Array<{
            id: string;
            userAgent: string | null;
            current: boolean;
          }>;
        };
      }
    ).data.viewerSessions;
    expect(sessionItems).toHaveLength(2);
    expect(sessionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userAgent: 'DSS Device One',
          current: false,
        }),
        expect.objectContaining({
          userAgent: 'DSS Device Two',
          current: true,
        }),
      ]),
    );

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({
        query:
          'mutation { revokeOtherViewerSessions { success revokedCount } }',
      })
      .expect(200)
      .expect({
        data: {
          revokeOtherViewerSessions: { success: true, revokedCount: 1 },
        },
      });

    const revokedFirst = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${firstToken}`)
      .send({ query: '{ viewer { id } }' })
      .expect(200);
    expect(
      (revokedFirst.body as GraphqlErrorResponse).errors[0]?.extensions.code,
    ).toBe('UNAUTHENTICATED');

    const current = sessionItems.find((session) => session.current);
    expect(current).toBeDefined();
    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({
        query: `mutation Revoke($sessionId: ID!) {
          revokeViewerSession(sessionId: $sessionId) { success }
        }`,
        variables: { sessionId: current?.id },
      })
      .expect(200)
      .expect({ data: { revokeViewerSession: { success: true } } });

    const revokedCurrent = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ query: '{ viewer { id } }' })
      .expect(200);
    expect(
      (revokedCurrent.body as GraphqlErrorResponse).errors[0]?.extensions.code,
    ).toBe('UNAUTHENTICATED');
  });

  it('reads defaults and updates owner notification preferences', async () => {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const username = `notifications-${suffix}`;
    const registration = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation {
          register(input: {
            email: "${username}@dss.test"
            username: "${username}"
            displayName: "Notification Astronaut"
            password: "dss-notification-password"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      })
      .expect(200);
    const registered = registration.body as RegisterResponse;
    const userId = registered.data.register.user.id;
    const token = registered.data.register.tokens.accessToken;
    const select =
      'inAppCategories emailEnabled emailCategories digestFrequency';

    const defaults = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `{ viewerNotificationPreferences { ${select} } }`,
      })
      .expect(200);
    expect(defaults.body).toEqual({
      data: {
        viewerNotificationPreferences: {
          inAppCategories: [
            'MENTIONS',
            'DIRECT_MESSAGES',
            'REPUTATION',
            'COMMENTS_REPLIES',
            'SUBSCRIPTIONS',
            'PUBLISHING_REVIEW',
            'SUPPORT',
          ],
          emailEnabled: true,
          emailCategories: [
            'MENTIONS',
            'DIRECT_MESSAGES',
            'PUBLISHING_REVIEW',
            'SUPPORT',
          ],
          digestFrequency: 'OFF',
        },
      },
    });

    const updated = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `mutation Update($input: UpdateNotificationPreferencesInput!) {
          updateViewerNotificationPreferences(input: $input) { ${select} }
        }`,
        variables: {
          input: {
            inAppCategories: ['SUPPORT', 'MENTIONS'],
            emailEnabled: false,
            emailCategories: ['SUPPORT'],
            digestFrequency: 'WEEKLY',
          },
        },
      })
      .expect(200);
    expect(updated.body).toEqual({
      data: {
        updateViewerNotificationPreferences: {
          inAppCategories: ['MENTIONS', 'SUPPORT'],
          emailEnabled: false,
          emailCategories: ['SUPPORT'],
          digestFrequency: 'WEEKLY',
        },
      },
    });
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: userId,
          action: 'notification.preferences.updated',
        },
      }),
    ).resolves.toBe(1);
  });

  it('exposes aggregate member, guest and crawler presence safely', async () => {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const username = `presence-${suffix}`;
    const registration = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('User-Agent', 'Mozilla/5.0 DSS Guest')
      .send({
        query: `mutation {
          register(input: {
            email: "${username}@dss.test"
            username: "${username}"
            displayName: "Presence Astronaut"
            password: "dss-presence-password"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      })
      .expect(200);
    const registered = registration.body as RegisterResponse;
    const token = registered.data.register.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('User-Agent', 'Googlebot/2.1')
      .send({ query: '{ apiInfo { status } }' })
      .expect(200);

    const summary = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `{
          presenceSummary {
            onlineMembers onlineGuests onlineCrawlers totalOnline sampledAt
          }
        }`,
      })
      .expect(200);
    const metrics = (
      summary.body as {
        data: {
          presenceSummary: {
            onlineMembers: number;
            onlineGuests: number;
            onlineCrawlers: number;
            totalOnline: number;
          };
        };
      }
    ).data.presenceSummary;

    expect(metrics.onlineGuests).toBeGreaterThanOrEqual(1);
    expect(metrics.onlineCrawlers).toBeGreaterThanOrEqual(1);
    expect(metrics.totalOnline).toBe(
      metrics.onlineMembers + metrics.onlineGuests + metrics.onlineCrawlers,
    );
  });

  afterAll(async () => {
    await app.close();
    await processingPool.end();
    await rm(join(process.cwd(), E2E_UPLOADS_DIR), {
      recursive: true,
      force: true,
    });
    delete process.env.DSS_UPLOADS_DIR;
  });
});
