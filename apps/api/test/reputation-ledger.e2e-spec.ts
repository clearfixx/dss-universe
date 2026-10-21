/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation E2E
 * 📄 File: apps/api/test/reputation-ledger.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies GraphQL reputation decisions, cooldown, reversal and immutability
 * against PostgreSQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';

type RegisteredUser = {
  id: string;
  email: string;
  accessToken: string;
};

type ReputationMutationBody = {
  data?: { giveReputation: { id: string; value: number } } | null;
  errors?: Array<{ extensions?: { code?: string } }>;
};

describe('Reputation Ledger (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
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
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({
      where: { producer: 'dss.api.reputation' },
    });
    await app.close();
  });

  it('keeps direct decisions explainable, rate-limited and reversible', async () => {
    const actor = await register('reputation-actor');
    const recipient = await register('reputation-recipient');
    await prisma.reputationPolicy.upsert({
      where: { id: 'default' },
      update: { minimumAccountAgeDays: 0 },
      create: { id: 'default', minimumAccountAgeDays: 0 },
    });

    const first = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${actor.accessToken}`)
      .send({
        query: `mutation Give($input: GiveReputationInput!) {
          giveReputation(input: $input) {
            id value reason recipientId
            actor { id username }
            reversal { id }
          }
        }`,
        variables: {
          input: {
            recipientId: recipient.id,
            value: 1,
            reason: 'Shared a clear and useful explanation.',
          },
        },
      })
      .expect(200);
    expect(first.body).toMatchObject({
      data: {
        giveReputation: {
          value: 1,
          reason: 'Shared a clear and useful explanation.',
          recipientId: recipient.id,
          actor: { id: actor.id },
          reversal: null,
        },
      },
    });
    const entryId = (first.body as { data: { giveReputation: { id: string } } })
      .data.giveReputation.id;

    const second = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${actor.accessToken}`)
      .send({
        query: `mutation Give($input: GiveReputationInput!) {
          giveReputation(input: $input) { id }
        }`,
        variables: {
          input: {
            recipientId: recipient.id,
            value: -1,
            reason: 'Second decision inside the cooldown.',
          },
        },
      })
      .expect(200);
    expect(second.body).toMatchObject({
      data: null,
      errors: [{ extensions: { code: 'CONFLICT' } }],
    });

    const concurrentRecipient = await register('reputation-concurrent');
    const concurrentRequests = [1, -1].map((value) =>
      request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${actor.accessToken}`)
        .send({
          query: `mutation Give($input: GiveReputationInput!) {
            giveReputation(input: $input) { id value }
          }`,
          variables: {
            input: {
              recipientId: concurrentRecipient.id,
              value,
              reason: `Concurrent reputation decision ${value}.`,
            },
          },
        }),
    );
    const concurrentResponses = (await Promise.all(concurrentRequests)).map(
      (response) => response.body as ReputationMutationBody,
    );
    expect(concurrentResponses.filter((response) => response.data).length).toBe(
      1,
    );
    expect(
      concurrentResponses.filter(
        (response) => response.errors?.[0]?.extensions?.code === 'CONFLICT',
      ).length,
    ).toBe(1);

    const historyBefore = await history(recipient.id, recipient.accessToken);
    expect(historyBefore).toMatchObject({
      score: 1,
      total: 1,
      items: [
        {
          id: entryId,
          value: 1,
          actor: { id: actor.id },
          reversal: null,
        },
      ],
    });

    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: 'reputation.reverse' },
    });
    await prisma.userPermission.create({
      data: { userId: actor.id, permissionId: permission.id },
    });
    const moderatorToken = await login(actor.email);

    const reversed = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({
        query: `mutation Reverse($input: ReverseReputationInput!) {
          reverseReputation(input: $input) { id value reason recipientId }
        }`,
        variables: {
          input: {
            entryId,
            reason: 'Reversed after moderator review.',
          },
        },
      })
      .expect(200);
    expect(reversed.body).toMatchObject({
      data: {
        reverseReputation: {
          value: -1,
          reason: 'Reversed after moderator review.',
          recipientId: recipient.id,
        },
      },
    });

    const historyAfter = await history(recipient.id, recipient.accessToken);
    expect(historyAfter).toMatchObject({
      score: 0,
      total: 1,
      items: [
        {
          id: entryId,
          reversal: {
            actor: { id: actor.id },
            reason: 'Reversed after moderator review.',
          },
        },
      ],
    });

    await expect(
      prisma.reputationEntry.update({
        where: { id: entryId },
        data: { reason: 'Rewritten history' },
      }),
    ).rejects.toThrow('reputation ledger entries are immutable');
  });

  async function register(prefix: string): Promise<RegisteredUser> {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const username = `${prefix}-${suffix}`;
    const email = `${username}@dss.test`;
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user { id email }
            tokens { accessToken }
          }
        }`,
        variables: {
          input: {
            email,
            username,
            displayName: prefix,
            password: 'dss-test-password',
          },
        },
      })
      .expect(200);
    const result = response.body as {
      data: {
        register: {
          user: { id: string; email: string };
          tokens: { accessToken: string };
        };
      };
    };
    return {
      id: result.data.register.user.id,
      email: result.data.register.user.email,
      accessToken: result.data.register.tokens.accessToken,
    };
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
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
    return (
      response.body as {
        data: { login: { tokens: { accessToken: string } } };
      }
    ).data.login.tokens.accessToken;
  }

  async function history(userId: string, accessToken: string) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `query History($userId: ID!) {
          reputationHistory(userId: $userId) {
            score total
            items {
              id value reason
              actor { id username }
              reversal { id reason actor { id username } }
            }
          }
        }`,
        variables: { userId },
      })
      .expect(200);
    return (
      response.body as {
        data: { reputationHistory: Record<string, unknown> };
      }
    ).data.reputationHistory;
  }
});

/**
 * PostgreSQL gets the last word on immutable history. It is very stubborn.
 */
