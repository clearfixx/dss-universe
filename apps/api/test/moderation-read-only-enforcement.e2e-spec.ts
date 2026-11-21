/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/test/moderation-read-only-enforcement.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves centralized read-only enforcement through the assembled application.
 *
 * ⚠️ Important:
 * Runs against the disposable migrated dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { Permission } from './../src/core/authorization';
import { AuthenticationPresentationService } from './../src/composition/identity/application/authentication-presentation.service';
import { EDITOR_CODE_HIGHLIGHTER } from './../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { ModerationSanctionsService } from './../src/modules/moderation/infrastructure/prisma-moderation-sanctions';

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

describe('Read-only enforcement (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: (code: string) => Promise.resolve(code) })
      .compile();
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
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  async function member(label: string) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return app.get(AuthenticationPresentationService).register({
      email: `read-only-${label}-${suffix}@dss.test`,
      username: `ro-${label}-${suffix}`,
      displayName: 'Read Only Explorer',
      password: 'Read-only-password-123!',
    });
  }

  function graphql<T>(token: string, query: string, variables = {}) {
    return request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + token)
      .send({ query, variables })
      .expect(200)
      .then((response) => response.body as GraphqlResponse<T>);
  }

  const updateProfile = `mutation UpdateViewerProfile($input: UpdateViewerProfileInput!) {
    updateViewerProfile(input: $input) { id displayName }
  }`;

  it('blocks content writes, keeps reads and safety operations, and lifts on revocation', async () => {
    const subject = await member('subject');
    const moderator = await member('moderator');
    const token = subject.tokens.accessToken;
    const sanctions = app.get(ModerationSanctionsService);

    const expiresAt = new Date(Date.now() + 2 * 86_400_000);
    const { sanctionId } = await sanctions.issueReadOnly(
      {
        id: moderator.user.id,
        permissions: [Permission.ModerationReadOnlyIssue],
      },
      {
        subjectId: subject.user.id,
        reason: 'Flooding the forum',
        context: null,
        expiresAt,
      },
    );

    const blocked = await graphql<{ updateViewerProfile: unknown }>(
      token,
      updateProfile,
      { input: { displayName: 'Blocked rename' } },
    );
    expect(blocked.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    expect(blocked.errors?.[0].message).toContain('read-only');

    const status = await graphql<{
      viewerSanctionStatus: { readOnlyUntil: string; activeWarnings: number };
    }>(token, '{ viewerSanctionStatus { readOnlyUntil activeWarnings } }');
    expect(status.errors).toBeUndefined();
    expect(new Date(status.data!.viewerSanctionStatus.readOnlyUntil)).toEqual(
      expiresAt,
    );

    const journal = await graphql<{
      viewerSanctionJournal: {
        total: number;
        items: Array<Record<string, unknown>>;
      };
    }>(
      token,
      '{ viewerSanctionJournal { total items { kind origin reason active } } }',
    );
    expect(journal.data?.viewerSanctionJournal).toEqual({
      total: 1,
      items: [
        {
          kind: 'READ_ONLY',
          origin: 'MANUAL',
          reason: 'Flooding the forum',
          active: true,
        },
      ],
    });

    const staffJournal = await graphql(
      token,
      `{ moderationSanctionJournal(subjectId: "${subject.user.id}") { total } }`,
    );
    expect(staffJournal.errors?.[0].extensions?.code).toBe('FORBIDDEN');

    const permitted = await graphql<{
      revokeOtherViewerSessions: { success: boolean };
    }>(token, 'mutation { revokeOtherViewerSessions { success } }');
    expect(permitted.errors).toBeUndefined();
    expect(permitted.data?.revokeOtherViewerSessions.success).toBe(true);

    await sanctions.revoke(
      {
        id: moderator.user.id,
        permissions: [Permission.ModerationSanctionsRevoke],
      },
      { sanctionId, reason: 'Lifted after review' },
    );
    const allowed = await graphql<{
      updateViewerProfile: { displayName: string };
    }>(token, updateProfile, { input: { displayName: 'Restored rename' } });
    expect(allowed.errors).toBeUndefined();
    expect(allowed.data?.updateViewerProfile.displayName).toBe(
      'Restored rename',
    );
  });
});
